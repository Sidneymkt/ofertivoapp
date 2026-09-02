-- Create likes table for offers
CREATE TABLE IF NOT EXISTS public.offer_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- Enable Row Level Security
ALTER TABLE public.offer_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for offer likes
CREATE POLICY "Users can view all likes" 
ON public.offer_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own likes" 
ON public.offer_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.offer_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_offer_likes_user_id ON public.offer_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_likes_offer_id ON public.offer_likes(offer_id);

-- Add function to get like count for an offer
CREATE OR REPLACE FUNCTION get_offer_like_count(offer_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.offer_likes WHERE offer_id = offer_uuid;
$$ LANGUAGE sql STABLE;

-- Enable realtime for offer_likes table
ALTER TABLE public.offer_likes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_likes;