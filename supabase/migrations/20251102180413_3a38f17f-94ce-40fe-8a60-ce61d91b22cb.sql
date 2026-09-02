-- Corrigir função validate_manual_checkin_code para usar colunas corretas
CREATE OR REPLACE FUNCTION public.validate_manual_checkin_code(
  p_code TEXT,
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_offer_record RECORD;
  v_business_record RECORD;
  v_existing_checkin RECORD;
  v_points_to_award INTEGER;
  v_checkin_id UUID;
BEGIN
  -- Validar código
  SELECT * INTO v_code_record
  FROM manual_checkin_codes
  WHERE code = UPPER(TRIM(p_code))
    AND NOT used
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Código inválido, expirado ou já utilizado.'
    );
  END IF;

  -- Buscar dados da oferta
  SELECT * INTO v_offer_record
  FROM offers
  WHERE id = v_code_record.offer_id
    AND is_active = true
    AND valid_until > now();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Oferta não encontrada ou expirada.'
    );
  END IF;

  -- Buscar dados do negócio
  SELECT * INTO v_business_record
  FROM businesses
  WHERE id = v_code_record.business_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Negócio não encontrado ou inativo.'
    );
  END IF;

  -- Verificar se usuário já fez check-in hoje nesta oferta
  SELECT * INTO v_existing_checkin
  FROM checkin_validations
  WHERE offer_id = v_offer_record.id
    AND user_id = p_user_id
    AND DATE(created_at) = CURRENT_DATE;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você já realizou check-in nesta oferta hoje.'
    );
  END IF;

  -- Definir pontos a serem concedidos
  v_points_to_award := COALESCE(v_offer_record.checkin_points, 50);

  -- Marcar código como usado
  UPDATE manual_checkin_codes
  SET 
    used = true,
    used_at = now(),
    used_by_user_id = p_user_id
  WHERE id = v_code_record.id;

  -- Registrar check-in com as colunas corretas
  INSERT INTO checkin_validations (
    offer_id,
    user_id,
    business_id,
    validated_by,
    qr_code,
    points_awarded,
    location_latitude,
    location_longitude
  )
  VALUES (
    v_offer_record.id,
    p_user_id,
    v_business_record.id,
    v_business_record.owner_id,
    json_build_object(
      'type', 'manual_code',
      'code', p_code,
      'offer_id', v_offer_record.id,
      'business_id', v_business_record.id
    )::text,
    v_points_to_award,
    NULL,
    NULL
  )
  RETURNING id INTO v_checkin_id;

  -- Creditar pontos ao usuário
  UPDATE profiles
  SET total_points = total_points + v_points_to_award
  WHERE user_id = p_user_id;

  -- Incrementar contador de usos da oferta
  UPDATE offers
  SET current_uses = current_uses + 1
  WHERE id = v_offer_record.id;

  -- Criar notificação para o usuário
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    metadata
  )
  VALUES (
    p_user_id,
    'checkin_confirmed',
    'Check-in confirmado! 🎉',
    format('Você ganhou +%s pontos em %s', v_points_to_award, v_business_record.name),
    v_checkin_id,
    json_build_object(
      'offer_id', v_offer_record.id,
      'business_id', v_business_record.id,
      'points_awarded', v_points_to_award
    )
  );

  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'message', format('Check-in realizado com sucesso! +%s pontos', v_points_to_award),
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id,
    'offer_title', v_offer_record.title,
    'business_name', v_business_record.name
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erro ao processar check-in: ' || SQLERRM
    );
END;
$$;