-- Add policy to allow public view of offer_checkins for public profiles
CREATE POLICY "Public can view all offer_checkins for stats" 
ON public.offer_checkins
FOR SELECT
TO public
USING (true);

-- Add policy to allow public view of raffle_entries for public stats
CREATE POLICY "Public can view all raffle_entries for stats"
ON public.raffle_entries
FOR SELECT
TO public
USING (true);

-- Add policy to allow viewing all offers (including expired) for stats calculation
CREATE POLICY "Public can view all offers for stats"
ON public.offers
FOR SELECT
TO public
USING (true);