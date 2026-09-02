-- Restrict fabricated inserts on ledger/referral tables to service_role only
DROP POLICY IF EXISTS "Anyone can insert movimentacoes" ON public.fundo_social_movimentacoes;
DROP POLICY IF EXISTS "Public can insert movimentacoes" ON public.fundo_social_movimentacoes;
DROP POLICY IF EXISTS "Enable insert for all" ON public.fundo_social_movimentacoes;
DROP POLICY IF EXISTS "fundo_social_movimentacoes_insert" ON public.fundo_social_movimentacoes;
CREATE POLICY "Only service role can insert fundo movimentacoes"
  ON public.fundo_social_movimentacoes FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert commissions" ON public.referral_commissions;
DROP POLICY IF EXISTS "Public can insert commissions" ON public.referral_commissions;
DROP POLICY IF EXISTS "Enable insert for all" ON public.referral_commissions;
DROP POLICY IF EXISTS "referral_commissions_insert" ON public.referral_commissions;
CREATE POLICY "Only service role can insert referral commissions"
  ON public.referral_commissions FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert tracking" ON public.referral_tracking;
DROP POLICY IF EXISTS "Public can insert tracking" ON public.referral_tracking;
DROP POLICY IF EXISTS "Enable insert for all" ON public.referral_tracking;
DROP POLICY IF EXISTS "referral_tracking_insert" ON public.referral_tracking;
CREATE POLICY "Only service role can insert referral tracking"
  ON public.referral_tracking FOR INSERT TO service_role WITH CHECK (true);