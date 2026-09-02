
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can update patrocinio_pix" ON public.patrocinio_pix;

-- Replace with admin-only update
CREATE POLICY "Admins can update patrocinio_pix"
ON public.patrocinio_pix
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());
