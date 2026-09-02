-- Adicionar o Plano Start (teste de 30 dias) se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Start') THEN
    INSERT INTO public.subscription_plans (
      name,
      price_monthly,
      price_yearly,
      max_offers,
      max_views,
      max_raffles,
      features
    ) VALUES (
      'Start',
      9.90,
      NULL,
      1,
      5000,
      1,
      '["✅ 1 oferta ativa", "🎁 1 sorteio ativo", "📅 Válido por 30 dias", "🗺️ Visibilidade no mapa e feed", "💬 Suporte básico", "📈 Upgrade fácil para planos mensais"]'::jsonb
    );
  ELSE
    UPDATE public.subscription_plans
    SET 
      price_monthly = 9.90,
      max_offers = 1,
      max_views = 5000,
      max_raffles = 1,
      features = '["✅ 1 oferta ativa", "🎁 1 sorteio ativo", "📅 Válido por 30 dias", "🗺️ Visibilidade no mapa e feed", "💬 Suporte básico", "📈 Upgrade fácil para planos mensais"]'::jsonb
    WHERE name = 'Start';
  END IF;
END $$;