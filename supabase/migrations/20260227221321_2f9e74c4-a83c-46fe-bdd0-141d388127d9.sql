CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  RAISE LOG 'Processing new user: %, type: %, referral_code: %', 
    NEW.id, 
    NEW.raw_user_meta_data ->> 'user_type',
    NEW.raw_user_meta_data ->> 'referral_code';

  new_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'consumer');

  referrer_id := NULL;
  
  IF NEW.raw_user_meta_data ? 'referred_by' AND 
     (NEW.raw_user_meta_data ->> 'referred_by') IS NOT NULL THEN
    referrer_id := (NEW.raw_user_meta_data ->> 'referred_by')::uuid;
    RAISE LOG 'Referrer ID found in metadata: %', referrer_id;
  ELSIF NEW.raw_user_meta_data ? 'referral_code' AND 
        LENGTH(TRIM(NEW.raw_user_meta_data ->> 'referral_code')) > 0 THEN
    
    SELECT * INTO referrer_profile
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(NEW.raw_user_meta_data ->> 'referral_code'))
    LIMIT 1;

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

  -- Definir pontos: 150 para indicados, 100 para cadastro direto
  IF referrer_id IS NOT NULL THEN
    v_points_referrer := 100;
    v_points_new_user := 150;
  ELSE
    v_points_new_user := 100;
  END IF;

  -- CRIAR PERFIL
  BEGIN
    INSERT INTO public.profiles (
      id, user_id, full_name, phone, city, state, user_type, referred_by, total_points
    )
    VALUES (
      NEW.id, NEW.id,
      TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')),
      TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')),
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type, referrer_id, v_points_new_user
    );
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'ERROR creating profile for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
  END;

  -- REGISTRAR PONTOS
  BEGIN
    INSERT INTO public.user_points (user_id, points_earned, action_type, description)
    VALUES (NEW.id, v_points_new_user, 'signup', 
      CASE 
        WHEN referrer_id IS NOT NULL THEN 'Pontos de boas-vindas por indicação (150 pts)'
        ELSE 'Pontos de boas-vindas (100 pts)'
      END
    );

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