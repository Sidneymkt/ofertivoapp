-- Fix security warnings by recreating functions with search_path

-- Drop all dependent triggers first
DROP TRIGGER IF EXISTS trigger_update_campaign_points ON public.campaign_contributions;
DROP TRIGGER IF EXISTS trigger_campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS trigger_update_campaigns_updated_at ON public.crowdfunding_campaigns;

-- Drop and recreate functions with secure search_path
DROP FUNCTION IF EXISTS update_campaign_points() CASCADE;
CREATE OR REPLACE FUNCTION update_campaign_points()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaigns
  SET current_points = current_points + NEW.points,
      updated_at = now()
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS update_campaigns_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for campaigns table
CREATE TRIGGER trigger_update_campaign_points
  AFTER INSERT ON public.campaign_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_points();

CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Recreate trigger for crowdfunding_campaigns table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crowdfunding_campaigns') THEN
    CREATE TRIGGER trigger_update_campaigns_updated_at
      BEFORE UPDATE ON public.crowdfunding_campaigns
      FOR EACH ROW
      EXECUTE FUNCTION update_campaigns_updated_at();
  END IF;
END $$;