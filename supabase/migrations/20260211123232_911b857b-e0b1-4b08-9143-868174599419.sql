-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Participants can view their raffles" ON public.raffles;

-- Recreate without recursion: use EXISTS with a direct check that doesn't trigger raffle_entries policies back to raffles
CREATE POLICY "Participants can view their raffles"
ON public.raffles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.raffle_entries re
    WHERE re.raffle_id = raffles.id
    AND re.user_id = auth.uid()
  )
);

-- Also fix raffle_entries policy that references raffles to avoid circular dependency
DROP POLICY IF EXISTS "raffle_entries_select_policy" ON public.raffle_entries;

-- Recreate raffle_entries select policy without referencing raffles table
CREATE POLICY "raffle_entries_select_policy"
ON public.raffle_entries
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
    AND b.id IN (SELECT r.business_id FROM public.raffles r WHERE r.id = raffle_entries.raffle_id)
  )
);