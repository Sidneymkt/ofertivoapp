-- Ajustar constraint de offer_type para aceitar valores antigos e novos
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_offer_type_check;

ALTER TABLE offers ADD CONSTRAINT offers_offer_type_check
CHECK (offer_type = ANY (ARRAY[
  'standard'::text,   -- legado
  'exclusive'::text,  -- legado
  'first_time'::text, -- legado
  'flash'::text,
  'first-use'::text,
  'checkin'::text,
  'combo'::text
]));