-- Fix update_campaign_points trigger function to use correct column and table
-- It should work with campaign_contributions.amount and update crowdfunding_campaigns.current_points

CREATE OR REPLACE FUNCTION public.update_campaign_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualiza os pontos atuais da vaquinha correspondente
  UPDATE public.crowdfunding_campaigns
  SET current_points = current_points + NEW.amount,
      updated_at = now()
  WHERE id = NEW.campaign_id;

  RETURN NEW;
END;
$function$;
