ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS offer_type text NOT NULL DEFAULT 'standard';
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_offer_type_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_offer_type_check
CHECK (offer_type = ANY (ARRAY['standard'::text,'exclusive'::text,'first_time'::text,'flash'::text,'first-use'::text,'checkin'::text,'combo'::text]));

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS custom_mascot_url text;

ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS ticket_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS total_tickets integer;
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS sold_tickets integer NOT NULL DEFAULT 0;

ALTER TABLE public.raffle_entries ADD COLUMN IF NOT EXISTS number_of_entries integer NOT NULL DEFAULT 1;