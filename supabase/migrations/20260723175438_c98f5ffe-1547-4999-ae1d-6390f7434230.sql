DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    COALESCE(user_type, 'consumer') NOT IN ('admin', 'master')
    OR public.is_admin()
  )
);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    COALESCE(user_type, 'consumer') NOT IN ('admin', 'master')
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Admins can manage all commissions" ON public.referral_commissions;
DROP POLICY IF EXISTS "Only admins can manage referral settings" ON public.referral_settings;

CREATE POLICY "Admins can manage all commissions"
ON public.referral_commissions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can manage referral settings"
ON public.referral_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can manage their own dashboard access" ON public.business_dashboard_access;
DROP POLICY IF EXISTS "Users can view their own dashboard access" ON public.business_dashboard_access;
DROP POLICY IF EXISTS "Business owners can view dashboard access" ON public.business_dashboard_access;
DROP POLICY IF EXISTS "Business owners can manage dashboard access" ON public.business_dashboard_access;
DROP POLICY IF EXISTS "Users can manage safe own dashboard access" ON public.business_dashboard_access;

CREATE POLICY "Users can view their own dashboard access"
ON public.business_dashboard_access
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view dashboard access"
ON public.business_dashboard_access
FOR SELECT
TO authenticated
USING (
  business_id IS NOT NULL
  AND public.user_owns_business(business_id, auth.uid())
);

CREATE POLICY "Users can manage safe own dashboard access"
ON public.business_dashboard_access
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  AND (
    business_id IS NULL
    OR public.user_owns_business(business_id, auth.uid())
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND (
    business_id IS NULL
    OR public.user_owns_business(business_id, auth.uid())
  )
);

CREATE POLICY "Business owners can manage dashboard access"
ON public.business_dashboard_access
FOR ALL
TO authenticated
USING (
  business_id IS NOT NULL
  AND public.user_owns_business(business_id, auth.uid())
)
WITH CHECK (
  business_id IS NOT NULL
  AND public.user_owns_business(business_id, auth.uid())
);