-- Dropar função existente para recriar com tipo de retorno correto
DROP FUNCTION IF EXISTS public.validate_manual_checkin_code(text, uuid);

-- Otimizar função validate_manual_checkin_code para ser mais robusta
CREATE OR REPLACE FUNCTION public.validate_manual_checkin_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code_record public.manual_checkin_codes%ROWTYPE;
  v_offer_record public.offers%ROWTYPE;
  v_business_name TEXT;
  v_points_to_award INTEGER;
  v_already_checked_in BOOLEAN := FALSE;
  v_checkin_id UUID;
BEGIN
  -- Validar código
  IF p_code IS NULL OR LENGTH(TRIM(p_code)) < 4 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Código inválido'
    );
  END IF;

  -- Buscar código manual
  SELECT * INTO v_code_record
  FROM public.manual_checkin_codes
  WHERE code = UPPER(TRIM(p_code))
    AND used = false
    AND expires_at > now();

  IF v_code_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Código inválido, expirado ou já utilizado'
    );
  END IF;

  -- Buscar oferta
  SELECT * INTO v_offer_record
  FROM public.offers
  WHERE id = v_code_record.offer_id
    AND is_active = true
    AND valid_until > now()
    AND deleted_at IS NULL;

  IF v_offer_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Oferta não encontrada ou expirada'
    );
  END IF;

  -- Buscar nome do negócio
  SELECT name INTO v_business_name
  FROM public.businesses
  WHERE id = v_code_record.business_id;

  v_points_to_award := COALESCE(v_offer_record.checkin_points, 50);

  -- Verificar check-in duplicado
  SELECT EXISTS(
    SELECT 1 FROM public.offer_checkins
    WHERE offer_id = v_offer_record.id
      AND user_id = p_user_id
      AND DATE(validated_at) = CURRENT_DATE
    UNION ALL
    SELECT 1 FROM public.checkin_validations
    WHERE offer_id = v_offer_record.id
      AND user_id = p_user_id
      AND DATE(created_at) = CURRENT_DATE
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você já fez check-in nesta oferta hoje'
    );
  END IF;

  -- Marcar código como usado
  UPDATE public.manual_checkin_codes
  SET used = true, 
      used_at = now(), 
      used_by_user_id = p_user_id
  WHERE id = v_code_record.id;

  -- Registrar check-in
  INSERT INTO public.offer_checkins (
    offer_id,
    business_id,
    user_id,
    points_awarded
  ) VALUES (
    v_offer_record.id,
    v_code_record.business_id,
    p_user_id,
    v_points_to_award
  ) RETURNING id INTO v_checkin_id;

  -- Adicionar pontos
  INSERT INTO public.user_points (
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
    v_offer_record.id,
    v_code_record.business_id,
    'Check-in via código manual em ' || COALESCE(v_business_name, 'estabelecimento')
  );

  -- Atualizar total de pontos
  UPDATE public.profiles
  SET total_points = COALESCE(total_points, 0) + v_points_to_award
  WHERE user_id = p_user_id;

  -- Incrementar uso da oferta
  UPDATE public.offers
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE id = v_offer_record.id;

  -- Criar notificação
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    metadata
  ) VALUES (
    p_user_id,
    'checkin_confirmed',
    'Check-in confirmado! 🎉',
    'Você ganhou +' || v_points_to_award || ' pontos em ' || COALESCE(v_business_name, 'estabelecimento'),
    v_checkin_id,
    jsonb_build_object(
      'offer_id', v_offer_record.id,
      'business_id', v_code_record.business_id,
      'points_awarded', v_points_to_award
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in realizado com sucesso!',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro ao validar código: ' || SQLERRM
  );
END;
$$;