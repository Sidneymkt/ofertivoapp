
-- Drop existing view and recreate with full_name
DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE VIEW public.profiles_public AS
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

-- Grant select to all authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Create function to get raffle participants with names
CREATE OR REPLACE FUNCTION public.get_raffle_participants(raffle_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  raffle_id UUID,
  entry_number INTEGER,
  number_of_entries INTEGER,
  created_at TIMESTAMPTZ,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.id,
    re.user_id,
    re.raffle_id,
    re.entry_number,
    re.number_of_entries,
    re.created_at,
    COALESCE(p.full_name, 'Participante') as full_name,
    p.phone,
    p.avatar_url
  FROM public.raffle_entries re
  LEFT JOIN public.profiles p ON p.user_id = re.user_id
  WHERE re.raffle_id = raffle_id_param
  ORDER BY re.entry_number ASC;
END;
$$;
