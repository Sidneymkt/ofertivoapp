DROP POLICY IF EXISTS "Public can view active business pix keys" ON public.business_pix_keys;
DROP POLICY IF EXISTS "Authenticated consumers can view active business pix keys" ON public.business_pix_keys;

DROP POLICY IF EXISTS "Owners view pix keys" ON public.business_pix_keys;
DROP POLICY IF EXISTS "Owners view own pix keys" ON public.business_pix_keys;

CREATE POLICY "Owners view own pix keys"
ON public.business_pix_keys
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id, auth.uid()));