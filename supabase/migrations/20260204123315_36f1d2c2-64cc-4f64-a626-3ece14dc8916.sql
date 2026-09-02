
-- Drop and recreate the process_qr_validation function with the correct type for related_id
CREATE OR REPLACE FUNCTION public.process_qr_validation(
  p_business_id UUID,
  p_offer_id UUID,
  p_user_id UUID,
  p_qr_code TEXT,
  p_location_lat NUMERIC DEFAULT NULL,
  p_location_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
  v_business record;
  v_points_to_award integer;
  v_checkin_id uuid;
  v_distance_km numeric;
  v_wallet_debited boolean;
BEGIN
  -- Verificar se a oferta existe e pertence ao negócio
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id AND business_id = p_business_id AND is_active = true;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada ou inativa');
  END IF;

  -- Verificar se a oferta não expirou
  IF v_offer.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta oferta já expirou');
  END IF;

  -- Verificar limite de ações
  IF v_offer.max_actions IS NOT NULL AND COALESCE(v_offer.current_actions, 0) >= v_offer.max_actions THEN
    RETURN jsonb_build_object('success', false, 'message', 'Limite de check-ins desta oferta foi atingido');
  END IF;

  -- Obter dados do negócio
  SELECT * INTO v_business FROM businesses WHERE id = p_business_id;

  -- Calcular pontos (usar points_per_action ou checkin_points)
  v_points_to_award := COALESCE(v_offer.points_per_action, v_offer.checkin_points, 50);

  -- Verificar distância se coordenadas fornecidas
  IF p_location_lat IS NOT NULL AND p_location_lng IS NOT NULL
     AND v_business.latitude IS NOT NULL AND v_business.longitude IS NOT NULL THEN
    v_distance_km := (
      6371 * acos(
        cos(radians(p_location_lat)) * cos(radians(v_business.latitude)) *
        cos(radians(v_business.longitude) - radians(p_location_lng)) +
        sin(radians(p_location_lat)) * sin(radians(v_business.latitude))
      )
    );

    -- Se muito longe (>200m), reduzir pontos pela metade
    IF v_distance_km > 0.2 THEN
      v_points_to_award := v_points_to_award / 2;
    END IF;
  END IF;

  -- Débito + registro do check-in no MESMO bloco para que o unique_violation reverta o débito
  BEGIN
    v_wallet_debited := debit_business_wallet(
      p_business_id,
      v_points_to_award,
      p_offer_id,
      p_user_id,
      'Check-in via QR Code - ' || v_offer.title
    );

    IF NOT v_wallet_debited THEN
      RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente na carteira do negócio');
    END IF;

    INSERT INTO offer_checkins (
      business_id,
      offer_id,
      user_id,
      points_awarded,
      location_latitude,
      location_longitude,
      validated_at
    ) VALUES (
      p_business_id,
      p_offer_id,
      p_user_id,
      v_points_to_award,
      p_location_lat,
      p_location_lng,
      now()
    )
    RETURNING id INTO v_checkin_id;

  EXCEPTION WHEN unique_violation THEN
    -- Tudo que ocorreu dentro do bloco (inclusive débito) é revertido automaticamente
    RETURN jsonb_build_object('success', false, 'message', 'Check-in já realizado hoje para esta oferta');
  END;

  -- Creditar pontos ao usuário
  UPDATE profiles
  SET total_points = COALESCE(total_points, 0) + v_points_to_award,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Incrementar contador de usos da oferta
  UPDATE offers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      current_actions = COALESCE(current_actions, 0) + 1
  WHERE id = p_offer_id;

  -- Registrar na tabela user_points para histórico
  INSERT INTO user_points (
    user_id,
    points_earned,
    action_type,
    offer_id,
    business_id,
    description
  ) VALUES (
    p_user_id,
    v_points_to_award,
    'checkin',
    p_offer_id,
    p_business_id,
    'Check-in via QR Code - ' || v_offer.title
  );

  -- Criar notificação para o usuário (related_id é UUID, não precisa de cast)
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'checkin',
    'Check-in realizado!',
    'Você ganhou ' || v_points_to_award || ' pontos no ' || v_business.name,
    v_checkin_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso!',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id
  );
END;
$$;

-- Também corrigir a função validate_manual_checkin_code se tiver o mesmo problema
CREATE OR REPLACE FUNCTION public.validate_manual_checkin_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record record;
  v_offer record;
  v_business record;
  v_points_to_award integer;
  v_checkin_id uuid;
  v_wallet_debited boolean;
BEGIN
  -- Buscar o código manual
  SELECT * INTO v_code_record
  FROM manual_checkin_codes
  WHERE code = p_code
    AND used = false
    AND expires_at > now();

  IF v_code_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código inválido, expirado ou já utilizado');
  END IF;

  -- Buscar a oferta
  SELECT * INTO v_offer
  FROM offers
  WHERE id = v_code_record.offer_id AND is_active = true;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada ou inativa');
  END IF;

  -- Verificar se a oferta não expirou
  IF v_offer.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta oferta já expirou');
  END IF;

  -- Buscar o negócio
  SELECT * INTO v_business FROM businesses WHERE id = v_code_record.business_id;

  -- Calcular pontos
  v_points_to_award := COALESCE(v_offer.points_per_action, v_offer.checkin_points, 50);

  -- Débito + registro do check-in no MESMO bloco para que o unique_violation reverta o débito
  BEGIN
    v_wallet_debited := debit_business_wallet(
      v_code_record.business_id,
      v_points_to_award,
      v_offer.id,
      p_user_id,
      'Check-in via código manual - ' || v_offer.title
    );

    IF NOT v_wallet_debited THEN
      RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente na carteira do negócio');
    END IF;

    INSERT INTO offer_checkins (
      business_id,
      offer_id,
      user_id,
      points_awarded,
      validated_at
    ) VALUES (
      v_code_record.business_id,
      v_offer.id,
      p_user_id,
      v_points_to_award,
      now()
    )
    RETURNING id INTO v_checkin_id;

  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'Check-in já realizado hoje para esta oferta');
  END;

  -- Marcar código como usado
  UPDATE manual_checkin_codes
  SET used = true, used_at = now(), used_by_user_id = p_user_id
  WHERE id = v_code_record.id;

  -- Creditar pontos ao usuário
  UPDATE profiles
  SET total_points = COALESCE(total_points, 0) + v_points_to_award,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Incrementar contador de usos da oferta
  UPDATE offers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      current_actions = COALESCE(current_actions, 0) + 1
  WHERE id = v_offer.id;

  -- Registrar na tabela user_points para histórico
  INSERT INTO user_points (
    user_id,
    points_earned,
    action_type,
    offer_id,
    business_id,
    description
  ) VALUES (
    p_user_id,
    v_points_to_award,
    'checkin',
    v_offer.id,
    v_code_record.business_id,
    'Check-in via código manual - ' || v_offer.title
  );

  -- Criar notificação para o usuário (related_id é UUID, não precisa de cast)
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'checkin',
    'Check-in realizado!',
    'Você ganhou ' || v_points_to_award || ' pontos no ' || v_business.name,
    v_checkin_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso!',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id
  );
END;
$$;
