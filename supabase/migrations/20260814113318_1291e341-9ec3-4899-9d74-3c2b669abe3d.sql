CREATE OR REPLACE FUNCTION public.validate_manual_checkin_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code record;
  v_offer record;
  v_business record;
  v_points integer;
  v_checkin_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado');
  END IF;

  SELECT * INTO v_code
  FROM manual_checkin_codes
  WHERE upper(code) = upper(p_code)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código inválido');
  END IF;

  IF COALESCE(v_code.is_used, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código já utilizado');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código expirado');
  END IF;

  SELECT * INTO v_offer FROM offers WHERE id = v_code.offer_id;
  IF v_offer IS NULL OR v_offer.is_active = false OR v_offer.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta inativa ou expirada');
  END IF;

  SELECT * INTO v_business FROM businesses WHERE id = v_offer.business_id;

  IF EXISTS (
    SELECT 1 FROM offer_checkins
    WHERE offer_id = v_offer.id AND user_id = p_user_id AND DATE(validated_at) = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Você já fez check-in nesta oferta hoje');
  END IF;

  v_points := COALESCE(v_offer.checkin_points, 50);
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND user_type = 'business') THEN
    v_points := 0;
  END IF;

  INSERT INTO offer_checkins (offer_id, business_id, user_id, points_awarded)
  VALUES (v_offer.id, v_offer.business_id, p_user_id, v_points)
  RETURNING id INTO v_checkin_id;

  UPDATE manual_checkin_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE id = v_code.id;

  IF v_points > 0 THEN
    INSERT INTO user_points (user_id, points_earned, action_type, offer_id, business_id, description)
    VALUES (p_user_id, v_points, 'checkin', v_offer.id, v_offer.business_id, 'Check-in por código - ' || v_offer.title);

    UPDATE profiles
    SET total_points = COALESCE(total_points, 0) + v_points, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  UPDATE offers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      current_actions = COALESCE(current_actions, 0) + 1
  WHERE id = v_offer.id;

  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, 'checkin', 'Check-in realizado!',
          'Você ganhou ' || v_points || ' pontos em ' || COALESCE(v_business.name, 'estabelecimento'), v_checkin_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso!',
    'points_awarded', v_points,
    'checkin_id', v_checkin_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_manual_checkin_code(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_manual_checkin_code(text, uuid) TO authenticated, service_role;