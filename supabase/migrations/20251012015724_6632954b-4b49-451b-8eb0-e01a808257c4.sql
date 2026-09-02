-- ============================================================
-- FIX: Sistema de Indicações - Atualização instantânea
-- ============================================================

-- 1. Criar/atualizar trigger para atualizar referral_stats automaticamente
CREATE OR REPLACE FUNCTION public.update_referral_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar estatísticas do referrer
  IF NEW.referrer_id IS NOT NULL THEN
    INSERT INTO public.referral_stats (
      user_id,
      total_referrals,
      active_referrals,
      total_commissions_earned,
      total_commissions_pending,
      last_commission_date
    ) VALUES (
      NEW.referrer_id,
      1,
      1,
      0,
      0,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_referrals = public.referral_stats.total_referrals + 1,
      active_referrals = public.referral_stats.active_referrals + 1,
      last_commission_date = now(),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Criar trigger para executar após inserção no referral_tracking
DROP TRIGGER IF EXISTS on_referral_tracking_insert ON public.referral_tracking;
CREATE TRIGGER on_referral_tracking_insert
  AFTER INSERT ON public.referral_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_stats();

-- 3. Criar trigger para atualizar businesses.referred_by quando houver indicação
CREATE OR REPLACE FUNCTION public.update_business_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o novo perfil é do tipo business e tem referred_by, atualizar tabela businesses
  IF NEW.user_type = 'business' AND NEW.referred_by IS NOT NULL THEN
    UPDATE public.businesses
    SET referred_by = NEW.referred_by
    WHERE owner_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update_business_referral ON public.profiles;
CREATE TRIGGER on_profile_update_business_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.user_type = 'business' AND NEW.referred_by IS NOT NULL)
  EXECUTE FUNCTION public.update_business_referral();

-- 4. Habilitar realtime para referral_tracking (referral_stats já está ativo)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'referral_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_tracking;
  END IF;
END $$;

-- 5. Garantir que referral_tracking tem REPLICA IDENTITY FULL para realtime
ALTER TABLE public.referral_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.referral_stats REPLICA IDENTITY FULL;

-- 6. Corrigir função handle_new_user para garantir execução do log de referral
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  new_user_type text;
  referrer_profile profiles%ROWTYPE;
  v_points_referrer integer;
  v_points_new_user integer;
BEGIN
  -- Evitar duplicação
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE LOG 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Log inicio do processamento
  RAISE LOG 'Processing new user: %, type: %, referral_code: %', 
    NEW.id, 
    NEW.raw_user_meta_data ->> 'user_type',
    NEW.raw_user_meta_data ->> 'referral_code';

  -- Tipo de usuário
  new_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'consumer');

  -- Processar código de indicação
  referrer_id := NULL;
  
  -- Primeiro verificar se veio referred_by diretamente nos metadata
  IF NEW.raw_user_meta_data ? 'referred_by' AND 
     (NEW.raw_user_meta_data ->> 'referred_by') IS NOT NULL THEN
    referrer_id := (NEW.raw_user_meta_data ->> 'referred_by')::uuid;
    RAISE LOG 'Referrer ID found in metadata: %', referrer_id;
  ELSIF NEW.raw_user_meta_data ? 'referral_code' AND 
        LENGTH(TRIM(NEW.raw_user_meta_data ->> 'referral_code')) > 0 THEN
    
    -- Tentar encontrar referrer por referral_code
    SELECT * INTO referrer_profile
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(NEW.raw_user_meta_data ->> 'referral_code'))
    LIMIT 1;

    -- Se não encontrar, tentar por substring do user_id
    IF referrer_profile.user_id IS NULL THEN
      SELECT * INTO referrer_profile
      FROM public.profiles
      WHERE UPPER(SUBSTRING(user_id::text, 1, 8)) = UPPER(TRIM(NEW.raw_user_meta_data ->> 'referral_code'))
      LIMIT 1;
    END IF;

    referrer_id := referrer_profile.user_id;
    
    IF referrer_id IS NOT NULL THEN
      RAISE LOG 'Referrer found: % for new user: %', referrer_id, NEW.id;
    ELSE
      RAISE LOG 'Referrer NOT found for code: %', NEW.raw_user_meta_data ->> 'referral_code';
    END IF;
  END IF;

  -- Definir pontos baseado em referral
  IF referrer_id IS NOT NULL THEN
    v_points_referrer := 100;
    v_points_new_user := 50;
  ELSE
    v_points_new_user := 25;
  END IF;

  -- CRIAR PERFIL
  BEGIN
    INSERT INTO public.profiles (
      id, 
      user_id, 
      full_name, 
      phone, 
      city, 
      state, 
      user_type, 
      referred_by,
      total_points
    )
    VALUES (
      NEW.id,
      NEW.id,
      TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')),
      TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')),
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type,
      referrer_id,
      v_points_new_user
    );

    RAISE LOG 'Profile created successfully for user: %', NEW.id;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'ERROR creating profile for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
  END;

  -- REGISTRAR PONTOS
  BEGIN
    -- Pontos para o novo usuário
    INSERT INTO public.user_points (user_id, points_earned, action_type, description)
    VALUES (NEW.id, v_points_new_user, 'signup', 
      CASE 
        WHEN referrer_id IS NOT NULL THEN 'Pontos de boas-vindas por indicação'
        ELSE 'Pontos de boas-vindas'
      END
    );

    -- Se há referrer, dar pontos para ele
    IF referrer_id IS NOT NULL THEN
      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (referrer_id, v_points_referrer, 'referral', 
        CASE 
          WHEN new_user_type = 'business' THEN 'Pontos por indicar um negócio' 
          ELSE 'Pontos por indicar um usuário'
        END
      );

      UPDATE public.profiles
      SET total_points = total_points + v_points_referrer
      WHERE user_id = referrer_id;

      RAISE LOG 'Referral points awarded: % points to referrer: %', v_points_referrer, referrer_id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'ERROR awarding points for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_referral_stats() IS 'Atualiza estatísticas de referral automaticamente';
COMMENT ON FUNCTION public.update_business_referral() IS 'Atualiza campo referred_by na tabela businesses';