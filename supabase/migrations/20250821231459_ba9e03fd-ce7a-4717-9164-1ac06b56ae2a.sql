-- Configure 30% commission for all subscription plans
UPDATE public.referral_settings 
SET commission_percentage = 30.00, is_active = true;

-- Insert default referral settings for all existing plans if not present
INSERT INTO public.referral_settings (subscription_plan_id, commission_percentage, is_active)
SELECT sp.id, 30.00, true
FROM public.subscription_plans sp
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_settings rs 
  WHERE rs.subscription_plan_id = sp.id
);

-- Add referral_code to profiles for users to share
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Generate referral codes for existing users
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(MD5(user_id::text), 1, 8))
WHERE referral_code IS NULL;

-- Create function to generate referral code for new users
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.user_id::text), 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate referral codes
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Update handle_new_user function to handle referral by referral_code instead of user_id
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

    IF referrer_id IS NOT NULL THEN
      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (referrer_id, 50, 'referral', 'Pontos por indicar um amigo');

      UPDATE public.profiles
      SET total_points = total_points + 50
      WHERE user_id = referrer_id;

      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (NEW.id, 25, 'signup', 'Pontos de boas-vindas por indicação');

      UPDATE public.profiles
      SET total_points = total_points + 25
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
    VALUES (NEW.id, 10, 'signup', 'Pontos de boas-vindas');

    UPDATE public.profiles
    SET total_points = total_points + 10
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;