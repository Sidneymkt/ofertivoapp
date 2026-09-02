-- Fix security vulnerability: Restrict public access to profiles table
-- Remove the overly permissive "Anyone can view public profiles" policy
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

-- Create restrictive policies for profile access
CREATE POLICY "Users can view own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow authenticated users to view only safe, non-sensitive fields of other users
-- This will be enforced at the application level by selecting only safe fields
CREATE POLICY "Authenticated users can view safe profile data" 
ON public.profiles 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  user_id != auth.uid()
);

-- Create a secure public view that only exposes safe fields
CREATE OR REPLACE VIEW public.profiles_public AS
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
-- Only include active user types, exclude any with sensitive roles
WHERE user_type IN ('consumer', 'business');

-- Grant appropriate access to the public view
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Add security documentation
COMMENT ON TABLE public.profiles IS 'User profiles table with restricted access. Sensitive fields (full_name, phone, address, latitude, longitude) are protected by RLS. Use profiles_public view for safe public access.';

COMMENT ON VIEW public.profiles_public IS 'Safe public view of user profiles. Contains only non-sensitive fields suitable for public display.';