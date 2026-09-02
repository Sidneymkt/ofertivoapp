-- Fix infinite recursion in RLS policies by dropping and recreating them properly

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin users can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admin users can update all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admin users can view all business subscriptions" ON public.business_subscriptions;
DROP POLICY IF EXISTS "Admin users can view all offers" ON public.offers;
DROP POLICY IF EXISTS "Admin users can view all offer checkins" ON public.offer_checkins;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;

-- Fix admin_users policies to prevent recursion
DROP POLICY IF EXISTS "Only master admins can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only master admins can view admin users" ON public.admin_users;

-- Create simple admin check function to avoid recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
$$;

-- Recreate admin_users policies using direct checks
CREATE POLICY "Master admins can manage admin users" ON public.admin_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au_check
    WHERE au_check.user_id = auth.uid() 
    AND au_check.role = 'master'
    AND au_check.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au_check
    WHERE au_check.user_id = auth.uid() 
    AND au_check.role = 'master'
    AND au_check.is_active = true
  )
);

-- Now create admin policies for other tables using the function
CREATE POLICY "Admin users can view all businesses" ON public.businesses
FOR SELECT
USING (is_admin());

CREATE POLICY "Admin users can update all businesses" ON public.businesses
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admin users can view all business subscriptions" ON public.business_subscriptions
FOR SELECT
USING (is_admin());

CREATE POLICY "Admin users can view all offers" ON public.offers
FOR SELECT
USING (is_admin());

CREATE POLICY "Admin users can view all offer checkins" ON public.offer_checkins
FOR SELECT
USING (is_admin());

CREATE POLICY "Admin users can view all profiles" ON public.profiles
FOR SELECT
USING (is_admin());

-- Admin users can view all raffles
CREATE POLICY "Admin users can view all raffles" ON public.raffles
FOR SELECT
USING (is_admin());

CREATE POLICY "Admin users can update all raffles" ON public.raffles
FOR UPDATE
USING (is_admin());

-- Admin users can view all raffle entries
CREATE POLICY "Admin users can view all raffle entries" ON public.raffle_entries
FOR SELECT
USING (is_admin());

-- Admin users can view all user badges
CREATE POLICY "Admin users can view all user badges" ON public.user_badges
FOR SELECT
USING (is_admin());

-- Admin users can view all notifications
CREATE POLICY "Admin users can view all notifications" ON public.notifications
FOR SELECT
USING (is_admin());