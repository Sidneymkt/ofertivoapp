DROP POLICY IF EXISTS "Anyone can view contributions" ON public.campaign_contributions;
CREATE POLICY "View non-anonymous contributions or own"
ON public.campaign_contributions
FOR SELECT
USING (
  (NOT COALESCE(is_anonymous, false))
  OR contributor_id = auth.uid()
);