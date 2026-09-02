-- Drop and recreate the view without phone
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT user_id, full_name, avatar_url, user_type, city, state,
       following_count, followers_count, total_points, bio, interests, created_at
FROM public.profiles;