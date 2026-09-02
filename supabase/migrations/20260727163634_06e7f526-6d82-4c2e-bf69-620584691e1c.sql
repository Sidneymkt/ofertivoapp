GRANT SELECT ON public.raffles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffles TO authenticated;
GRANT ALL ON public.raffles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffle_entries TO authenticated;
GRANT ALL ON public.raffle_entries TO service_role;

GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;