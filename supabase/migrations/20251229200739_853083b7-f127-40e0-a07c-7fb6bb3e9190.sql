-- SECURITY FIX: Add SET search_path = public to all SECURITY DEFINER functions
-- This prevents privilege escalation through malicious schema manipulation

-- 1. Fix auto_generate_qr_code
CREATE OR REPLACE FUNCTION public.auto_generate_qr_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Gerar QR code automaticamente para a nova oferta
  INSERT INTO public.qr_codes (
    offer_id,
    business_id,
    code,
    is_used,
    expires_at
  ) VALUES (
    NEW.id,
    NEW.business_id,
    jsonb_build_object(
      'offerId', NEW.id::text,
      'businessId', NEW.business_id::text,
      'timestamp', now()::text,
      'type', 'offer_checkin'
    )::text,
    false,
    NEW.valid_until
  );
  
  RETURN NEW;
END;
$function$;

-- 2. Fix calculate_referral_commission (trigger version)
CREATE OR REPLACE FUNCTION public.calculate_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_referrer_id UUID;
  v_commission_percentage NUMERIC;
  v_commission_amount NUMERIC;
BEGIN
  -- Buscar o referrer do negócio
  SELECT referred_by INTO v_referrer_id
  FROM businesses
  WHERE id = NEW.business_id;

  -- Se o negócio foi indicado, calcular comissão
  IF v_referrer_id IS NOT NULL THEN
    -- Buscar taxa de comissão para o plano
    SELECT commission_percentage INTO v_commission_percentage
    FROM referral_settings
    WHERE subscription_plan_id = NEW.plan_id
      AND is_active = true
    LIMIT 1;

    -- Se não encontrar configuração específica, usar taxa padrão de 25%
    IF v_commission_percentage IS NULL THEN
      v_commission_percentage := 25.00;
    END IF;

    -- Calcular valor da assinatura baseado no plano
    DECLARE
      v_subscription_amount NUMERIC;
    BEGIN
      SELECT price_monthly INTO v_subscription_amount
      FROM subscription_plans
      WHERE id = NEW.plan_id;

      -- Calcular comissão
      v_commission_amount := (v_subscription_amount * v_commission_percentage / 100);

      -- Inserir registro de comissão
      INSERT INTO referral_commissions (
        referrer_id,
        business_id,
        subscription_id,
        commission_amount,
        commission_percentage,
        subscription_amount,
        status,
        period_start,
        period_end
      ) VALUES (
        v_referrer_id,
        NEW.business_id,
        NEW.id,
        v_commission_amount,
        v_commission_percentage,
        v_subscription_amount,
        'pending',
        NEW.current_period_start,
        NEW.current_period_end
      );

      -- Atualizar estatísticas de indicação
      INSERT INTO referral_stats (user_id, total_commissions_earned, total_commissions_pending)
      VALUES (v_referrer_id, v_commission_amount, v_commission_amount)
      ON CONFLICT (user_id)
      DO UPDATE SET
        total_commissions_earned = referral_stats.total_commissions_earned + v_commission_amount,
        total_commissions_pending = referral_stats.total_commissions_pending + v_commission_amount,
        last_commission_date = NOW();
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Fix conduct_raffle (if exists)
CREATE OR REPLACE FUNCTION public.conduct_raffle(raffle_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  raffle_record public.raffles%ROWTYPE;
  winner_entry public.raffle_entries%ROWTYPE;
  total_entries INTEGER;
  random_number INTEGER;
  audit_data JSONB;
BEGIN
  -- Get raffle data
  SELECT * INTO raffle_record FROM public.raffles WHERE id = raffle_id_param;
  
  IF raffle_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sorteio não encontrado');
  END IF;
  
  IF raffle_record.winner_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sorteio já realizado');
  END IF;
  
  -- Count total entries
  SELECT COUNT(*) INTO total_entries FROM public.raffle_entries WHERE raffle_id = raffle_id_param;
  
  IF total_entries = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nenhum participante no sorteio');
  END IF;
  
  -- Generate random winner
  random_number := floor(random() * total_entries) + 1;
  
  SELECT * INTO winner_entry 
  FROM public.raffle_entries 
  WHERE raffle_id = raffle_id_param 
  ORDER BY entry_number 
  OFFSET (random_number - 1) 
  LIMIT 1;
  
  -- Update raffle with winner
  UPDATE public.raffles
  SET 
    winner_id = winner_entry.user_id,
    winning_ticket_number = winner_entry.entry_number,
    draw_date = now(),
    total_tickets_at_draw = total_entries,
    draw_hash = encode(sha256(random()::text::bytea), 'hex'),
    is_active = false
  WHERE id = raffle_id_param;
  
  -- Create notification for winner
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    winner_entry.user_id,
    'Você ganhou o sorteio! 🎉',
    'Parabéns! Você foi o vencedor do sorteio: ' || raffle_record.title,
    'raffle_winner',
    raffle_id_param
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'winner_id', winner_entry.user_id,
    'winning_ticket', winner_entry.entry_number,
    'total_entries', total_entries
  );
