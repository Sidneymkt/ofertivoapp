
-- Allow business owners to delete participants from their raffles
CREATE POLICY "Business owners can delete raffle entries"
  ON public.raffle_entries
  FOR DELETE
  USING (user_owns_raffle_business(raffle_id));

-- Allow admins to delete raffle entries
CREATE POLICY "Admins can delete raffle entries"
  ON public.raffle_entries
  FOR DELETE
  USING (is_admin());
