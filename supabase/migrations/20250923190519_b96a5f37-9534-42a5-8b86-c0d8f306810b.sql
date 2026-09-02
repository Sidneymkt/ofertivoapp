-- Allow admin users to view all businesses
CREATE POLICY "Admin users can view all businesses" ON public.businesses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
  )
);

-- Allow admin users to update all businesses  
CREATE POLICY "Admin users can update all businesses" ON public.businesses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
  )
);

-- Allow admin users to view all business subscriptions
CREATE POLICY "Admin users can view all business subscriptions" ON public.business_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
  )
);

-- Allow admin users to view all offers
CREATE POLICY "Admin users can view all offers" ON public.offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
  )
);

-- Allow admin users to view all offer checkins
CREATE POLICY "Admin users can view all offer checkins" ON public.offer_checkins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
  )
);

-- Allow admin users to view all profiles
CREATE POLICY "Admin users can view all profiles" ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
  )
);