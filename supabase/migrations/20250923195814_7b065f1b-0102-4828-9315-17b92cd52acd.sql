-- Fix infinite recursion in admin_users policies
-- First, drop existing policies that cause recursion
DROP POLICY IF EXISTS "Master admins can manage admin users" ON public.admin_users;

-- Create security definer function to check admin status safely
CREATE OR REPLACE FUNCTION public.get_current_user_admin_status()
RETURNS jsonb AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Use a direct query without RLS to avoid recursion
    SELECT role, is_active INTO admin_record
    FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;
    
    IF admin_record IS NULL THEN
        RETURN jsonb_build_object('is_admin', false, 'role', null, 'is_active', false);
    ELSE
        RETURN jsonb_build_object(
            'is_admin', true, 
            'role', admin_record.role, 
            'is_active', admin_record.is_active
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update the is_admin function to use the new security definer function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (public.get_current_user_admin_status()->>'is_admin')::boolean;
$$;

-- Create new policies that don't cause recursion
CREATE POLICY "Admin users can view admin table" ON public.admin_users
FOR SELECT USING (
    (public.get_current_user_admin_status()->>'role') = 'master' 
    AND (public.get_current_user_admin_status()->>'is_active')::boolean = true
);

CREATE POLICY "Admin users can insert admin table" ON public.admin_users
FOR INSERT WITH CHECK (
    (public.get_current_user_admin_status()->>'role') = 'master' 
    AND (public.get_current_user_admin_status()->>'is_active')::boolean = true
);

CREATE POLICY "Admin users can update admin table" ON public.admin_users
FOR UPDATE USING (
    (public.get_current_user_admin_status()->>'role') = 'master' 
    AND (public.get_current_user_admin_status()->>'is_active')::boolean = true
) WITH CHECK (
    (public.get_current_user_admin_status()->>'role') = 'master' 
    AND (public.get_current_user_admin_status()->>'is_active')::boolean = true
);

CREATE POLICY "Admin users can delete admin table" ON public.admin_users
FOR DELETE USING (
    (public.get_current_user_admin_status()->>'role') = 'master' 
    AND (public.get_current_user_admin_status()->>'is_active')::boolean = true
);

-- Update check_admin_status function to use security definer approach
CREATE OR REPLACE FUNCTION public.check_admin_status(check_user_id uuid)
RETURNS TABLE(role text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT au.role, au.is_active
  FROM public.admin_users au
  WHERE au.user_id = check_user_id
  AND au.is_active = true;
END;
$$;