END;
$function$;

-- 4. Fix get_post_stats
CREATE OR REPLACE FUNCTION public.get_post_stats(post_id_param uuid)
RETURNS TABLE(likes_count bigint, comments_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.post_likes WHERE post_id = post_id_param) as likes_count,
    (SELECT COUNT(*) FROM public.post_comments WHERE post_id = post_id_param) as comments_count;
END;
$function$;

-- 5. Fix process_automatic_raffle_participation
CREATE OR REPLACE FUNCTION public.process_automatic_raffle_participation(p_user_id uuid, p_action_type text, p_trigger_id uuid DEFAULT NULL::uuid, p_business_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  raffle_record RECORD;
  entries_to_add INTEGER;
  existing_entry_id UUID;
BEGIN
  -- Buscar sorteios ativos que permitem esta ação
  FOR raffle_record IN
    SELECT r.* FROM raffles r
    WHERE r.is_active = true
      AND r.auto_participation = true
      AND r.end_date > now()
      AND (p_business_id IS NULL OR r.business_id = p_business_id)
      AND (
        (p_action_type = 'checkin' AND r.participation_rules->>'checkin' = 'true') OR
        (p_action_type = 'purchase' AND r.participation_rules->>'purchase' = 'true') OR
        (p_action_type IN ('like', 'share') AND r.participation_rules->>'offer_interaction' = 'true') OR
        (p_action_type = 'follow' AND r.participation_rules->>'follow_business' = 'true')
      )
  LOOP
    -- Calcular número de entradas baseado na ação
    entries_to_add := CASE 
      WHEN p_action_type = 'checkin' THEN 3
      WHEN p_action_type = 'purchase' THEN 5  
      WHEN p_action_type = 'like' THEN 1
      WHEN p_action_type = 'share' THEN 2
      WHEN p_action_type = 'follow' THEN 2
      ELSE 1
    END;

    -- Registrar participação automática (evitar duplicatas)
    INSERT INTO automatic_raffle_participations (
      user_id, raffle_id, trigger_action, trigger_id, entries_earned
    ) VALUES (
      p_user_id, raffle_record.id, p_action_type, p_trigger_id, entries_to_add
    ) ON CONFLICT (user_id, raffle_id, trigger_action, trigger_id) DO NOTHING;

    -- Verificar se o usuário já tem entrada no sorteio
    SELECT id INTO existing_entry_id
    FROM raffle_entries
    WHERE raffle_id = raffle_record.id AND user_id = p_user_id;

    IF existing_entry_id IS NOT NULL THEN
      -- Adicionar entradas à entrada existente
      UPDATE raffle_entries
      SET number_of_entries = number_of_entries + entries_to_add
      WHERE id = existing_entry_id;
    ELSE
      -- Criar nova entrada no sorteio
      INSERT INTO raffle_entries (raffle_id, user_id, number_of_entries)
      VALUES (raffle_record.id, p_user_id, entries_to_add);
    END IF;

    -- Atualizar contador de participantes no sorteio
    UPDATE raffles
    SET current_participants = (
      SELECT COUNT(DISTINCT user_id) FROM raffle_entries WHERE raffle_id = raffle_record.id
    )
    WHERE id = raffle_record.id;
  END LOOP;
END;
$function$;

-- 6. Fix process_payment_confirmation
CREATE OR REPLACE FUNCTION public.process_payment_confirmation(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_subscription public.business_subscriptions%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
BEGIN
  -- Buscar transação
  SELECT * INTO v_transaction FROM public.transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction not found');
  END IF;
  
  -- Se já foi processada, retornar
  IF v_transaction.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;
  
  -- Atualizar status da transação
  UPDATE public.transactions
  SET status = 'paid', paid_at = now()
  WHERE id = p_transaction_id;
  
  -- Atualizar ou criar assinatura
  IF v_transaction.subscription_id IS NOT NULL THEN
    SELECT * INTO v_subscription 
    FROM public.business_subscriptions 
    WHERE id = v_transaction.subscription_id;
    
    SELECT * INTO v_plan 
    FROM public.subscription_plans 
    WHERE id = v_subscription.plan_id;
    
    -- Atualizar assinatura
    UPDATE public.business_subscriptions
    SET 
      status = 'active',
      payment_status = 'active',
      payment_gateway = v_transaction.gateway,
      payment_method = v_transaction.payment_method,
      last_payment_at = now(),
      next_payment_at = now() + interval '1 month',
      current_period_start = now(),
      current_period_end = now() + interval '1 month'
    WHERE id = v_transaction.subscription_id;
  END IF;
  
  -- Criar notificação
  PERFORM public.create_notification(
    (SELECT owner_id FROM public.businesses WHERE id = v_transaction.business_id),
    'Pagamento Confirmado! 💳',
    'Seu pagamento de R$ ' || v_transaction.amount || ' foi confirmado e sua assinatura está ativa.',
    'payment_confirmed',
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'amount', v_transaction.amount,
      'gateway', v_transaction.gateway
    ),
    v_transaction.business_id
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Payment processed successfully');
END;
$function$;

-- 7. Fix transfer_points
CREATE OR REPLACE FUNCTION public.transfer_points(p_sender_id uuid, p_receiver_id uuid, p_amount integer, p_message text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sender_balance INTEGER;
  v_transfer_id UUID;
BEGIN
  -- Validar que não é para si mesmo
  IF p_sender_id = p_receiver_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não pode transferir pontos para si mesmo'
    );
  END IF;
  
  -- Validar quantidade positiva
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A quantidade deve ser maior que zero'
    );
  END IF;
  
  -- Calcular saldo do remetente
  SELECT COALESCE(SUM(points_earned), 0)
  INTO v_sender_balance
  FROM user_points
  WHERE user_id = p_sender_id;
  
  -- Validar saldo suficiente
  IF v_sender_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Saldo insuficiente'
    );
  END IF;
  
  -- Criar registro de transferência
  INSERT INTO points_transfers (sender_id, receiver_id, amount, message, status)
  VALUES (p_sender_id, p_receiver_id, p_amount, p_message, 'completed')
  RETURNING id INTO v_transfer_id;
  
  -- Débito para o remetente
  INSERT INTO user_points (user_id, points_earned, action_type, description)
  VALUES (
    p_sender_id,
    -p_amount,
    'donation',
    'Doação enviada para ' || (SELECT full_name FROM profiles WHERE user_id = p_receiver_id LIMIT 1)
  );
  
  -- Crédito para o receptor
  INSERT INTO user_points (user_id, points_earned, action_type, description)
  VALUES (
    p_receiver_id,
    p_amount,
    'donation',
    'Doação recebida de ' || (SELECT full_name FROM profiles WHERE user_id = p_sender_id LIMIT 1)
  );
  
  -- Atualizar total_points nos perfis
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM user_points
    WHERE user_id = p_sender_id
  )
  WHERE user_id = p_sender_id;
  
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM user_points
    WHERE user_id = p_receiver_id
  )
  WHERE user_id = p_receiver_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transferência realizada com sucesso',
    'transfer_id', v_transfer_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Erro ao processar transferência: ' || SQLERRM
  );
END;
$function$;

-- 8. Fix update_business_rating
CREATE OR REPLACE FUNCTION public.update_business_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update the business rating statistics
  UPDATE public.businesses
  SET 
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating), 1)
      FROM public.business_reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ), 0),
    total_reviews = COALESCE((
      SELECT COUNT(*)
      FROM public.business_reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ), 0)
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 9. Fix update_referral_on_payment
CREATE OR REPLACE FUNCTION public.update_referral_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Se pagamento foi confirmado e ainda não havia comissão
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Calcular comissão (chamando a função existente)
    PERFORM calculate_referral_commission();
  END IF;

  RETURN NEW;
END;
$function$;

-- 10. Fix validate_checkin (if exists)
CREATE OR REPLACE FUNCTION public.validate_checkin(p_qr_data jsonb, p_user_id uuid, p_lat numeric DEFAULT NULL, p_lng numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Redirect to the main processing function
  RETURN public.process_qr_validation(p_qr_data, p_user_id, p_lat, p_lng);
END;
$function$;