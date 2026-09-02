-- Add checkin_points column to offers table
ALTER TABLE public.offers 
ADD COLUMN checkin_points integer DEFAULT 50 NOT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.offers.checkin_points IS 'Points awarded to users for checking in at this offer';

-- Create index for better performance on points queries
CREATE INDEX idx_offers_checkin_points ON public.offers(checkin_points);

-- Update validation analytics to track points more efficiently
ALTER TABLE public.validation_analytics 
ADD COLUMN average_points_per_checkin numeric DEFAULT 50.00;