-- Create function to update views_count on offers table
CREATE OR REPLACE FUNCTION public.update_offer_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE offers SET views_count = COALESCE(views_count, 0) + 1 WHERE id = NEW.offer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE offers SET views_count = GREATEST(COALESCE(views_count, 0) - 1, 0) WHERE id = OLD.offer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for offer_views
DROP TRIGGER IF EXISTS trigger_update_offer_views_count ON offer_views;
CREATE TRIGGER trigger_update_offer_views_count
AFTER INSERT OR DELETE ON offer_views
FOR EACH ROW
EXECUTE FUNCTION update_offer_views_count();

-- Create function to update likes_count on offers table
CREATE OR REPLACE FUNCTION public.update_offer_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE offers SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.offer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE offers SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.offer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for offer_likes
DROP TRIGGER IF EXISTS trigger_update_offer_likes_count ON offer_likes;
CREATE TRIGGER trigger_update_offer_likes_count
AFTER INSERT OR DELETE ON offer_likes
FOR EACH ROW
EXECUTE FUNCTION update_offer_likes_count();

-- Sync existing views_count from offer_views table
UPDATE offers o
SET views_count = (
  SELECT COUNT(*) FROM offer_views ov WHERE ov.offer_id = o.id
);

-- Sync existing likes_count from offer_likes table
UPDATE offers o
SET likes_count = (
  SELECT COUNT(*) FROM offer_likes ol WHERE ol.offer_id = o.id
);