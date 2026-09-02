-- 1) Autorização dentro das funções de check-in + grants

CREATE OR REPLACE FUNCTION public.can_validate_offer_checkin(p_offer_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    auth.uid() IS NULL -- service_role / triggers internos
    OR auth.uid() = p_user_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.businesses b ON b.id = o.business_id
      WHERE o.id = p_offer_id AND b.owner_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.can_validate_offer_checkin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_validate_offer_checkin(uuid, uuid) TO authenticated, service_role;

-- Wrapper de autorização: process_qr_validation (assinatura do anunciante/consumidor)
CREATE OR REPLACE FUNCTION public.process_qr_validation(
  p_business_id uuid, p_offer_id uuid, p_user_id uuid, p_qr_code text,
  p_location_lat numeric DEFAULT NULL, p_location_lng numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offer record;
  v_business record;
  v_points_to_award integer;
  v_checkin_id uuid;
BEGIN
  IF NOT public.can_validate_offer_checkin(p_offer_id, p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado a validar este check-in');
  END IF;

  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id AND business_id = p_business_id AND is_active = true;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada ou inativa');
  END IF;

  IF v_offer.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta oferta já expirou');
  END IF;

  IF v_offer.max_actions IS NOT NULL AND COALESCE(v_offer.current_actions, 0) >= v_offer.max_actions THEN
    RETURN jsonb_build_object('success', false, 'message', 'Limite de check-ins desta oferta atingido');
  END IF;

  SELECT * INTO v_business FROM businesses WHERE id = p_business_id AND is_active = true;
  IF v_business IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Estabelecimento não encontrado ou inativo');
  END IF;

  IF EXISTS (
    SELECT 1 FROM offer_checkins
    WHERE offer_id = p_offer_id AND user_id = p_user_id AND DATE(validated_at) = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Check-in já realizado hoje para esta oferta');
  END IF;

  v_points_to_award := COALESCE(v_offer.checkin_points, 50);

  -- Modo delivery: sem penalidade por distância
  IF NOT COALESCE(v_offer.is_delivery, false)
     AND p_location_lat IS NOT NULL AND p_location_lng IS NOT NULL
     AND v_business.latitude IS NOT NULL AND v_business.longitude IS NOT NULL THEN
    IF (6371000 * acos(LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_location_lat)) * cos(radians(v_business.latitude)) *
          cos(radians(v_business.longitude) - radians(p_location_lng)) +
          sin(radians(p_location_lat)) * sin(radians(v_business.latitude))
        )))) > 200 THEN
      v_points_to_award := GREATEST(v_points_to_award / 2, 10);
    END IF;
  END IF;

  -- Anunciantes não pontuam na gamificação de consumidores
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND user_type = 'business') THEN
    v_points_to_award := 0;
  END IF;

  INSERT INTO offer_checkins (offer_id, business_id, user_id, points_awarded, location_latitude, location_longitude)
  VALUES (p_offer_id, p_business_id, p_user_id, v_points_to_award, p_location_lat, p_location_lng)
  RETURNING id INTO v_checkin_id;

  IF v_points_to_award > 0 THEN
    INSERT INTO user_points (user_id, points_earned, action_type, offer_id, business_id, description)
    VALUES (p_user_id, v_points_to_award, 'checkin', p_offer_id, p_business_id, 'Check-in - ' || v_offer.title);

    UPDATE profiles
    SET total_points = COALESCE(total_points, 0) + v_points_to_award, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  UPDATE offers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      current_actions = COALESCE(current_actions, 0) + 1
  WHERE id = p_offer_id;

  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, 'checkin', 'Check-in realizado!',
          'Você ganhou ' || v_points_to_award || ' pontos no ' || v_business.name, v_checkin_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso!',
    'points_awarded', v_points_to_award,
    'points', v_points_to_award,
    'checkin_id', v_checkin_id
  );
END;
$function$;

