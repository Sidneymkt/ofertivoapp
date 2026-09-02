
-- Ajustar limites para nova estratégia: gratuito 2/mês, pagos ilimitados
UPDATE public.ai_art_plan_limits SET monthly_limit = 2, variations_per_generation = 1 WHERE plan_key = 'free';
UPDATE public.ai_art_plan_limits SET monthly_limit = NULL, variations_per_generation = 1 WHERE plan_key IN ('start','pro','premium');

-- Inserir limites para outros planos pagos existentes (Essencial, Empresarial)
INSERT INTO public.ai_art_plan_limits (plan_key, monthly_limit, variations_per_generation)
VALUES ('essencial', NULL, 1), ('empresarial', NULL, 1)
ON CONFLICT (plan_key) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit;

-- Adicionar coluna template em offer_ai_assets para rastrear qual template foi usado
ALTER TABLE public.offer_ai_assets ADD COLUMN IF NOT EXISTS template TEXT;

-- Tabela para rastrear usos de "Melhorar Texto com IA" (limite 3/mês free, ilimitado pago)
CREATE TABLE IF NOT EXISTS public.ai_text_improvement_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_text_improve_biz_month
  ON public.ai_text_improvement_usage (business_id, created_at);

ALTER TABLE public.ai_text_improvement_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their text improvement usage"
ON public.ai_text_improvement_usage FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);

CREATE POLICY "Business owners can insert their text improvement usage"
ON public.ai_text_improvement_usage FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
);

-- Função: contagem de usos de melhoria de texto no mês corrente
CREATE OR REPLACE FUNCTION public.get_ai_text_improvement_usage_this_month(p_business_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.ai_text_improvement_usage
  WHERE business_id = p_business_id
    AND created_at >= date_trunc('month', now());
$$;
