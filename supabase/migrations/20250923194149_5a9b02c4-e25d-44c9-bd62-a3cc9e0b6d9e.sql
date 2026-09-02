-- Temporarily allow admin access to businesses table for debugging
DROP POLICY IF EXISTS "Admin users can view all businesses" ON public.businesses;
CREATE POLICY "Admin users can view all businesses" 
ON public.businesses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Also ensure business owners can still see their own businesses
DROP POLICY IF EXISTS "Business owners can view own business" ON public.businesses;
CREATE POLICY "Business owners can view own business" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() = owner_id OR is_active = true);