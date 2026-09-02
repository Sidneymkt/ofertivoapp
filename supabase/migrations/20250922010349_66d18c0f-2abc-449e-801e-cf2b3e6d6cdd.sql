-- Ensure business_reviews table exists for rating businesses
CREATE TABLE IF NOT EXISTS public.business_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Enable RLS on business_reviews
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for business_reviews
CREATE POLICY "Anyone can view business reviews" 
ON public.business_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own reviews" 
ON public.business_reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.business_reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.business_reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE TRIGGER update_business_reviews_updated_at
BEFORE UPDATE ON public.business_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add average_rating column to businesses table if not exists
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Create function to update business rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION public.update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the business rating statistics
  UPDATE public.businesses
  SET 
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating), 1)
      FROM public.business_reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ), 0),
    total_reviews = COALESCE((
      SELECT COUNT(*)
      FROM public.business_reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ), 0)
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for business rating updates
DROP TRIGGER IF EXISTS update_business_rating_on_insert ON public.business_reviews;
DROP TRIGGER IF EXISTS update_business_rating_on_update ON public.business_reviews;
DROP TRIGGER IF EXISTS update_business_rating_on_delete ON public.business_reviews;

CREATE TRIGGER update_business_rating_on_insert
AFTER INSERT ON public.business_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_business_rating();

CREATE TRIGGER update_business_rating_on_update
AFTER UPDATE ON public.business_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_business_rating();

CREATE TRIGGER update_business_rating_on_delete
AFTER DELETE ON public.business_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_business_rating();