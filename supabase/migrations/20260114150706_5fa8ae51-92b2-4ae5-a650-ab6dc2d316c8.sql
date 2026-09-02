-- Reativar os anunciantes inativos
UPDATE public.businesses 
SET is_active = true, updated_at = now()
WHERE id IN (
  'e62d901d-7751-4e1e-8220-ad9abf8251da',
  '82267810-34a9-4944-8140-765739c9eb4a'
);

-- Primeiro deletar assinaturas existentes (se houver) para evitar duplicatas
DELETE FROM public.business_subscriptions 
WHERE business_id IN (
  'e62d901d-7751-4e1e-8220-ad9abf8251da',
  '82267810-34a9-4944-8140-765739c9eb4a'
);

-- Inserir novas assinaturas ativas com payment_status correto
INSERT INTO public.business_subscriptions (
  business_id, 
  plan_id, 
  status, 
  current_period_start, 
  current_period_end,
  payment_status
)
VALUES 
  (
    'e62d901d-7751-4e1e-8220-ad9abf8251da',
    '79ab2559-cda6-424e-86ae-b4f76cd0d299',
    'active',
    now(),
    now() + interval '1 year',
    'active'
  ),
  (
    '82267810-34a9-4944-8140-765739c9eb4a',
    '18e3e94a-7b9b-4fb7-b70a-30145f636dad',
    'active',
    now(),
    now() + interval '1 year',
    'active'
  );