-- Drop the existing constraint
ALTER TABLE offers DROP CONSTRAINT offers_offer_type_check;

-- Add the new constraint with min-purchase included
ALTER TABLE offers ADD CONSTRAINT offers_offer_type_check 
CHECK (offer_type = ANY (ARRAY['standard'::text, 'exclusive'::text, 'first_time'::text, 'flash'::text, 'first-use'::text, 'checkin'::text, 'combo'::text, 'min-purchase'::text]));