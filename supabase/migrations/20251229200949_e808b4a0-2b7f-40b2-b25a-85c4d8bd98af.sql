-- SECURITY FIX: Fix the other validate_checkin overload with different signature
CREATE OR REPLACE FUNCTION public.validate_checkin(p_business_id uuid, p_offer_id uuid, p_user_id uuid, p_qr_code text, p_location_lat numeric DEFAULT NULL::numeric, p_location_lng numeric DEFAULT NULL::numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_business_owner_id UUID;
  v_offer_exists BOOLEAN := FALSE;
  v_already_checked_in BOOLEAN := FALSE;
  v_points_to_award INTEGER := 50;
  v_checkin_id UUID;
  v_offer_record RECORD;
BEGIN
  -- Verificar se o negócio pertence ao usuário autenticado
  SELECT owner_id INTO v_business_owner_id
  FROM public.businesses
  WHERE id = p_business_id AND is_active = true;

  IF v_business_owner_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Negócio não encontrado ou não autorizado'
    );
  END IF;

  -- Verificar se a oferta existe e pertence ao negócio
  SELECT * INTO v_offer_record
  FROM public.offers
  WHERE id = p_offer_id 
    AND business_id = p_business_id 
    AND is_active = true
    AND valid_until > now()
    AND deleted_at IS NULL
    AND archived_at IS NULL;

  IF v_offer_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Oferta não encontrada ou expirada'
    );
  END IF;

  -- Usar pontos da oferta
  v_points_to_award := COALESCE(v_offer_record.checkin_points, 50);

  -- CORREÇÃO: Verificar se o usuário já fez check-in hoje em AMBAS as tabelas
  SELECT EXISTS(
    SELECT 1 FROM public.offer_checkins
    WHERE offer_id = p_offer_id
      AND user_id = p_user_id
      AND DATE(validated_at) = CURRENT_DATE
    UNION ALL
    SELECT 1 FROM public.checkin_validations
    WHERE business_id = p_business_id
      AND offer_id = p_offer_id
      AND user_id = p_user_id
      AND DATE(created_at) = CURRENT_DATE
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário já fez check-in nesta oferta hoje'
    );
  END IF;

  -- Registrar validação de check-in na tabela offer_checkins (principal)
  INSERT INTO public.offer_checkins (
    business_id,
    offer_id,
    user_id,
    points_awarded,
    location_latitude,
    location_longitude
  ) VALUES (
    p_business_id,
    p_offer_id,
    p_user_id,
    v_points_to_award,
    p_location_lat,
    p_location_lng
  ) RETURNING id INTO v_checkin_id;

  -- Adicionar pontos ao usuário
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
    p_offer_id,
    p_business_id,
    'Check-in validado pelo estabelecimento'
  );

  -- Atualizar total de pontos do usuário
  UPDATE public.profiles
  SET total_points = COALESCE(total_points, 0) + v_points_to_award
  WHERE user_id = p_user_id;

  -- Incrementar uso da oferta
  UPDATE public.offers
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE id = p_offer_id;

  -- Criar notificação para o usuário
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
    format('Você ganhou +%s pontos!', v_points_to_award),
    v_checkin_id,
    jsonb_build_object(
      'offer_id', p_offer_id,
      'business_id', p_business_id,
      'points_awarded', v_points_to_award
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erro ao validar check-in: ' || SQLERRM
    );
END;
$function$;