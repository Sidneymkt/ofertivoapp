
-- Create offer_views table to track user viewing history
CREATE TABLE public.offer_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.offer_views ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own history
CREATE POLICY "Users can view their own offer views" 
  ON public.offer_views 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting view records
CREATE POLICY "Users can insert their own offer views" 
  ON public.offer_views 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_offer_views_user_id ON public.offer_views(user_id);
CREATE INDEX idx_offer_views_offer_id ON public.offer_views(offer_id);
CREATE INDEX idx_offer_views_viewed_at ON public.offer_views(viewed_at DESC);
