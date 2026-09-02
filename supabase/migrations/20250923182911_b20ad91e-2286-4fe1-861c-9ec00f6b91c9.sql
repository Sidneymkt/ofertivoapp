-- Update referral settings to ensure 30% commission for business plans
UPDATE referral_settings 
SET commission_percentage = 30.00
WHERE is_active = true;

-- Ensure the referral link processing works correctly by updating the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  referrer_id uuid;
  new_user_type text;
  referrer_profile profiles%ROWTYPE;
BEGIN
  -- Evitar duplicação
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Tipo de usuário
  new_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'consumer');

  -- Processar código de indicação
  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    -- Find referrer by matching referral_code (first 8 chars of user_id)
    SELECT * INTO referrer_profile
    FROM public.profiles
    WHERE UPPER(SUBSTRING(user_id::text, 1, 8)) = UPPER(NEW.raw_user_meta_data ->> 'referral_code')
    LIMIT 1;

    -- If not found by substring, try direct referral_code match
    IF referrer_profile.user_id IS NULL THEN
      SELECT * INTO referrer_profile
      FROM public.profiles
      WHERE referral_code = NEW.raw_user_meta_data ->> 'referral_code'
      LIMIT 1;
    END IF;

    referrer_id := referrer_profile.user_id;

    INSERT INTO public.profiles (
      id, user_id, full_name, phone, city, state, user_type, referred_by
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type,
      referrer_id
    );

    -- Give points for referrals
    IF referrer_id IS NOT NULL THEN
      -- Points for referrer (100 points for any referral)
      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (referrer_id, 100, 'referral', 
        CASE 
          WHEN new_user_type = 'business' THEN 'Pontos por indicar um negócio' 
          ELSE 'Pontos por indicar um usuário'
        END);

      UPDATE public.profiles
      SET total_points = total_points + 100
      WHERE user_id = referrer_id;

      -- Welcome points for new user
      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (NEW.id, 50, 'signup', 'Pontos de boas-vindas por indicação');

      UPDATE public.profiles
      SET total_points = total_points + 50
      WHERE user_id = NEW.id;
    END IF;
  ELSE
    INSERT INTO public.profiles (
      id, user_id, full_name, phone, city, state, user_type
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type
    );

    -- Standard welcome points
    INSERT INTO public.user_points (user_id, points_earned, action_type, description)
    VALUES (NEW.id, 25, 'signup', 'Pontos de boas-vindas');

    UPDATE public.profiles
    SET total_points = total_points + 25
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;