-- Create triggers to automatically update followers/following counters (Clean version)

-- Function to update business followers count
CREATE OR REPLACE FUNCTION update_business_followers_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment followers count
    UPDATE businesses 
    SET followers_count = followers_count + 1
    WHERE id = NEW.business_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement followers count
    UPDATE businesses 
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.business_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for business follows
DROP TRIGGER IF EXISTS trigger_business_followers_count ON follows;
CREATE TRIGGER trigger_business_followers_count
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_business_followers_count();

-- Create triggers for user follows
DROP TRIGGER IF EXISTS trigger_user_follow_counts ON user_follows;
CREATE TRIGGER trigger_user_follow_counts
  AFTER INSERT OR DELETE ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_user_follow_counts();

-- Fix existing counters by recalculating them
UPDATE businesses 
SET followers_count = (
  SELECT COUNT(*) 
  FROM follows 
  WHERE follows.business_id = businesses.id
);

UPDATE profiles 
SET followers_count = (
  SELECT COUNT(*) 
  FROM user_follows 
  WHERE user_follows.following_id = profiles.user_id
);

UPDATE profiles 
SET following_count = (
  SELECT COUNT(*) 
  FROM user_follows 
  WHERE user_follows.follower_id = profiles.user_id
);