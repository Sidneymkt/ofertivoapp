-- Add checkout_url to subscription_plans and wire Kiwify links
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS checkout_url text;

-- Update existing plans if they exist
UPDATE public.subscription_plans
SET price_monthly = 29, checkout_url = 'https://pay.kiwify.com.br/y0nB3Dh'
WHERE lower(name) = 'essencial';

UPDATE public.subscription_plans
SET price_monthly = 59, checkout_url = 'https://pay.kiwify.com.br/yM4gtAA'
WHERE lower(name) = 'pro';

UPDATE public.subscription_plans
SET price_monthly = 129, checkout_url = 'https://pay.kiwify.com.br/pf6qqNj'
WHERE lower(name) = 'premium';

-- Insert plans if they don't exist yet
INSERT INTO public.subscription_plans (name, price_monthly, features, checkout_url)
SELECT 'Essencial', 29, '[]'::jsonb, 'https://pay.kiwify.com.br/y0nB3Dh'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE lower(name) = 'essencial'
);

INSERT INTO public.subscription_plans (name, price_monthly, features, checkout_url)
SELECT 'Pro', 59, '[]'::jsonb, 'https://pay.kiwify.com.br/yM4gtAA'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE lower(name) = 'pro'
);

INSERT INTO public.subscription_plans (name, price_monthly, features, checkout_url)
SELECT 'Premium', 129, '[]'::jsonb, 'https://pay.kiwify.com.br/pf6qqNj'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE lower(name) = 'premium'
);
