-- Allow platform admins to manage businesses regardless of is_active/owner
-- This fixes the issue where inactivated businesses disappear from the admin list.

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='businesses'
      AND policyname='Admins can read all businesses'
  ) THEN
    CREATE POLICY "Admins can read all businesses"
    ON public.businesses
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
          AND au.is_active = true
      )
    );
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='businesses'
      AND policyname='Admins can update businesses'
  ) THEN
    CREATE POLICY "Admins can update businesses"
    ON public.businesses
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
          AND au.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
          AND au.is_active = true
      )
    );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='businesses'
      AND policyname='Admins can delete businesses'
  ) THEN
    CREATE POLICY "Admins can delete businesses"
    ON public.businesses
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
          AND au.is_active = true
      )
    );
  END IF;
END $$;