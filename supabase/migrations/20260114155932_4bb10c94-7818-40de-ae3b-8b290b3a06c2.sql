-- Reativar os anunciantes inativos
UPDATE public.businesses 
SET is_active = true, updated_at = now()
WHERE id IN (
  'e62d901d-7751-4e1e-8220-ad9abf8251da',
  '82267810-34a9-4944-8140-765739c9eb4a'
);