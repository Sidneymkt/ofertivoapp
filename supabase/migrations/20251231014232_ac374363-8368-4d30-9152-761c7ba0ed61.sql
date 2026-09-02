-- Fix RLS for favorites so business owners can read favorites on their offers
-- Existing policies were RESTRICTIVE ("Permissive: No"), causing an unintended AND that blocked owners.

DO $$ BEGIN
  -- Drop existing policies if they exist
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Business owners can view favorites for their offers" ON public.favorites';
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites';
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Recreate policies as PERMISSIVE (default)

CREATE POLICY "Users can view own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view favorites for their offers"
ON public.favorites
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.offers o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = favorites.offer_id
      AND b.owner_id = auth.uid()
  )
);
