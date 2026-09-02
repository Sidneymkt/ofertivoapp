DROP POLICY IF EXISTS "Consumers can create own PIX orders" ON public.offer_orders;

REVOKE INSERT ON public.offer_orders FROM authenticated;
GRANT SELECT, UPDATE ON public.offer_orders TO authenticated;
GRANT ALL ON public.offer_orders TO service_role;