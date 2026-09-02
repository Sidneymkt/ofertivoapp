GRANT SELECT ON public.sponsored_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsored_banners TO authenticated;
GRANT ALL ON public.sponsored_banners TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_banner_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_banner_click(uuid) TO anon, authenticated;