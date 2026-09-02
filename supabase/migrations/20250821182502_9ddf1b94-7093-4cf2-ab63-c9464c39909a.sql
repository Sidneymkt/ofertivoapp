-- Update Essential plan price to R$ 29.00
UPDATE subscription_plans 
SET price_monthly = 29.00,
    updated_at = now()
WHERE name = 'Essencial';