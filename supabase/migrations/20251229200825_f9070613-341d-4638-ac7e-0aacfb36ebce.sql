-- SECURITY FIX: Ensure validate_checkin has SET search_path = public
-- The previous migration may have failed to apply due to function signature mismatch

DROP FUNCTION IF EXISTS public.validate_checkin(jsonb, uuid, numeric, numeric);

CREATE FUNCTION public.validate_checkin(p_qr_data jsonb, p_user_id uuid, p_lat numeric DEFAULT NULL, p_lng numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Redirect to the main processing function
  RETURN public.process_qr_validation(p_qr_data, p_user_id, p_lat, p_lng);
END;
$function$;