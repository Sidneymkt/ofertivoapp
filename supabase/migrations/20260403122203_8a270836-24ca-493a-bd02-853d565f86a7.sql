
-- Create donations_pix table
CREATE TABLE public.donations_pix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'consumidor' CHECK (user_type IN ('consumidor', 'anunciante')),
  valor_total NUMERIC(10,2) NOT NULL CHECK (valor_total > 0),
  valor_convertido_pontos NUMERIC(10,2) NOT NULL,
  valor_fundo NUMERIC(10,2) NOT NULL,
  pontos_gerados INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  transaction_id_pix TEXT UNIQUE,
  campaign_id UUID REFERENCES public.crowdfunding_campaigns(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations_pix ENABLE ROW LEVEL SECURITY;

-- Users can view their own donations
CREATE POLICY "Users can view own donations"
  ON public.donations_pix FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own donations
CREATE POLICY "Users can create own donations"
  ON public.donations_pix FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
  ON public.donations_pix FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Admins can update donations (confirm/cancel)
CREATE POLICY "Admins can update donations"
  ON public.donations_pix FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Index for performance
CREATE INDEX idx_donations_pix_user_id ON public.donations_pix(user_id);
CREATE INDEX idx_donations_pix_status ON public.donations_pix(status);
CREATE INDEX idx_donations_pix_created_at ON public.donations_pix(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_donations_pix_updated_at
  BEFORE UPDATE ON public.donations_pix
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
