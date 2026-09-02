-- Remove duplicate subscription plans, keeping only the first one of each name
WITH numbered_plans AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as row_num
  FROM subscription_plans
)
DELETE FROM subscription_plans 
WHERE id IN (
  SELECT id FROM numbered_plans WHERE row_num > 1
);