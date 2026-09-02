
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own reviews" ON public.reviews;

-- Create separate policies for each operation
CREATE POLICY "Users can view all reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = user_id);
