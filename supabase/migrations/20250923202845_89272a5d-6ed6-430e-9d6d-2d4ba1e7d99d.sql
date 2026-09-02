-- Fix security vulnerability: Restrict public access to profiles table
-- Remove ONLY the dangerous "Anyone can view public profiles" policy
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

-- Create a safe public view that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  user_id,
  avatar_url,
  user_type,
  city,
  state,
  following_count,
  followers_count,
  total_points,
  bio,
  interests,
  created_at
FROM public.profiles;

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Add a comment to document the security fix
COMMENT ON TABLE public.profiles IS 'SECURITY: Sensitive fields (phone, address, full_name, longitude, latitude) are now protected. Use profiles_public view for safe public access to non-sensitive fields only.';

COMMENT ON VIEW public.profiles_public IS 'Safe public view of profiles containing only non-sensitive fields. Use this instead of direct profiles table access for public data.';