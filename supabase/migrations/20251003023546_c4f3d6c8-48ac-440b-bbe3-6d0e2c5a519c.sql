-- Corrigir políticas RLS para manual_checkin_codes
DROP POLICY IF EXISTS "Negócios podem gerenciar seus próprios códigos" ON manual_checkin_codes;
DROP POLICY IF EXISTS "Usuários podem verificar códigos válidos" ON manual_checkin_codes;

-- Policy para anunciantes criarem códigos de seus negócios
CREATE POLICY "Business owners can create codes"
ON manual_checkin_codes
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Policy para anunciantes verem seus códigos
CREATE POLICY "Business owners can view own codes"
ON manual_checkin_codes
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Policy para sistema validar códigos
CREATE POLICY "System can validate codes"
ON manual_checkin_codes
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy para usuários verificarem códigos válidos (apenas leitura para validação)
CREATE POLICY "Users can check valid codes"
ON manual_checkin_codes
FOR SELECT
USING (NOT used AND expires_at > now());