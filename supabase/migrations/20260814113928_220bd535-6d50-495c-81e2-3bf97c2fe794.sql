DROP POLICY IF EXISTS "Business owners can view customer profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_business_customer_profiles(p_business_id uuid, p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  phone text,
  city text,
  state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.phone, p.city, p.state
  FROM public.profiles p
  WHERE p.user_id = ANY(p_user_ids)
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id AND b.owner_id = auth.uid()
    )
    AND (
      EXISTS (SELECT 1 FROM public.offer_checkins oc WHERE oc.user_id = p.user_id AND oc.business_id = p_business_id)
      OR EXISTS (SELECT 1 FROM public.checkin_validations cv WHERE cv.user_id = p.user_id AND cv.business_id = p_business_id)
      OR EXISTS (SELECT 1 FROM public.favorites f JOIN public.offers o ON o.id = f.offer_id WHERE f.user_id = p.user_id AND o.business_id = p_business_id)
      OR EXISTS (SELECT 1 FROM public.offer_views ov JOIN public.offers o ON o.id = ov.offer_id WHERE ov.user_id = p.user_id AND o.business_id = p_business_id)
      OR EXISTS (SELECT 1 FROM public.crm_leads cl WHERE cl.user_id = p.user_id AND cl.business_id = p_business_id)
      OR EXISTS (SELECT 1 FROM public.offer_orders oo WHERE oo.consumer_id = p.user_id AND oo.business_id = p_business_id)
    );
$$;

REVOKE ALL ON FUNCTION public.get_business_customer_profiles(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_customer_profiles(uuid, uuid[]) TO authenticated, service_role;