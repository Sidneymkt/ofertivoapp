-- Update process_qr_validation function to use offer-specific checkin points
CREATE OR REPLACE FUNCTION public.process_qr_validation(qr_data_param jsonb, user_id_param uuid, location_lat numeric DEFAULT NULL::numeric, location_lng numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  offer_record public.offers%ROWTYPE;
  business_record public.businesses%ROWTYPE;
  qr_record public.qr_codes%ROWTYPE;
  checkin_id UUID;
  points_to_award INTEGER;
  distance_meters NUMERIC;
  max_distance_meters NUMERIC := 200; -- 200 metros de raio
BEGIN
  -- Extrair dados do QR code
  IF NOT (qr_data_param ? 'offerId' AND qr_data_param ? 'businessId') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR Code inválido - dados incompletos'
    );
  END IF;

  -- Verificar se a oferta existe e está ativa
  SELECT * INTO offer_record
  FROM public.offers
  WHERE id = (qr_data_param->>'offerId')::UUID
    AND is_active = true
    AND valid_until > now();

  IF offer_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Oferta não encontrada ou expirada'
    );
  END IF;

  -- Usar pontos específicos da oferta
  points_to_award := COALESCE(offer_record.checkin_points, 50);

  -- Buscar dados do negócio
  SELECT * INTO business_record
  FROM public.businesses
  WHERE id = offer_record.business_id
    AND is_active = true;

  -- Verificar se usuário já fez check-in nesta oferta hoje
  IF EXISTS (
    SELECT 1 FROM public.offer_checkins
    WHERE offer_id = offer_record.id
      AND user_id = user_id_param
      AND DATE(validated_at) = CURRENT_DATE
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você já fez check-in nesta oferta hoje'
    );
  END IF;

  -- Validação de geolocalização (se fornecida)
  IF location_lat IS NOT NULL AND location_lng IS NOT NULL AND 
     business_record.latitude IS NOT NULL AND business_record.longitude IS NOT NULL THEN
    
    -- Calcular distância usando fórmula de Haversine
    distance_meters := (
      6371000 * acos(
        cos(radians(location_lat)) * 
        cos(radians(business_record.latitude)) * 
        cos(radians(business_record.longitude) - radians(location_lng)) + 
        sin(radians(location_lat)) * 
        sin(radians(business_record.latitude))
      )
    );

    -- Se está muito longe, reduzir pontos mas permitir check-in
    IF distance_meters > max_distance_meters THEN
      points_to_award := GREATEST(points_to_award / 2, 10); -- Reduz pela metade mas não menos que 10
    END IF;
  END IF;

  -- Buscar QR code correspondente
  SELECT * INTO qr_record
  FROM public.qr_codes
  WHERE offer_id = offer_record.id
    AND business_id = offer_record.business_id
    AND (is_used = false OR expires_at > now())
  LIMIT 1;

  -- Registrar o check-in
  INSERT INTO public.offer_checkins (
    offer_id,
    business_id,
    user_id,
    qr_code_id,
    points_awarded,
    location_latitude,
    location_longitude
  ) VALUES (
    offer_record.id,
    offer_record.business_id,
    user_id_param,
    qr_record.id,
    points_to_award,
    location_lat,
    location_lng
  ) RETURNING id INTO checkin_id;

  -- Atualizar estatísticas do usuário
  INSERT INTO public.user_points (
    user_id,
    points_earned,
    action_type,
    offer_id,
    business_id,
    description
  ) VALUES (
    user_id_param,
    points_to_award,
    'checkin',
    offer_record.id,
    offer_record.business_id,
    'Check-in via QR Code - ' || points_to_award || ' pontos'
  );

  -- Atualizar total de pontos do usuário
  UPDATE public.profiles
  SET total_points = total_points + points_to_award
  WHERE user_id = user_id_param;

  -- Incrementar contador de usos da oferta
  UPDATE public.offers
  SET current_uses = current_uses + 1
  WHERE id = offer_record.id;

  -- Marcar QR code como usado se for de uso único
  IF qr_record.id IS NOT NULL THEN
    UPDATE public.qr_codes
    SET is_used = true, used_by = user_id_param, used_at = now()
    WHERE id = qr_record.id;
  END IF;

  -- Verificar e conceder badges
  PERFORM public.check_and_award_badges(user_id_param);

  -- Atualizar analytics diárias
  INSERT INTO public.validation_analytics (
    business_id,
    offer_id,
    date,
    total_validations,
    unique_users,
    total_points_awarded,
    average_points_per_checkin,
    peak_hour
  ) VALUES (
    offer_record.business_id,
    offer_record.id,
    CURRENT_DATE,
    1,
    1,
    points_to_award,
    points_to_award,
    EXTRACT(HOUR FROM now())
  )
  ON CONFLICT (business_id, offer_id, date) DO UPDATE SET
    total_validations = validation_analytics.total_validations + 1,
    total_points_awarded = validation_analytics.total_points_awarded + points_to_award,
    average_points_per_checkin = (validation_analytics.total_points_awarded + points_to_award) / (validation_analytics.total_validations + 1),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN distance_meters > max_distance_meters THEN 
        'Check-in realizado! Pontos reduzidos por distância do local.'
      ELSE 
        'Check-in realizado com sucesso!'
    END,
    'points', points_to_award,
    'checkinId', checkin_id,
    'distance', distance_meters
  );
END;
$function$;