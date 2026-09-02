-- Allow business owners to view profiles of users who interacted with their business
CREATE POLICY "Business owners can view customer profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    -- Users who checked-in at business offers
    SELECT oc.user_id FROM public.offer_checkins oc
    JOIN public.businesses b ON b.id = oc.business_id
    WHERE b.owner_id = auth.uid()
    UNION
    -- Users who validated at business
    SELECT cv.user_id FROM public.checkin_validations cv
    JOIN public.businesses b ON b.id = cv.business_id
    WHERE b.owner_id = auth.uid()
    UNION
    -- Users who favorited business offers
    SELECT f.user_id FROM public.favorites f
    JOIN public.offers o ON o.id = f.offer_id
    JOIN public.businesses b ON b.id = o.business_id
    WHERE b.owner_id = auth.uid()
    UNION
    -- Users who viewed business offers
    SELECT ov.user_id FROM public.offer_views ov
    JOIN public.offers o ON o.id = ov.offer_id
    JOIN public.businesses b ON b.id = o.business_id
    WHERE b.owner_id = auth.uid()
  )
);