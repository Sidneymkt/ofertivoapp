DROP POLICY IF EXISTS "Users can view approved beneficiarios" ON public.beneficiarios_verificados;
DROP POLICY IF EXISTS "Owner or admin can view beneficiario" ON public.beneficiarios_verificados;
CREATE POLICY "Owner or admin can view beneficiario"
  ON public.beneficiarios_verificados
  FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "System can insert campaign contributions" ON public.campaign_contributions;
DROP POLICY IF EXISTS "Authenticated users can contribute" ON public.campaign_contributions;
CREATE POLICY "Authenticated users can contribute"
  ON public.campaign_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = contributor_id);

DROP POLICY IF EXISTS "System can validate codes" ON public.manual_checkin_codes;
CREATE POLICY "Business owners can validate own codes"
  ON public.manual_checkin_codes
  FOR UPDATE
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = manual_checkin_codes.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = manual_checkin_codes.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert checkins" ON public.offer_checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.offer_checkins;
CREATE POLICY "Users can insert their own checkins"
  ON public.offer_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert points" ON public.user_points;