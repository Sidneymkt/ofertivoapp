-- SECURITY FIX: Drop the overly permissive policy that allows any authenticated user to view all profile data
DROP POLICY IF EXISTS "Authenticated users can view safe profile data" ON public.profiles;

-- Create a more restrictive policy - users can only view their own profile data directly
-- Other users must use the profiles_public view which filters out sensitive columns
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure users can still update their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Ensure users can insert their own profile (for new user signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);