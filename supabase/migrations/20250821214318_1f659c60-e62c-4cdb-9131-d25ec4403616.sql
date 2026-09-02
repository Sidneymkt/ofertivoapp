-- Update Premium plan to R$129 and 30 offers, and create Empresarial plan with unlimited offers and negotiable price

-- 1) Update existing Premium plan
UPDATE public.subscription_plans
SET 
  price_monthly = 129.00,
  max_offers = 30,
  features = '["Até 30 ofertas ativas", "CRM completo", "IA para otimização", "Suporte 24/7", "Análises avançadas"]'::jsonb,
  updated_at = now()
WHERE name = 'Premium';

-- 2) Create new Empresarial plan if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_plans WHERE name = 'Empresarial'
  ) THEN
    INSERT INTO public.subscription_plans (
      name, price_monthly, price_yearly, max_offers, max_views, max_raffles, features, created_at, updated_at
    ) VALUES (
      'Empresarial',
      0.00,              -- Valor a combinar (exibido como 0 no sistema)
      NULL,              -- Sem preço anual definido
      NULL,              -- Ofertas ilimitadas
      NULL,              -- Visualizações ilimitadas
      NULL,              -- Sorteios ilimitados
      '["Ofertas ilimitadas", "Preço a combinar", "Atendimento dedicado", "Relatórios e integrações avançadas", "Suporte 24/7 prioritário"]'::jsonb,
      now(),
      now()
    );
  END IF;
END $$;