-- Update businesses table to track referrer correctly
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(user_id);

-- Update handle_new_user function to properly handle business referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public' 
AS $$
DECLARE
  referrer_id uuid;
  new_user_type text;
BEGIN
  -- Evitar duplicação
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Tipo de usuário
  new_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'consumer');

  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    -- Find referrer by referral_code instead of user_id
    SELECT user_id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data ->> 'referral_code';

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

    -- Give points regardless of user type
    IF referrer_id IS NOT NULL THEN
      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (referrer_id, 100, 'referral', 
        CASE 
          WHEN new_user_type = 'business' THEN 'Pontos por indicar um negócio' 
          ELSE 'Pontos por indicar um amigo'
        END);

      UPDATE public.profiles
      SET total_points = total_points + 100
      WHERE user_id = referrer_id;

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

    INSERT INTO public.user_points (user_id, points_earned, action_type, description)
    VALUES (NEW.id, 25, 'signup', 'Pontos de boas-vindas');

    UPDATE public.profiles
    SET total_points = total_points + 25
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;