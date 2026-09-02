-- Passo 1: Atualizar constraint do payment_gateway para incluir cakto
ALTER TABLE business_subscriptions DROP CONSTRAINT IF EXISTS business_subscriptions_payment_gateway_check;

ALTER TABLE business_subscriptions ADD CONSTRAINT business_subscriptions_payment_gateway_check 
CHECK (payment_gateway IS NULL OR payment_gateway = ANY (ARRAY['abacatepay'::text, 'mercadopago'::text, 'cakto'::text]));

-- Passo 2: Inserir assinatura do plano Start para EstandeMania via Cakto
INSERT INTO business_subscriptions (
  business_id, 
  plan_id, 
  status, 
  current_period_start, 
  current_period_end, 
  payment_gateway, 
  payment_status
)
VALUES (
  'ce75496d-1bfb-408b-a651-23779ad296ea',
  '216de0bc-89f5-4c00-9572-5f5f8ec5c577',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month',
  'cakto',
  'active'
);

-- Passo 3: Garantir que o business está ativo
UPDATE businesses 
SET is_active = true, updated_at = NOW()
WHERE id = 'ce75496d-1bfb-408b-a651-23779ad296ea';