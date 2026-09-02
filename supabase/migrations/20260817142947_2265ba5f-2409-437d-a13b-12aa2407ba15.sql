CREATE OR REPLACE FUNCTION public.check_and_award_badges(user_id_param uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() = 0
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> user_id_param
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM public.check_and_award_badges_internal(user_id_param);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_award_business_badges(business_id_param uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() = 0
     AND auth.uid() IS NOT NULL
     AND NOT public.user_owns_business(business_id_param)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM public.check_and_award_business_badges_internal(business_id_param);
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_special_badge(user_id_param uuid, badge_name_param text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() = 0 AND auth.uid() IS NOT NULL AND NOT public.is_admin()
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to award badges';
  END IF;
  PERFORM public.award_special_badge_internal(user_id_param, badge_name_param);
END;
$function$;