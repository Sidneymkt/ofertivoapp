-- Fix remaining database functions that lack proper search_path security
CREATE OR REPLACE FUNCTION public.before_insert_raffle_entries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  r public.raffles%ROWTYPE;
  max_entry int;
BEGIN
  SELECT * INTO r FROM public.raffles WHERE id = NEW.raffle_id;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Raffle not found';
  END IF;
  IF NOT COALESCE(r.is_active, true) OR now() > r.end_date THEN
    RAISE EXCEPTION 'Raffle is not active or has ended';
  END IF;
  IF r.max_participants IS NOT NULL AND COALESCE(r.current_participants,0) >= r.max_participants THEN
    RAISE EXCEPTION 'Raffle capacity reached';
  END IF;

  SELECT COALESCE(MAX(entry_number), 0) INTO max_entry FROM public.raffle_entries WHERE raffle_id = NEW.raffle_id;
  NEW.entry_number := max_entry + 1;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.after_insert_raffle_entries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.raffles
  SET current_participants = COALESCE(current_participants,0) + 1
  WHERE id = NEW.raffle_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;