
CREATE TABLE IF NOT EXISTS public.sponsored_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  cta_label TEXT DEFAULT 'Ver oferta',
  internal_link TEXT,
  external_link TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  target_city TEXT,
  target_neighborhood TEXT,
  target_category TEXT,
  target_user_type TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsored_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sponsored_banners TO authenticated;
GRANT ALL ON public.sponsored_banners TO service_role;

ALTER TABLE public.sponsored_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.sponsored_banners
  FOR SELECT USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Admins select banners" ON public.sponsored_banners
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins insert banners" ON public.sponsored_banners
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update banners" ON public.sponsored_banners
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete banners" ON public.sponsored_banners
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.update_sponsored_banners_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sponsored_banners_updated_at ON public.sponsored_banners;
CREATE TRIGGER trg_sponsored_banners_updated_at
BEFORE UPDATE ON public.sponsored_banners
FOR EACH ROW EXECUTE FUNCTION public.update_sponsored_banners_updated_at();

CREATE OR REPLACE FUNCTION public.increment_banner_view(banner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.sponsored_banners SET views_count = COALESCE(views_count,0) + 1 WHERE id = banner_id; END; $$;

CREATE OR REPLACE FUNCTION public.increment_banner_click(banner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.sponsored_banners SET clicks_count = COALESCE(clicks_count,0) + 1 WHERE id = banner_id; END; $$;

REVOKE EXECUTE ON FUNCTION public.increment_banner_view(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_banner_click(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_banner_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_banner_click(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_sponsored_banners_active ON public.sponsored_banners (is_active, priority DESC, created_at DESC);
