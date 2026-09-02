CREATE OR REPLACE FUNCTION public.create_offer_pix_order(
  p_offer_id uuid,
  p_amount numeric,
  p_points_to_award integer,
  p_consumer_phone text DEFAULT NULL
)
RETURNS public.offer_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_offer record;
  v_pix_key record;
  v_crm_lead_id uuid;
  v_order public.offer_orders;
  v_tx_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Faça login para gerar o PIX.' USING ERRCODE = '28000';
  END IF;

  SELECT id, business_id, title, is_active, valid_until
  INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
    AND COALESCE(is_active, true) = true
    AND valid_until >= now()
  LIMIT 1;

  IF v_offer.id IS NULL THEN
    RAISE EXCEPTION 'Oferta indisponível para pagamento PIX.' USING ERRCODE = 'P0001';
  END IF;

  IF public.user_owns_business(v_offer.business_id, v_user_id) THEN
    RAISE EXCEPTION 'Anunciantes não podem comprar a própria oferta.' USING ERRCODE = 'P0001';
  END IF;

  SELECT key_type, key_value, holder_name, bank_name
  INTO v_pix_key
  FROM public.business_pix_keys
  WHERE business_id = v_offer.business_id
    AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_pix_key.key_value IS NULL THEN
    RAISE EXCEPTION 'Este anunciante ainda não cadastrou chave PIX.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.crm_leads (
    business_id,
    user_id,
    status,
    origem,
    ultima_interacao,
    score_engajamento
  )
  VALUES (
    v_offer.business_id,
    v_user_id,
    'interessado',
    'checkin',
    now(),
    10
  )
  ON CONFLICT (business_id, user_id)
  DO UPDATE SET
    status = CASE
      WHEN public.crm_leads.status = 'cliente' THEN public.crm_leads.status
      ELSE 'interessado'
    END,
    ultima_interacao = now(),
    score_engajamento = GREATEST(public.crm_leads.score_engajamento, 10),
    updated_at = now()
  RETURNING id INTO v_crm_lead_id;

  v_tx_code := 'OFT' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.offer_orders (
    offer_id,
    business_id,
    consumer_id,
    amount,
    points_to_award,
    tx_code,
    consumer_phone,
    crm_lead_id,
    pix_key_snapshot
  )
  VALUES (
    v_offer.id,
    v_offer.business_id,
    v_user_id,
    GREATEST(COALESCE(p_amount, 0), 0),
    GREATEST(COALESCE(p_points_to_award, 0), 0),
    v_tx_code,
    NULLIF(trim(COALESCE(p_consumer_phone, '')), ''),
    v_crm_lead_id,
    jsonb_build_object(
      'type', v_pix_key.key_type,
      'value', v_pix_key.key_value,
      'holder', v_pix_key.holder_name,
      'bank', v_pix_key.bank_name
    )
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_offer_pix_order(uuid, numeric, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_offer_order(
  p_order_id uuid,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.offer_orders;
  v_total_points integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Faça login para confirmar o pagamento.' USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_order
  FROM public.offer_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido PIX não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.user_owns_business(v_order.business_id, v_actor_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você não tem permissão para confirmar este pagamento.' USING ERRCODE = '42501';
  END IF;

  IF v_order.status = 'pago' THEN
    SELECT COALESCE(total_points, 0)
    INTO v_total_points
    FROM public.profiles
    WHERE user_id = v_order.consumer_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'order_id', v_order.id,
      'points_awarded', v_order.points_to_award,
      'total_points', COALESCE(v_total_points, 0)
    );
  END IF;

  IF v_order.status <> 'pendente' THEN
    RAISE EXCEPTION 'Este pedido não está pendente.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.offer_orders
  SET status = 'pago',
      confirmed_at = now(),
      confirmed_by = v_actor_id,
      updated_at = now()
  WHERE id = v_order.id;

  PERFORM public.update_user_points(v_order.consumer_id, v_order.points_to_award);

  INSERT INTO public.user_points (
    user_id,
    points_earned,
    action_type,
    offer_id,
    business_id,
    description,
    created_at
  )
  VALUES (
    v_order.consumer_id,
    v_order.points_to_award,
    'checkin',
    v_order.offer_id,
    v_order.business_id,
    'Pontos por compra PIX confirmada: ' || v_order.tx_code,
    now()
  );

  SELECT COALESCE(total_points, 0)
  INTO v_total_points
  FROM public.profiles
  WHERE user_id = v_order.consumer_id;

  UPDATE public.crm_leads
  SET status = 'cliente',
      origem = 'checkin',
      ultima_interacao = now(),
      score_engajamento = score_engajamento + 25,
      recorrente = true,
      updated_at = now()
  WHERE id = v_order.crm_lead_id;

  PERFORM public.create_notification(
    p_user_id := v_order.consumer_id,
    p_title := 'Pagamento PIX confirmado',
    p_message := 'Seu pagamento foi confirmado e os pontos foram creditados.',
    p_type := 'pix_payment_confirmed',
    p_metadata := jsonb_build_object(
      'offer_id', v_order.offer_id,
      'business_id', v_order.business_id,
      'points_awarded', v_order.points_to_award,
      'tx_code', v_order.tx_code
    ),
    p_related_id := v_order.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'points_awarded', v_order.points_to_award,
    'total_points', COALESCE(v_total_points, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_offer_order(uuid, text, text) TO authenticated;