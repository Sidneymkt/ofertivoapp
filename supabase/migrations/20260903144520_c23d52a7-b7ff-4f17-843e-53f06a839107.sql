-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '[]',
  max_offers INTEGER,
  max_views INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

-- Insert default plans
INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, features, max_offers, max_views) VALUES
('Essencial', 25.00, 250.00, '["5 ofertas ativas", "Suporte básico", "Estatísticas básicas"]', 5, 1000),
('Pro', 59.00, 590.00, '["15 ofertas ativas", "CRM avançado", "Estatísticas detalhadas", "Suporte prioritário"]', 15, 5000),
('Premium', 119.00, 1190.00, '["Ofertas ilimitadas", "CRM completo", "IA para otimização", "Suporte 24/7", "Análises avançadas"]', NULL, NULL);

-- Create business subscriptions table
CREATE TABLE public.business_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_subscriptions TO authenticated;
GRANT ALL ON public.business_subscriptions TO service_role;

-- Create business analytics table for detailed tracking
CREATE TABLE public.business_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  offer_id UUID REFERENCES public.offers(id),
  event_type TEXT NOT NULL, -- 'view', 'click', 'conversion', 'share'
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_analytics TO authenticated;
GRANT ALL ON public.business_analytics TO service_role;

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

-- Add RLS policies
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Subscription plans are viewable by everyone
CREATE POLICY "Anyone can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (true);

-- Business owners can view their own subscription
CREATE POLICY "Business owners can view own subscription" 
ON public.business_subscriptions 
FOR SELECT 
USING (business_id IN (
  SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
));

-- Business owners can view their own analytics
CREATE POLICY "Business owners can view own analytics" 
ON public.business_analytics 
FOR SELECT 
USING (business_id IN (
  SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
));

-- System can insert analytics
CREATE POLICY "System can insert analytics" 
ON public.business_analytics 
FOR INSERT 
WITH CHECK (true);

-- Business owners can manage their own support tickets
CREATE POLICY "Business owners can manage own tickets" 
ON public.support_tickets 
FOR ALL 
USING (business_id IN (
  SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_subscriptions_updated_at
BEFORE UPDATE ON public.business_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();