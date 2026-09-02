-- Create function to check admin status
CREATE OR REPLACE FUNCTION public.check_admin_status(check_user_id UUID)
RETURNS TABLE(role TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT au.role, au.is_active
  FROM public.admin_users au
  WHERE au.user_id = check_user_id
  AND au.is_active = true;
END;
$$;