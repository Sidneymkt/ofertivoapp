
-- 1. transfer_points: require caller = sender
CREATE OR REPLACE FUNCTION public.transfer_points(p_sender_id uuid, p_receiver_id uuid, p_amount integer, p_message text DEFAULT NULL::text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_sender_balance INTEGER; v_transfer_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
    RETURN json_build_object('success', false, 'message', 'Não autorizado');
  END IF;
  IF p_sender_id = p_receiver_id THEN
    RETURN json_build_object('success', false, 'message', 'Você não pode transferir pontos para si mesmo');
  END IF;
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'A quantidade deve ser maior que zero');
  END IF;
  SELECT COALESCE(SUM(points_earned), 0) INTO v_sender_balance FROM user_points WHERE user_id = p_sender_id;
  IF v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente');
  END IF;
  INSERT INTO points_transfers (sender_id, receiver_id, amount, message, status)
  VALUES (p_sender_id, p_receiver_id, p_amount, p_message, 'completed') RETURNING id INTO v_transfer_id;
  INSERT INTO user_points (user_id, points_earned, action_type, description)
  VALUES (p_sender_id, -p_amount, 'donation', 'Doação enviada para ' || COALESCE((SELECT full_name FROM profiles WHERE user_id = p_receiver_id LIMIT 1), 'usuário'));
  INSERT INTO user_points (user_id, points_earned, action_type, description)
  VALUES (p_receiver_id, p_amount, 'donation', 'Doação recebida de ' || COALESCE((SELECT full_name FROM profiles WHERE user_id = p_sender_id LIMIT 1), 'usuário'));
  UPDATE profiles SET total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM user_points WHERE user_id = p_sender_id) WHERE user_id = p_sender_id;
  UPDATE profiles SET total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM user_points WHERE user_id = p_receiver_id) WHERE user_id = p_receiver_id;
  RETURN json_build_object('success', true, 'message', 'Transferência realizada', 'transfer_id', v_transfer_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'Erro ao processar transferência');
END;
$$;

-- 2. update_user_points: only self or service_role
CREATE OR REPLACE FUNCTION public.update_user_points(user_id uuid, points_to_add integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::json->>'role' <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> update_user_points.user_id) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.profiles SET total_points = COALESCE(total_points,0) + points_to_add
   WHERE profiles.user_id = update_user_points.user_id;
END;
$$;

-- 3. Set search_path on mutable functions
ALTER FUNCTION public.calcular_valor_equivalente(integer) SET search_path = public;
ALTER FUNCTION public.ensure_single_default_address() SET search_path = public;
ALTER FUNCTION public.expire_pending_payments() SET search_path = public;
ALTER FUNCTION public.generate_business_slug(text, uuid) SET search_path = public;
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.get_date_from_timestamp(timestamptz) SET search_path = public;
ALTER FUNCTION public.get_offer_like_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_rarity_credits(text) SET search_path = public;
ALTER FUNCTION public.normalize_interest(text) SET search_path = public;
ALTER FUNCTION public.update_addresses_updated_at() SET search_path = public;
ALTER FUNCTION public.update_admin_updated_at() SET search_path = public;
ALTER FUNCTION public.update_business_points_wallet_updated_at() SET search_path = public;
ALTER FUNCTION public.update_community_posts_updated_at() SET search_path = public;
ALTER FUNCTION public.update_points_transfers_updated_at() SET search_path = public;
ALTER FUNCTION public.update_profile_updated_at() SET search_path = public;
ALTER FUNCTION public.update_transaction_updated_at() SET search_path = public;
ALTER FUNCTION public.update_validation_analytics_updated_at() SET search_path = public;

-- 4. Restrict SECURITY DEFINER function execute privileges
-- Revoke from anon on all definer functions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.prosecdef
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC', r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- Revoke from authenticated on trigger-typed definer functions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           JOIN pg_type t ON t.oid=p.prorettype
           WHERE n.nspname='public' AND p.prosecdef AND t.typname='trigger'
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated', r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 5. Tighten always-true write policies to service_role / authenticated
DROP POLICY IF EXISTS "System can insert transactions" ON public.achievement_credit_transactions;
CREATE POLICY "Service role inserts credit transactions" ON public.achievement_credit_transactions
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert analytics" ON public.business_analytics;
CREATE POLICY "Service role inserts analytics" ON public.business_analytics
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert crm alerts" ON public.crm_alertas;
CREATE POLICY "Service role inserts crm alerts" ON public.crm_alertas
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert crm leads" ON public.crm_leads;
CREATE POLICY "Service role inserts crm leads" ON public.crm_leads
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert sent records" ON public.email_funnel_sent;
CREATE POLICY "Service role inserts funnel sent" ON public.email_funnel_sent
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert interests" ON public.interests;
CREATE POLICY "Authenticated users can insert interests" ON public.interests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can update interests" ON public.interests;
CREATE POLICY "Service role updates interests" ON public.interests
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.offer_audit_log;
CREATE POLICY "Service role inserts audit logs" ON public.offer_audit_log
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert referral tracking" ON public.referral_tracking;
CREATE POLICY "Service role inserts referral tracking" ON public.referral_tracking
  FOR INSERT TO service_role WITH CHECK (true);

-- 6. Public bucket listing: drop broad SELECT on image-only buckets
-- (Files remain accessible via public URL endpoint; only bulk listing is blocked)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Business logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view user covers" ON storage.objects;
DROP POLICY IF EXISTS "Imagens de campanha são públicas" ON storage.objects;
DROP POLICY IF EXISTS "Imagens de sorteio são publicamente visíveis" ON storage.objects;
DROP POLICY IF EXISTS "Marketing media is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Offer images are publicly accessible" ON storage.objects;
