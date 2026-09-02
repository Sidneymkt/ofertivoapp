-- 1. Criar função IMMUTABLE para extrair data
CREATE OR REPLACE FUNCTION public.get_date_from_timestamp(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ts::date;
$$;

-- 2. Remover duplicatas existentes (manter apenas o primeiro registro de cada dia)
DELETE FROM public.offer_checkins
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, offer_id, created_at::date) id
  FROM public.offer_checkins
  ORDER BY user_id, offer_id, created_at::date, created_at ASC
);

-- 3. Criar índice único usando a função IMMUTABLE
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_checkin_per_day 
ON public.offer_checkins (user_id, offer_id, public.get_date_from_timestamp(created_at));

-- 4. Função para debitar pontos da carteira do negócio
CREATE OR REPLACE FUNCTION public.debit_business_wallet(
  p_business_id uuid,
  p_amount integer,
  p_offer_id uuid,
  p_user_id uuid,
  p_description text DEFAULT 'Check-in validado'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
BEGIN
  -- Obter saldo atual com lock
  SELECT current_balance INTO v_current_balance
  FROM business_points_wallet
  WHERE business_id = p_business_id
  FOR UPDATE;
  
  -- Se não encontrou carteira, criar uma
  IF v_current_balance IS NULL THEN
    INSERT INTO business_points_wallet (business_id, current_balance, monthly_allocation)
    VALUES (p_business_id, 1000, 1000)
    ON CONFLICT (business_id) DO NOTHING;
    
    SELECT current_balance INTO v_current_balance
    FROM business_points_wallet
    WHERE business_id = p_business_id
    FOR UPDATE;
  END IF;
  
  -- Verificar saldo suficiente
  IF v_current_balance < p_amount THEN
    RETURN false;
  END IF;
  
  -- Calcular novo saldo
  v_new_balance := v_current_balance - p_amount;
  
  -- Atualizar carteira
  UPDATE business_points_wallet
  SET 
    current_balance = v_new_balance,
    total_consumed = total_consumed + p_amount,
    updated_at = now()
  WHERE business_id = p_business_id;
  
  -- Registrar transação
  INSERT INTO business_points_transactions (
    business_id,
    amount,
    balance_after,
    transaction_type,
    description,
    offer_id,
    user_id
  ) VALUES (
    p_business_id,
    -p_amount,
    v_new_balance,
    'checkin_debit',
    p_description,
    p_offer_id,
    p_user_id
  );
  
  -- Atualizar contador de ações na oferta
  UPDATE offers
  SET 
    current_actions = COALESCE(current_actions, 0) + 1,
    total_points_consumed = COALESCE(total_points_consumed, 0) + p_amount,
    updated_at = now()
  WHERE id = p_offer_id;
  
  RETURN true;
END;
$$;

-- 5. Atualizar função de validação de QR Code
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
  
  -- Debitar pontos da carteira do negócio
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
  
  -- Inserir check-in com tratamento de duplicata
  BEGIN
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

-- 6. Atualizar função de validação de código manual
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
  
  -- Debitar pontos da carteira do negócio
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
  
  -- Marcar código como usado
  UPDATE manual_checkin_codes
  SET used = true,
      used_at = now(),
      used_by_user_id = p_user_id
  WHERE id = v_code_record.id;
  
  -- Inserir check-in com tratamento de duplicata
  BEGIN
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

-- 7. Atualizar função validate_checkin para usar as novas funções
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