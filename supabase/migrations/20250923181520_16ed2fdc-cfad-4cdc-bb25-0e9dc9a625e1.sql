-- Add admin access for existing user by email
-- This will make any user with the email 'sidneycampeao@gmail.com' an admin
INSERT INTO public.admin_users (user_id, role, is_active, permissions)
SELECT 
  id,
  'master',
  true,
  '{"all": true}'::jsonb
FROM auth.users 
WHERE email = 'sidneycampeao@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'master',
  is_active = true,
  permissions = '{"all": true}'::jsonb,
  updated_at = now();