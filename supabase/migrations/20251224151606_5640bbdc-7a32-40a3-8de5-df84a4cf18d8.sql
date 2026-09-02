
-- Add columns for manual featuring control
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_featured_recent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured_at timestamp with time zone;

-- Create index for featured queries
CREATE INDEX IF NOT EXISTS idx_offers_featured ON public.offers (is_featured, featured_order) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_offers_featured_recent ON public.offers (is_featured_recent, created_at DESC) WHERE is_featured_recent = true;
