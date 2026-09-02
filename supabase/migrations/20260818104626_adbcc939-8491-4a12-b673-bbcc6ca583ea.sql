GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;

CREATE OR REPLACE FUNCTION public.can_validate_offer_checkin(p_offer_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (auth.uid() IS NOT NULL AND auth.uid() = p_user_id)
    OR (auth.uid() IS NOT NULL AND public.is_admin())
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.offers o
      JOIN public.businesses b ON b.id = o.business_id
      WHERE o.id = p_offer_id AND b.owner_id = auth.uid()
    ));
$$;

REVOKE ALL ON FUNCTION public.can_validate_offer_checkin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_validate_offer_checkin(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_qr_validation(
  p_business_id uuid,
  p_offer_id uuid,
  p_user_id uuid,
  p_qr_code text,
  p_location_lat numeric DEFAULT NULL,
  p_location_lng numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
  v_business record;
  v_points_to_award integer;
  v_checkin_id uuid;
  v_existing record;
BEGIN
  IF NOT public.can_validate_offer_checkin(p_offer_id, p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado a validar este check-in');
  END IF;

  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id AND business_id = p_business_id AND is_active = true;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada ou inativa');
  END IF;

  SELECT id, points_awarded INTO v_existing
  FROM public.offer_checkins
  WHERE offer_id = p_offer_id AND user_id = p_user_id
    AND validated_at >= date_trunc('day', now())
    AND validated_at < date_trunc('day', now()) + interval '1 day'
  ORDER BY validated_at DESC
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_validated', true,
      'message', 'Check-in já confirmado hoje!',
      'points_awarded', COALESCE(v_existing.points_awarded, 0),
      'points', COALESCE(v_existing.points_awarded, 0),
      'checkin_id', v_existing.id
    );
  END IF;

  IF v_offer.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta oferta já expirou');
  END IF;

  IF v_offer.max_actions IS NOT NULL AND COALESCE(v_offer.current_actions, 0) >= v_offer.max_actions THEN
    RETURN jsonb_build_object('success', false, 'message', 'Limite de check-ins desta oferta atingido');
  END IF;

  SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id AND is_active = true;
  IF v_business IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Estabelecimento não encontrado ou inativo');
  END IF;

  v_points_to_award := COALESCE(v_offer.checkin_points, 50);

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

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND user_type = 'business') THEN
    v_points_to_award := 0;
  END IF;

  INSERT INTO public.offer_checkins
    (offer_id, business_id, user_id, points_awarded, location_latitude, location_longitude)
  VALUES
    (p_offer_id, p_business_id, p_user_id, v_points_to_award, p_location_lat, p_location_lng)
  RETURNING id INTO v_checkin_id;

  IF v_points_to_award > 0 THEN
    INSERT INTO public.user_points (user_id, points_earned, action_type, offer_id, business_id, description)
    VALUES (p_user_id, v_points_to_award, 'checkin', p_offer_id, p_business_id, 'Check-in - ' || v_offer.title);

    UPDATE public.profiles p
    SET total_points = (SELECT COALESCE(SUM(up.points_earned), 0) FROM public.user_points up WHERE up.user_id = p_user_id),
        updated_at = now()
    WHERE p.user_id = p_user_id;
  END IF;

  UPDATE public.offers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      current_actions = COALESCE(current_actions, 0) + 1
  WHERE id = p_offer_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, 'checkin', 'Check-in realizado!',
          'Você ganhou ' || v_points_to_award || ' pontos no ' || v_business.name, v_checkin_id);

  RETURN jsonb_build_object(
    'success', true,
    'already_validated', false,
    'message', 'Check-in validado com sucesso!',
    'points_awarded', v_points_to_award,
    'points', v_points_to_award,
    'checkin_id', v_checkin_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_qr_validation(uuid, uuid, uuid, text, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_qr_validation(uuid, uuid, uuid, text, numeric, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_delivery_checkin(p_offer_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
  v_business record;
  v_points integer;
  v_checkin_id uuid;
  v_existing record;
BEGIN
  IF auth.uid() IS NULL AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Faça login para confirmar a entrega');
  END IF;

  SELECT * INTO v_offer FROM public.offers WHERE id = p_offer_id AND deleted_at IS NULL;
  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada');
  END IF;

  SELECT * INTO v_business FROM public.businesses WHERE id = v_offer.business_id;
  IF v_business IS NULL OR (
    current_setting('request.jwt.claim.role', true) <> 'service_role'
    AND v_business.owner_id <> auth.uid()
    AND NOT public.is_admin()
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Somente o responsável pelo negócio pode confirmar esta entrega');
  END IF;

  IF NOT COALESCE(v_offer.is_delivery, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta oferta não está em modo delivery');
  END IF;

  SELECT id, points_awarded INTO v_existing
  FROM public.offer_checkins
  WHERE offer_id = p_offer_id AND user_id = p_user_id
    AND validated_at >= date_trunc('day', now())
    AND validated_at < date_trunc('day', now()) + interval '1 day'
  ORDER BY validated_at DESC
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_validated', true,
      'message', 'Entrega e pontuação já confirmadas hoje',
      'points_awarded', COALESCE(v_existing.points_awarded, 0),
      'checkin_id', v_existing.id
    );
  END IF;

  IF v_offer.is_active = false OR v_offer.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta inativa ou expirada');
  END IF;

  v_points := COALESCE(v_offer.checkin_points, 50);
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND user_type = 'business') THEN
    v_points := 0;
  END IF;

  INSERT INTO public.offer_checkins (offer_id, business_id, user_id, points_awarded)
  VALUES (p_offer_id, v_offer.business_id, p_user_id, v_points)
  RETURNING id INTO v_checkin_id;

  IF v_points > 0 THEN
    INSERT INTO public.user_points (user_id, points_earned, action_type, offer_id, business_id, description)
    VALUES (p_user_id, v_points, 'checkin', p_offer_id, v_offer.business_id,
            'Entrega confirmada (delivery) - ' || v_offer.title);

    UPDATE public.profiles p
    SET total_points = (SELECT COALESCE(SUM(up.points_earned), 0) FROM public.user_points up WHERE up.user_id = p_user_id),
        updated_at = now()
    WHERE p.user_id = p_user_id;
  END IF;

  UPDATE public.offers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      current_actions = COALESCE(current_actions, 0) + 1
  WHERE id = p_offer_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, 'checkin', 'Entrega confirmada!',
          'Você ganhou ' || v_points || ' pontos em ' || v_business.name, v_checkin_id);

  RETURN jsonb_build_object(
    'success', true,
    'already_validated', false,
    'message', 'Entrega confirmada e pontos creditados',
    'points_awarded', v_points,
    'checkin_id', v_checkin_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_delivery_checkin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_checkin(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.transfer_points(uuid, uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_points(uuid, uuid, integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_user_points(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_points(uuid, integer) TO authenticated, service_role;