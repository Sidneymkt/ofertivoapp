-- Permitir que visitantes vejam ofertas ativas
DROP POLICY IF EXISTS "Ofertas ativas são visíveis publicamente" ON offers;
CREATE POLICY "Ofertas ativas são visíveis publicamente"
ON offers FOR SELECT
USING (is_active = true AND valid_until >= NOW());

-- Permitir que visitantes vejam sorteios ativos
DROP POLICY IF EXISTS "Sorteios ativos são visíveis publicamente" ON raffles;
CREATE POLICY "Sorteios ativos são visíveis publicamente"
ON raffles FOR SELECT
USING (is_active = true AND end_date >= NOW());

-- Permitir que visitantes vejam informações de negócios
DROP POLICY IF EXISTS "Negócios são visíveis publicamente" ON businesses;
CREATE POLICY "Negócios são visíveis publicamente"
ON businesses FOR SELECT
USING (true);