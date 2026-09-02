-- Create a security definer function to check if user owns business for a raffle
-- This breaks the circular RLS dependency between raffles and raffle_entries
CREATE OR REPLACE FUNCTION public.user_owns_raffle_business(p_raffle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.raffles r
    JOIN public.businesses b ON b.id = r.business_id
    WHERE r.id = p_raffle_id
    AND b.owner_id = auth.uid()
  );
$$;

-- Drop and recreate raffle_entries select policy using the function
DROP POLICY IF EXISTS "raffle_entries_select_policy" ON public.raffle_entries;

CREATE POLICY "raffle_entries_select_policy"
ON public.raffle_entries
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.user_owns_raffle_business(raffle_id)
);