-- Assinatura antiga (QR completo) delega para a nova, com autorização
CREATE OR REPLACE FUNCTION public.process_qr_validation(
  qr_data_param jsonb, user_id_param uuid,
  location_lat numeric DEFAULT NULL, location_lng numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offer_id uuid;
  v_business_id uuid;
BEGIN
  IF NOT (qr_data_param ? 'offerId') THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR Code inválido - dados incompletos');
  END IF;

  v_offer_id := (qr_data_param->>'offerId')::uuid;
  SELECT business_id INTO v_business_id FROM offers WHERE id = v_offer_id;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada');
  END IF;

  RETURN public.process_qr_validation(
    v_business_id, v_offer_id, user_id_param, qr_data_param::text, location_lat, location_lng
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_checkin(
  p_business_id uuid, p_offer_id uuid, p_user_id uuid, p_qr_code text,
  p_location_lat numeric DEFAULT NULL, p_location_lng numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.process_qr_validation(p_business_id, p_offer_id, p_user_id, p_qr_code, p_location_lat, p_location_lng);
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_checkin(
  p_qr_data jsonb, p_user_id uuid, p_lat numeric DEFAULT NULL, p_lng numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.process_qr_validation(p_qr_data, p_user_id, p_lat, p_lng);
END;
$function$;

REVOKE ALL ON FUNCTION public.process_qr_validation(uuid, uuid, uuid, text, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_qr_validation(jsonb, uuid, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_checkin(uuid, uuid, uuid, text, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_checkin(jsonb, uuid, numeric, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.process_qr_validation(uuid, uuid, uuid, text, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_qr_validation(jsonb, uuid, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_checkin(uuid, uuid, uuid, text, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_checkin(jsonb, uuid, numeric, numeric) TO authenticated, service_role;

-- 2) Confirmação de entrega no modo delivery (pontuação automática pelo painel)
CREATE OR REPLACE FUNCTION public.confirm_delivery_checkin(p_offer_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offer record;
  v_business record;
  v_points integer;
  v_checkin_id uuid;
BEGIN
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id AND deleted_at IS NULL;
  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada');
  END IF;

  SELECT * INTO v_business FROM businesses WHERE id = v_offer.business_id;
  IF v_business IS NULL OR (v_business.owner_id <> auth.uid() AND NOT public.is_admin() AND auth.uid() IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado');
  END IF;

  IF NOT COALESCE(v_offer.is_delivery, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta oferta não está em modo delivery');
  END IF;

  IF v_offer.is_active = false OR v_offer.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta inativa ou expirada');
  END IF;

  IF EXISTS (
    SELECT 1 FROM offer_checkins
    WHERE offer_id = p_offer_id AND user_id = p_user_id AND DATE(validated_at) = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este cliente já foi pontuado hoje nesta oferta');
  END IF;

  v_points := COALESCE(v_offer.checkin_points, 50);
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND user_type = 'business') THEN
    v_points := 0;
  END IF;

  INSERT INTO offer_checkins (offer_id, business_id, user_id, points_awarded)
  VALUES (p_offer_id, v_offer.business_id, p_user_id, v_points)
  RETURNING id INTO v_checkin_id;

  IF v_points > 0 THEN
    INSERT INTO user_points (user_id, points_earned, action_type, offer_id, business_id, description)
    VALUES (p_user_id, v_points, 'checkin', p_offer_id, v_offer.business_id,
            'Entrega confirmada (delivery) - ' || v_offer.title);

    UPDATE profiles
    SET total_points = COALESCE(total_points, 0) + v_points, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  UPDATE offers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      current_actions = COALESCE(current_actions, 0) + 1
  WHERE id = p_offer_id;

  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, 'checkin', 'Entrega confirmada! 🛵',
          'Você ganhou ' || v_points || ' pontos em ' || v_business.name, v_checkin_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Entrega confirmada e pontos creditados',
    'points_awarded', v_points,
    'checkin_id', v_checkin_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_delivery_checkin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_checkin(uuid, uuid) TO authenticated, service_role;

-- 3) Hardening: update_user_points recalcula sempre a partir do histórico
CREATE OR REPLACE FUNCTION public.update_user_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_id AND pg_trigger_depth() = 0 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to award points to another user';
  END IF;

  -- Nunca confia no valor informado pelo cliente: recalcula a partir do histórico
  IF auth.uid() IS NOT NULL AND pg_trigger_depth() = 0 AND NOT public.is_admin() THEN
    UPDATE public.profiles p
    SET total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM public.user_points up WHERE up.user_id = p.user_id),
        updated_at = now()
    WHERE p.user_id = update_user_points.user_id;
    RETURN;
  END IF;

  PERFORM public.update_user_points_internal(user_id, points_to_add);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_user_points(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_points(uuid, integer) TO authenticated, service_role;