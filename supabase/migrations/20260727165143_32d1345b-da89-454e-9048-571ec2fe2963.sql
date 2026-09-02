GRANT EXECUTE ON FUNCTION public.user_owns_raffle_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_raffle_business(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.user_owns_raffle_business(uuid) FROM anon;