-- Create addresses table for managing multiple addresses per user/business
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Address label/name
  label TEXT NOT NULL, -- Ex: 'Casa', 'Trabalho', 'Estabelecimento Principal'
  
  -- Full address fields
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Brasil',
  formatted_address TEXT NOT NULL,
  
  -- Geolocation
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT addresses_owner_check CHECK (
    (user_id IS NOT NULL AND business_id IS NULL) OR
    (user_id IS NULL AND business_id IS NOT NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_addresses_business_id ON public.addresses(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_addresses_default ON public.addresses(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_addresses_location ON public.addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_addresses_updated_at();

-- Trigger to ensure only one default address per user/business
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other default addresses for the same user/business
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.addresses
      SET is_default = false
      WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
    
    IF NEW.business_id IS NOT NULL THEN
      UPDATE public.addresses
      SET is_default = false
      WHERE business_id = NEW.business_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_address();

-- Enable Row Level Security
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addresses
CREATE POLICY "Users can view their own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can view their business addresses"
  ON public.addresses FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business owners can insert addresses for their businesses"
  ON public.addresses FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can update their business addresses"
  ON public.addresses FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can delete their business addresses"
  ON public.addresses FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );