-- Allow admins to update offers (for featuring/unfeaturing)
CREATE POLICY "Admin users can update all offers"
ON public.offers
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Also ensure admin function exists and works
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$;