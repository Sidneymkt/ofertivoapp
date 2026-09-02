-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION calculate_referral_commission(
  business_id_param UUID,
  subscription_amount_param DECIMAL,
  plan_id_param UUID
) RETURNS DECIMAL AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix handle_new_subscription function
CREATE OR REPLACE FUNCTION handle_new_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;