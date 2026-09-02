
-- Allow winners to view their won raffles
CREATE POLICY "Winners can view their won raffles"
ON public.raffles
FOR SELECT
USING (winner_id = auth.uid());

-- Allow participants to view raffles they entered (even if inactive)
CREATE POLICY "Participants can view their raffles"
ON public.raffles
FOR SELECT
USING (
  id IN (
    SELECT raffle_id FROM public.raffle_entries WHERE user_id = auth.uid()
  )
);
