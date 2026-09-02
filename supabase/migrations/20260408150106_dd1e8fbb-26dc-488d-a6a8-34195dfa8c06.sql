
-- Create patrocinio_pix table
CREATE TABLE public.patrocinio_pix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.crowdfunding_campaigns(id),
  valor_total NUMERIC NOT NULL CHECK (valor_total > 0),
  valor_fundo NUMERIC NOT NULL DEFAULT 0,
  valor_beneficio NUMERIC NOT NULL DEFAULT 0,
  pontos_gerados INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
  transaction_id_pix TEXT UNIQUE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patrocinio_pix ENABLE ROW LEVEL SECURITY;

-- Business owners can view their own sponsorship payments
CREATE POLICY "Business owners can view own patrocinio_pix"
ON public.patrocinio_pix
FOR SELECT
USING (business_id IN (
  SELECT id FROM public.businesses WHERE owner_id = auth.uid()
));

-- Business owners can create sponsorship payments
CREATE POLICY "Business owners can insert patrocinio_pix"
ON public.patrocinio_pix
FOR INSERT
WITH CHECK (business_id IN (
  SELECT id FROM public.businesses WHERE owner_id = auth.uid()
));

-- Admins can manage all
CREATE POLICY "Admins can manage patrocinio_pix"
ON public.patrocinio_pix
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- System can update (for webhook/admin confirmation)
CREATE POLICY "System can update patrocinio_pix"
ON public.patrocinio_pix
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_patrocinio_pix_business ON public.patrocinio_pix(business_id);
CREATE INDEX idx_patrocinio_pix_status ON public.patrocinio_pix(status);
