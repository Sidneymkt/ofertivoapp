
-- Ativar manualmente a assinatura do negócio ivaiqda@gmail.com
-- Atualizar a assinatura para ativa
UPDATE business_subscriptions
SET 
  status = 'active',
  payment_status = 'active',
  payment_gateway = 'abacatepay',
  payment_method = 'pix',
  last_payment_at = now(),
  next_payment_at = now() + interval '30 days',
  current_period_start = now(),
  current_period_end = now() + interval '30 days'
WHERE id = 'fe8f2c7f-1fce-4257-add0-cdb7466b85cc'
AND status = 'pending';

-- Atualizar a transação mais recente como paga
UPDATE transactions
SET 
  status = 'paid',
  paid_at = now(),
  transaction_fee = (amount * 0.0099) + 0.10,
  net_revenue = amount - ((amount * 0.0099) + 0.10)
WHERE business_id = '1a0b8e17-ed87-4ec7-a966-584da49702ca'
AND gateway = 'abacatepay'
AND status = 'pending'
AND id IN (
  SELECT id FROM transactions 
  WHERE business_id = '1a0b8e17-ed87-4ec7-a966-584da49702ca'
  ORDER BY created_at DESC 
  LIMIT 1
);
