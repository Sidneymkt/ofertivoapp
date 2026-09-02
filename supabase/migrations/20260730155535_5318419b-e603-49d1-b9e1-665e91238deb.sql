-- 1. update_user_points: only admins or internal triggers
CREATE OR REPLACE FUNCTION public.update_user_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND pg_trigger_depth() = 0 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to award points';
  END IF;
  PERFORM public.update_user_points_internal(user_id, points_to_add);
END;
$function$;

-- 2. award_special_badge: only admins or internal triggers
CREATE OR REPLACE FUNCTION public.award_special_badge(user_id_param uuid, badge_name_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND pg_trigger_depth() = 0 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to award badges';
  END IF;
  PERFORM public.award_special_badge_internal(user_id_param, badge_name_param);
END;
$function$;

-- 3. get_raffle_participants: redact phone unless owner/admin
CREATE OR REPLACE FUNCTION public.get_raffle_participants(raffle_id_param uuid)
RETURNS TABLE(id uuid, user_id uuid, raffle_id uuid, entry_number integer, number_of_entries integer, created_at timestamp with time zone, full_name text, phone text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_privileged boolean;
BEGIN
  v_privileged := public.user_owns_raffle_business(raffle_id_param) OR public.is_admin();

  RETURN QUERY
  SELECT
    re.id,
    re.user_id,
    re.raffle_id,
    re.entry_number,
    re.number_of_entries,
    re.created_at,
    COALESCE(p.full_name, 'Participante') AS full_name,
    CASE WHEN v_privileged THEN p.phone ELSE NULL END AS phone,
    p.avatar_url
  FROM public.raffle_entries re
  LEFT JOIN public.profiles p ON p.user_id = re.user_id
  WHERE re.raffle_id = raffle_id_param
  ORDER BY re.entry_number ASC;
END;
$function$;

-- 4. Banner counters: no anonymous execution
REVOKE EXECUTE ON FUNCTION public.increment_banner_click(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_banner_view(uuid) FROM anon;

-- 5. community_highlights: only active rows readable
DROP POLICY IF EXISTS "Anyone can view active highlights" ON public.community_highlights;
CREATE POLICY "Anyone can view active highlights"
ON public.community_highlights
FOR SELECT
TO authenticated
USING (ativo = true);

-- 6. user_badges: restrict public exposure
DROP POLICY IF EXISTS "Users can view public badges" ON public.user_badges;
CREATE POLICY "Authenticated users can view unlocked badges"
ON public.user_badges
FOR SELECT
TO authenticated
USING (is_unlocked = true OR user_id = auth.uid());

REVOKE SELECT ON public.user_badges FROM anon;
REVOKE SELECT ON public.community_highlights FROM anon;