CREATE TABLE IF NOT EXISTS public.offer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL,
  business_id uuid NOT NULL,
  consumer_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  points_to_award integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  tx_code text NOT NULL,
  consumer_phone text,
  crm_lead_id uuid,
  pix_key_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at timestamp with time zone,
  confirmed_by uuid,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.offer_orders TO authenticated;
GRANT ALL ON public.offer_orders TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offer_orders_status_check'
      AND conrelid = 'public.offer_orders'::regclass
  ) THEN
    ALTER TABLE public.offer_orders
      ADD CONSTRAINT offer_orders_status_check CHECK (status IN ('pendente', 'pago', 'cancelado'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offer_orders_amount_non_negative'
      AND conrelid = 'public.offer_orders'::regclass
  ) THEN
    ALTER TABLE public.offer_orders
      ADD CONSTRAINT offer_orders_amount_non_negative CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offer_orders_points_non_negative'
      AND conrelid = 'public.offer_orders'::regclass
  ) THEN
    ALTER TABLE public.offer_orders
      ADD CONSTRAINT offer_orders_points_non_negative CHECK (points_to_award >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS offer_orders_tx_code_idx ON public.offer_orders (tx_code);
CREATE INDEX IF NOT EXISTS offer_orders_business_status_created_idx ON public.offer_orders (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS offer_orders_consumer_created_idx ON public.offer_orders (consumer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS offer_orders_offer_idx ON public.offer_orders (offer_id);
CREATE INDEX IF NOT EXISTS offer_orders_crm_lead_idx ON public.offer_orders (crm_lead_id) WHERE crm_lead_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_offer_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offer_orders_updated_at ON public.offer_orders;
CREATE TRIGGER trg_offer_orders_updated_at
BEFORE UPDATE ON public.offer_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_offer_orders_updated_at();

ALTER TABLE public.offer_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consumers can create own PIX orders" ON public.offer_orders;
DROP POLICY IF EXISTS "Consumers can view own PIX orders" ON public.offer_orders;
DROP POLICY IF EXISTS "Business owners can view PIX orders" ON public.offer_orders;
DROP POLICY IF EXISTS "Business owners can manage PIX orders" ON public.offer_orders;
DROP POLICY IF EXISTS "Consumers can cancel pending own PIX orders" ON public.offer_orders;

CREATE POLICY "Consumers can create own PIX orders"
ON public.offer_orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = consumer_id
  AND status = 'pendente'
  AND public.user_owns_business(business_id, auth.uid()) IS FALSE
);

CREATE POLICY "Consumers can view own PIX orders"
ON public.offer_orders
FOR SELECT
TO authenticated
USING (auth.uid() = consumer_id);

CREATE POLICY "Business owners can view PIX orders"
ON public.offer_orders
FOR SELECT
TO authenticated
USING (public.user_owns_business(business_id, auth.uid()));

CREATE POLICY "Business owners can manage PIX orders"
ON public.offer_orders
FOR UPDATE
TO authenticated
USING (public.user_owns_business(business_id, auth.uid()))
WITH CHECK (public.user_owns_business(business_id, auth.uid()));

CREATE POLICY "Consumers can cancel pending own PIX orders"
ON public.offer_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = consumer_id AND status = 'pendente')
WITH CHECK (auth.uid() = consumer_id AND status = 'cancelado');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'offer_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_orders;
  END IF;
END $$;