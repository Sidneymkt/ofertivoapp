-- Create campaigns table for crowdfunding (vaquinhas)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  goal_points INTEGER NOT NULL CHECK (goal_points > 0),
  current_points INTEGER NOT NULL DEFAULT 0 CHECK (current_points >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_creator_id ON public.campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON public.campaigns(is_active);

-- Create campaign_contributions table to track individual contributions
CREATE TABLE IF NOT EXISTS public.campaign_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points > 0),
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for contributions
CREATE INDEX IF NOT EXISTS idx_contributions_campaign_id ON public.campaign_contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contributions_contributor_id ON public.campaign_contributions(contributor_id);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
-- Everyone can view active campaigns
CREATE POLICY "Anyone can view active campaigns"
  ON public.campaigns
  FOR SELECT
  USING (is_active = true);

-- Users can view their own campaigns (even inactive ones)
CREATE POLICY "Users can view their own campaigns"
  ON public.campaigns
  FOR SELECT
  USING (auth.uid() = creator_id);

-- Authenticated users can create campaigns
CREATE POLICY "Authenticated users can create campaigns"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own campaigns
CREATE POLICY "Users can update their own campaigns"
  ON public.campaigns
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- Users can delete their own campaigns
CREATE POLICY "Users can delete their own campaigns"
  ON public.campaigns
  FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS Policies for campaign_contributions
-- Everyone can view contributions to active campaigns
CREATE POLICY "Anyone can view contributions"
  ON public.campaign_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_contributions.campaign_id 
      AND campaigns.is_active = true
    )
  );

-- Authenticated users can create contributions
CREATE POLICY "Authenticated users can contribute"
  ON public.campaign_contributions
  FOR INSERT
  WITH CHECK (auth.uid() = contributor_id);

-- Function to update campaign current_points
CREATE OR REPLACE FUNCTION update_campaign_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.campaigns
  SET current_points = current_points + NEW.points,
      updated_at = now()
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update campaign points when contribution is added
CREATE TRIGGER trigger_update_campaign_points
  AFTER INSERT ON public.campaign_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_points();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for campaigns updated_at
CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();