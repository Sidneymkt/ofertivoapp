-- First, remove duplicate views keeping only the oldest one per user/offer
DELETE FROM offer_views a USING offer_views b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.offer_id = b.offer_id;

-- Create unique constraint to prevent duplicate views per user per offer
ALTER TABLE offer_views 
ADD CONSTRAINT unique_user_offer_view UNIQUE (user_id, offer_id);

-- Sync views_count with actual data from offer_views
UPDATE offers o
SET views_count = (
  SELECT COUNT(*)
  FROM offer_views ov
  WHERE ov.offer_id = o.id
);

-- Enable realtime for offer_views table
ALTER TABLE offer_views REPLICA IDENTITY FULL;