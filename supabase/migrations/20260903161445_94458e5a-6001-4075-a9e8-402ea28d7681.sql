CREATE OR REPLACE FUNCTION public.user_owns_business(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (b.id = p_a AND b.owner_id = p_b)
       OR (b.id = p_b AND b.owner_id = p_a)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.user_owns_business(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_owns_business(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_business(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_business(uuid) TO authenticated, service_role;