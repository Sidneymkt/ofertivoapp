-- Insert subscription plans if they don't exist
INSERT INTO subscription_plans (name, price_monthly, price_yearly, max_offers, max_views, features) VALUES
('Essencial', 25.00, 250.00, 5, 1000, '["5 ofertas ativas", "Suporte básico", "Estatísticas básicas"]'),
('Pro', 59.00, 590.00, 15, 5000, '["15 ofertas ativas", "CRM avançado", "Estatísticas detalhadas", "Suporte prioritário"]'),
('Premium', 119.00, 1190.00, NULL, NULL, '["Ofertas ilimitadas", "CRM completo", "IA para otimização", "Suporte 24/7", "Análises avançadas"]')
ON CONFLICT DO NOTHING;

-- Create business_subscriptions table policies if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'business_subscriptions' 
    AND policyname = 'Business owners can insert subscription'
  ) THEN
    CREATE POLICY "Business owners can insert subscription" 
    ON public.business_subscriptions 
    FOR INSERT 
    WITH CHECK (
      business_id IN (
        SELECT businesses.id 
        FROM businesses 
        WHERE businesses.owner_id = auth.uid()
      )
    );
  END IF;
END $$;