
CREATE TABLE public.offer_ai_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('post','story','a4','a3')),
  variation INT NOT NULL DEFAULT 1,
  image_url TEXT NOT NULL,
  pdf_url TEXT,
  params JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offer_ai_assets_offer ON public.offer_ai_assets(offer_id);
CREATE INDEX idx_offer_ai_assets_business ON public.offer_ai_assets(business_id);
CREATE INDEX idx_offer_ai_assets_created ON public.offer_ai_assets(created_at DESC);

ALTER TABLE public.offer_ai_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owner can view own ai assets"
  ON public.offer_ai_assets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Business owner can insert own ai assets"
  ON public.offer_ai_assets FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Business owner can delete own ai assets"
  ON public.offer_ai_assets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Admins can view all ai assets"
  ON public.offer_ai_assets FOR SELECT
  USING (public.is_admin());

CREATE TABLE public.ai_art_plan_limits (
  plan_key TEXT PRIMARY KEY,
  monthly_limit INT,
  variations_per_generation INT NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_art_plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai art limits"
  ON public.ai_art_plan_limits FOR SELECT USING (true);

CREATE POLICY "Admins manage ai art limits"
  ON public.ai_art_plan_limits FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.ai_art_plan_limits (plan_key, monthly_limit, variations_per_generation) VALUES
  ('free', 3, 1),
  ('start', 10, 2),
  ('pro', NULL, 2),
  ('premium', NULL, 3);

CREATE OR REPLACE FUNCTION public.get_ai_art_usage_this_month(p_business_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.offer_ai_assets
  WHERE business_id = p_business_id
    AND created_at >= date_trunc('month', now());
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-ai-assets', 'offer-ai-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view offer ai assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'offer-ai-assets');

CREATE POLICY "Authenticated can upload to own folder offer ai assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'offer-ai-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated can update own offer ai assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'offer-ai-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated can delete own offer ai assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'offer-ai-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
