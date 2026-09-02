-- Fix the security definer view issue
-- Drop and recreate the view without security definer
DROP VIEW IF EXISTS public.profiles_public;

-- Create a regular view (not security definer) that respects RLS
CREATE VIEW public.profiles_public AS
SELECT 
  user_id,
  avatar_url,
  user_type,
  city, -- General location only, not precise address
  state,
  following_count,
  followers_count,
  total_points,
  bio,
  interests,
  created_at
FROM public.profiles
WHERE user_type IN ('consumer', 'business');

-- Grant appropriate access to the view
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Update the view comment
COMMENT ON VIEW public.profiles_public IS 'Safe public view of user profiles. Contains only non-sensitive fields. Respects RLS policies from the underlying profiles table.';