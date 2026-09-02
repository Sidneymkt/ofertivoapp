-- Adicionar coluna max_raffles para limitar quantidade de sorteios por plano
ALTER TABLE public.subscription_plans 
ADD COLUMN max_raffles integer DEFAULT NULL;

-- Atualizar os planos existentes com valores de exemplo
-- Plano básico: 2 sorteios, Premium: 10 sorteios, Ilimitado: NULL (sem limite)
UPDATE public.subscription_plans 
SET max_raffles = CASE 
  WHEN name ILIKE '%básico%' OR name ILIKE '%essencial%' THEN 2
  WHEN name ILIKE '%premium%' OR name ILIKE '%crescimento%' THEN 10
  WHEN name ILIKE '%ilimitado%' OR name ILIKE '%enterprise%' THEN NULL
  ELSE 5
END;