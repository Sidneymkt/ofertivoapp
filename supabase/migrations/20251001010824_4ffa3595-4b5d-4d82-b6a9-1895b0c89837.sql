-- ============================================================
-- FIX: Sistema de Referrals - Correção completa
-- ============================================================

-- 1. Corrigir função handle_new_user com transações atômicas
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
  IF NEW.raw_user_meta_data ? 'referral_code' AND 
     LENGTH(TRIM(NEW.raw_user_meta_data ->> 'referral_code')) > 0 THEN
    
    -- Tentar encontrar referrer por referral_code (método preferido)
    SELECT * INTO referrer_profile
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(NEW.raw_user_meta_data ->> 'referral_code'))
    LIMIT 1;

    -- Se não encontrar, tentar por substring do user_id (fallback)
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

  -- CRIAR PERFIL (única operação crítica)
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
    -- Não retornar NULL, apenas logar o erro e continuar
    RETURN NEW;
  END;

  -- REGISTRAR PONTOS (não-crítico, pode falhar sem afetar o registro)
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
    -- Não falhar o registro se os pontos não forem creditados
  END;

  RETURN NEW;
END;
$$;

-- 2. Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Criar tabela para tracking de referrals detalhado
CREATE TABLE IF NOT EXISTS public.referral_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  referred_user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code_used text,
  referrer_points_awarded integer DEFAULT 0,
  referred_points_awarded integer DEFAULT 0,
  referred_user_type text,
  status text DEFAULT 'completed',
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer ON public.referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred ON public.referral_tracking(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_created ON public.referral_tracking(created_at DESC);

-- RLS para referral_tracking
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their referral tracking" ON public.referral_tracking;
CREATE POLICY "Users can view their referral tracking"
  ON public.referral_tracking FOR SELECT
  USING (
    auth.uid() = referrer_id OR 
    auth.uid() = referred_user_id
  );

DROP POLICY IF EXISTS "System can insert referral tracking" ON public.referral_tracking;
CREATE POLICY "System can insert referral tracking"
  ON public.referral_tracking FOR INSERT
  WITH CHECK (true);

-- 4. Criar tabela para configuração de domínio personalizado
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração inicial de domínio
INSERT INTO public.platform_settings (setting_key, setting_value, is_active)
VALUES (
  'custom_domain',
  jsonb_build_object(
    'domain', null,
    'ssl_enabled', false,
    'ssl_cert_issued_at', null,
    'dns_verified', false,
    'dns_verified_at', null,
    'fallback_domain', 'lovable.app',
    'status', 'not_configured'
  ),
  true
)
ON CONFLICT (setting_key) DO NOTHING;

-- RLS para platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admin can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Public can read active settings" ON public.platform_settings;
CREATE POLICY "Public can read active settings"
  ON public.platform_settings FOR SELECT
  USING (is_active = true);

-- 5. Trigger para logar referrals automaticamente
CREATE OR REPLACE FUNCTION public.log_referral_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas registrar se foi uma indicação
  IF NEW.referred_by IS NOT NULL THEN
    INSERT INTO public.referral_tracking (
      referrer_id,
      referred_user_id,
      referral_code_used,
      referrer_points_awarded,
      referred_points_awarded,
      referred_user_type,
      status
    ) VALUES (
      NEW.referred_by,
      NEW.user_id,
      (SELECT referral_code FROM profiles WHERE user_id = NEW.referred_by),
      100,
      50,
      NEW.user_type,
      'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_referral_log ON public.profiles;
CREATE TRIGGER on_profile_referral_log
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referred_by IS NOT NULL)
  EXECUTE FUNCTION public.log_referral_completion();

-- 6. Função para validar código de referral
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  -- Validar formato
  IF p_code IS NULL OR LENGTH(TRIM(p_code)) < 4 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Código de indicação inválido'
    );
  END IF;

  -- Buscar perfil
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE referral_code = UPPER(TRIM(p_code))
  LIMIT 1;

  -- Se não encontrar por código, tentar por substring
  IF v_profile.user_id IS NULL THEN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE UPPER(SUBSTRING(user_id::text, 1, 8)) = UPPER(TRIM(p_code))
    LIMIT 1;
  END IF;

  IF v_profile.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Código de indicação não encontrado'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Código válido',
    'referrer_name', v_profile.full_name,
    'referrer_type', v_profile.user_type,
    'bonus_points', 50
  );
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.handle_new_user() IS 'Processa novo usuário com suporte completo a referrals e tratamento de erros';
COMMENT ON TABLE public.referral_tracking IS 'Tracking detalhado de todas as indicações processadas';
COMMENT ON TABLE public.platform_settings IS 'Configurações da plataforma incluindo domínio personalizado';
COMMENT ON FUNCTION public.validate_referral_code(text) IS 'Valida código de referral antes do registro';