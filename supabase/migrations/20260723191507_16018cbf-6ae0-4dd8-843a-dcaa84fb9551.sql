REVOKE ALL ON FUNCTION public.get_active_platform_pix_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_platform_pix_key() TO service_role;

REVOKE ALL ON FUNCTION public.create_platform_pix_donation(numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_platform_pix_donation(numeric, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_platform_pix_sponsorship(uuid, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_platform_pix_sponsorship(uuid, numeric, uuid) TO authenticated, service_role;