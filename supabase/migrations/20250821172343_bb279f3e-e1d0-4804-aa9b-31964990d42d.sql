-- Add referral tracking to businesses table
ALTER TABLE public.businesses ADD COLUMN referred_by UUID REFERENCES auth.users(id);

-- Create referral settings table for commission configuration
CREATE TABLE public.referral_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral commissions table to track earnings
CREATE TABLE public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  subscription_id UUID REFERENCES public.business_subscriptions(id),
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  subscription_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_date TIMESTAMPTZ,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral stats table for aggregated data
CREATE TABLE public.referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0,
  total_commissions_earned DECIMAL(10,2) DEFAULT 0.00,
  total_commissions_paid DECIMAL(10,2) DEFAULT 0.00,
  total_commissions_pending DECIMAL(10,2) DEFAULT 0.00,
  last_commission_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referral_settings (admin only)
CREATE POLICY "Only admins can manage referral settings"
ON public.referral_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- Create RLS policies for referral_commissions
CREATE POLICY "Users can view their own commissions"
ON public.referral_commissions
FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert commissions"
ON public.referral_commissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all commissions"
ON public.referral_commissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- Create RLS policies for referral_stats
CREATE POLICY "Users can view their own stats"
ON public.referral_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage referral stats"
ON public.referral_stats
FOR ALL
USING (true);

-- Create function to calculate commission
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
$$ LANGUAGE plpgsql;

-- Create function to handle new subscription and generate commission
CREATE OR REPLACE FUNCTION handle_new_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Create trigger for new subscriptions
CREATE TRIGGER trigger_handle_new_subscription
  AFTER INSERT ON public.business_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_subscription();

-- Insert default referral settings for existing plans
INSERT INTO public.referral_settings (subscription_plan_id, commission_percentage, is_active)
SELECT id, 10.00, true
FROM public.subscription_plans
ON CONFLICT DO NOTHING;