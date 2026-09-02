-- Allow business owners to read favorites for their own offers (CRM)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'favorites'
      AND policyname = 'Business owners can view favorites for their offers'
  ) THEN
    CREATE POLICY "Business owners can view favorites for their offers"
    ON public.favorites
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.offers o
        JOIN public.businesses b ON b.id = o.business_id
        WHERE o.id = favorites.offer_id
          AND b.owner_id = auth.uid()
      )
    );
  END IF;
END;
$$;

-- Public RPC to fetch favorite count per offer without exposing who favorited
CREATE OR REPLACE FUNCTION public.get_offer_favorite_count(offer_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.favorites
  WHERE offer_id = offer_uuid;
$$;

GRANT EXECUTE ON FUNCTION public.get_offer_favorite_count(uuid) TO anon, authenticated;