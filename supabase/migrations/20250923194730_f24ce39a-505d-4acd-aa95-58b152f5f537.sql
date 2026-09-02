-- Add foreign key constraint between business_subscriptions and businesses
ALTER TABLE business_subscriptions 
ADD CONSTRAINT fk_business_subscriptions_business_id 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;