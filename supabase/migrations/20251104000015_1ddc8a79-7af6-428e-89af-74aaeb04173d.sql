-- Adicionar RLS policy para permitir que a função insira contribuições
CREATE POLICY "System can insert campaign contributions"
ON campaign_contributions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Adicionar policy para permitir visualização pública de contribuições (exceto anônimas)
CREATE POLICY "Anyone can view public contributions"
ON campaign_contributions FOR SELECT
TO public
USING (NOT is_anonymous OR contributor_id = auth.uid());