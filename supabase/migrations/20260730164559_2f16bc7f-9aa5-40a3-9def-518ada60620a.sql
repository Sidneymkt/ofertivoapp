CREATE OR REPLACE FUNCTION public.update_user_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_id AND pg_trigger_depth() = 0 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to award points to another user';
  END IF;
  PERFORM public.update_user_points_internal(user_id, points_to_add);
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_special_badge(user_id_param uuid, badge_name_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND pg_trigger_depth() = 0 AND NOT public.is_admin()
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to award badges';
  END IF;
  PERFORM public.award_special_badge_internal(user_id_param, badge_name_param);
END;
$function$;