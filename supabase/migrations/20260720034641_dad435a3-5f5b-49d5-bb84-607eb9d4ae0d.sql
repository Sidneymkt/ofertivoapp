
DROP POLICY IF EXISTS "System can insert movimentacoes" ON public.fundo_social_movimentacoes;
CREATE POLICY "Service role can insert movimentacoes"
ON public.fundo_social_movimentacoes FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can check valid codes" ON public.manual_checkin_codes;
CREATE POLICY "Business owners can view their codes"
ON public.manual_checkin_codes FOR SELECT TO authenticated
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "System can insert commissions" ON public.referral_commissions;
