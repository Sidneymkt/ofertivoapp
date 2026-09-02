-- Corrigir recursão infinita removendo políticas problemáticas e recriando de forma correta

-- Remover todas as políticas da tabela businesses
DROP POLICY IF EXISTS "Negócios são visíveis publicamente" ON businesses;
DROP POLICY IF EXISTS "Public can view basic business info" ON businesses;
DROP POLICY IF EXISTS "Authenticated users can view active businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can view own business" ON businesses;
DROP POLICY IF EXISTS "Users insert own business" ON businesses;
DROP POLICY IF EXISTS "Business owners can update own business" ON businesses;
DROP POLICY IF EXISTS "Admin users can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Admin users can update all businesses" ON businesses;

-- Criar políticas simples sem recursão
CREATE POLICY "Public read active businesses"
ON businesses FOR SELECT
USING (is_active = true);

CREATE POLICY "Business owners full access"
ON businesses FOR ALL
USING (owner_id = auth.uid());

CREATE POLICY "Business owners can insert"
ON businesses FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Remover e recriar políticas para offers
DROP POLICY IF EXISTS "Ofertas ativas são visíveis publicamente" ON offers;

CREATE POLICY "Public view active offers"
ON offers FOR SELECT
USING (is_active = true AND valid_until >= NOW() AND archived_at IS NULL AND deleted_at IS NULL);

-- Remover e recriar políticas para raffles
DROP POLICY IF EXISTS "Sorteios ativos são visíveis publicamente" ON raffles;

CREATE POLICY "Public view active raffles"
ON raffles FOR SELECT
USING (is_active = true AND end_date >= NOW());