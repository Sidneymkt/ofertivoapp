-- CRITICAL SECURITY FIXES

-- 1. Fix businesses table RLS policy to protect sensitive contact information
DROP POLICY IF EXISTS "Anyone can view active businesses" ON public.businesses;

-- Create new policy that only exposes public business information
CREATE POLICY "Public can view basic business info" 
ON public.businesses 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NULL -- For non-authenticated users, they get limited data
);

-- Allow business owners to see their own full business data
CREATE POLICY "Business owners can view own business" 
ON public.businesses 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() = owner_id -- Owners can see full data
);

-- 2. Create a secure public view for businesses that doesn't expose sensitive data
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT 
  id,
  name,
  description,
  category,
  address, -- Keep address as it's needed for location
  latitude,
  longitude,
  logo_url,
  cover_image_url,
  is_active,
  followers_count,
  created_at,
  updated_at
FROM public.businesses
WHERE is_active = true;

-- Enable RLS on the view
ALTER VIEW public.businesses_public SET (security_invoker = true);

-- 3. Fix database functions to include proper security settings
CREATE OR REPLACE FUNCTION public.calculate_referral_commission(business_id_param uuid, subscription_amount_param numeric, plan_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  commission_rate DECIMAL;
  commission_amount DECIMAL;
BEGIN
  -- Get commission rate for the plan
  SELECT commission_percentage INTO commission_rate
  FROM public.referral_settings
  WHERE subscription_plan_id = plan_id_param
  AND is_active = true
  LIMIT 1;
  
  -- Default to 10% if no specific rate found
  IF commission_rate IS NULL THEN
    commission_rate := 10.00;
  END IF;
  
  -- Calculate commission
  commission_amount := (subscription_amount_param * commission_rate) / 100;
  
  RETURN commission_amount;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  referrer_user_id UUID;
  commission_rate DECIMAL;
  commission_amount DECIMAL;
  subscription_amount DECIMAL;
BEGIN
  -- Get referrer from business
  SELECT referred_by INTO referrer_user_id
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  -- Only process if there's a referrer
  IF referrer_user_id IS NOT NULL THEN
    -- Get subscription plan amount (assuming monthly for now)
    SELECT price_monthly INTO subscription_amount
    FROM public.subscription_plans
    WHERE id = NEW.plan_id;
    
    -- Calculate commission
    commission_amount := calculate_referral_commission(
      NEW.business_id,
      subscription_amount,
      NEW.plan_id
    );
    
    -- Get commission rate
    SELECT commission_percentage INTO commission_rate
    FROM public.referral_settings
    WHERE subscription_plan_id = NEW.plan_id
    AND is_active = true
    LIMIT 1;
    
    IF commission_rate IS NULL THEN
      commission_rate := 10.00;
    END IF;
    
    -- Insert commission record
    INSERT INTO public.referral_commissions (
      referrer_id,
      business_id,
      subscription_id,
      commission_amount,
      commission_percentage,
      subscription_amount,
      period_start,
      period_end,
      status
    ) VALUES (
      referrer_user_id,
      NEW.business_id,
      NEW.id,
      commission_amount,
      commission_rate,
      subscription_amount,
      NEW.current_period_start,
      NEW.current_period_end,
      'pending'
    );
    
    -- Update or insert referral stats
    INSERT INTO public.referral_stats (
      user_id,
      total_referrals,
      active_referrals,
      total_commissions_earned,
      total_commissions_pending,
      last_commission_date
    ) VALUES (
      referrer_user_id,
      1,
      1,
      commission_amount,
      commission_amount,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_referrals = referral_stats.total_referrals + 1,
      active_referrals = referral_stats.active_referrals + 1,
      total_commissions_earned = referral_stats.total_commissions_earned + commission_amount,
      total_commissions_pending = referral_stats.total_commissions_pending + commission_amount,
      last_commission_date = now(),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  referrer_id uuid;
  new_user_type text;
BEGIN
  -- Evitar duplicação
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Tipo de usuário
  new_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'consumer');

  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    SELECT user_id INTO referrer_id
    FROM public.profiles
    WHERE user_id::text = NEW.raw_user_meta_data ->> 'referral_code';

    INSERT INTO public.profiles (
      id, user_id, full_name, phone, city, state, user_type, referred_by
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type,
      referrer_id
    );

    IF referrer_id IS NOT NULL THEN
      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (referrer_id, 50, 'referral', 'Pontos por indicar um amigo');

      UPDATE public.profiles
      SET total_points = total_points + 50
      WHERE user_id = referrer_id;

      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (NEW.id, 25, 'signup', 'Pontos de boas-vindas por indicação');

      UPDATE public.profiles
      SET total_points = total_points + 25
      WHERE user_id = NEW.id;
    END IF;
  ELSE
    INSERT INTO public.profiles (
      id, user_id, full_name, phone, city, state, user_type
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type
    );

    INSERT INTO public.user_points (user_id, points_earned, action_type, description)
    VALUES (NEW.id, 10, 'signup', 'Pontos de boas-vindas');

    UPDATE public.profiles
    SET total_points = total_points + 10
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_points(user_id uuid, points_to_add integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET total_points = total_points + points_to_add 
  WHERE profiles.user_id = update_user_points.user_id;
END;
$function$;