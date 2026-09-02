-- Atualizar plano Start para 500 visualizações
UPDATE public.subscription_plans
SET max_views = 500
WHERE name = 'Start';