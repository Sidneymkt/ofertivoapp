-- Fix the circular dependency by making the function SECURITY DEFINER
-- This allows it to bypass RLS when checking admin status

CREATE OR REPLACE FUNCTION public.get_current_user_admin_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Use a direct query - SECURITY DEFINER bypasses RLS
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
$$;