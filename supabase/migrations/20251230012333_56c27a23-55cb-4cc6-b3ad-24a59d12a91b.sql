
-- Recreate the view without SECURITY DEFINER by using a simple view
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  user_type,
  city,
  state,
  following_count,
  followers_count,
  total_points,
  bio,
  interests,
  phone,
  created_at
FROM public.profiles;

-- Grant access
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
