DROP POLICY IF EXISTS "Business owners and test accounts can insert raffles" ON public.raffles;
CREATE POLICY "Business owners can insert raffles"
ON public.raffles
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);