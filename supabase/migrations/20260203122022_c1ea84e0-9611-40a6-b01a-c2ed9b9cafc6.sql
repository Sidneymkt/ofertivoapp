-- 1) Garantir Realtime também para carteira/transactions/checkins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'business_points_wallet'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_points_wallet;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'business_points_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_points_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offer_checkins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_checkins;
  END IF;
END $$;

-- 2) Evitar débito duplicado: rollback do débito quando o check-in for duplicado
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

  -- Criar notificação para o usuário
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'checkin',
    'Check-in realizado!',
    'Você ganhou ' || v_points_to_award || ' pontos no ' || v_business.name,
    v_checkin_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso!',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id
  );
END;
$$;

-- 3) Mesma garantia para código manual (sem debitar se for duplicado)
CREATE OR REPLACE FUNCTION public.validate_manual_checkin_code(
  p_code text,
  p_user_id uuid
)
RETURNS jsonb
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
  -- Buscar código válido
  SELECT * INTO v_code_record
  FROM manual_checkin_codes
  WHERE code = UPPER(TRIM(p_code))
    AND used = false
    AND expires_at > now()
  FOR UPDATE;

  IF v_code_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Código inválido, expirado ou já utilizado');
  END IF;

  -- Buscar oferta
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

  -- Verificar limite de ações
  IF v_offer.max_actions IS NOT NULL AND COALESCE(v_offer.current_actions, 0) >= v_offer.max_actions THEN
    RETURN jsonb_build_object('success', false, 'message', 'Limite de check-ins desta oferta foi atingido');
  END IF;

  -- Buscar negócio
  SELECT * INTO v_business FROM businesses WHERE id = v_code_record.business_id;

  -- Calcular pontos
  v_points_to_award := COALESCE(v_offer.points_per_action, v_offer.checkin_points, 50);

  -- Débito + marcação do código + check-in no mesmo bloco (unique_violation reverte tudo)
  BEGIN
    v_wallet_debited := debit_business_wallet(
      v_code_record.business_id,
      v_points_to_award,
      v_code_record.offer_id,
      p_user_id,
      'Check-in via código manual - ' || v_offer.title
    );

    IF NOT v_wallet_debited THEN
      RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente na carteira do negócio');
    END IF;

    UPDATE manual_checkin_codes
    SET used = true,
        used_at = now(),
        used_by_user_id = p_user_id
    WHERE id = v_code_record.id;

    INSERT INTO offer_checkins (
      business_id,
      offer_id,
      user_id,
      points_awarded,
      validated_at
    ) VALUES (
      v_code_record.business_id,
      v_code_record.offer_id,
      p_user_id,
      v_points_to_award,
      now()
    )
    RETURNING id INTO v_checkin_id;

  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'Check-in já realizado hoje para esta oferta');
  END;

  -- Creditar pontos ao usuário
  UPDATE profiles
  SET total_points = COALESCE(total_points, 0) + v_points_to_award,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Criar notificação
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'checkin',
    'Check-in realizado!',
    'Você ganhou ' || v_points_to_award || ' pontos no ' || v_business.name,
    v_checkin_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso!',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id
  );
END;
$$;

-- 4) validate_checkin continua encaminhando para process_qr_validation (mantém API do painel)
CREATE OR REPLACE FUNCTION public.validate_checkin(
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
BEGIN
  RETURN process_qr_validation(
    p_business_id,
    p_offer_id,
    p_user_id,
    p_qr_code,
    p_location_lat,
    p_location_lng
  );
END;
$$;
