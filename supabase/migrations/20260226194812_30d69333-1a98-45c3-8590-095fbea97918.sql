
-- Update validate_referral_code to return 150 bonus points
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  IF p_code IS NULL OR LENGTH(TRIM(p_code)) < 4 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Código de indicação inválido');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE referral_code = UPPER(TRIM(p_code)) LIMIT 1;

  IF v_profile.user_id IS NULL THEN
    SELECT * INTO v_profile FROM public.profiles WHERE UPPER(SUBSTRING(user_id::text, 1, 8)) = UPPER(TRIM(p_code)) LIMIT 1;
  END IF;

  IF v_profile.user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Código de indicação não encontrado');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Código válido',
    'referrer_name', v_profile.full_name,
    'referrer_type', v_profile.user_type,
    'bonus_points', 150
  );
END;
$$;

-- Update log_referral_completion to log 150 points
CREATE OR REPLACE FUNCTION public.log_referral_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    INSERT INTO public.referral_tracking (
      referrer_id, referred_user_id, referral_code_used,
      referrer_points_awarded, referred_points_awarded,
      referred_user_type, status
    ) VALUES (
      NEW.referred_by, NEW.user_id,
      (SELECT referral_code FROM profiles WHERE user_id = NEW.referred_by),
      100, 150, NEW.user_type, 'completed'
    );
  END IF;
  RETURN NEW;
END;
$$;
