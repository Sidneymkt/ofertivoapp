-- Adicionar campos de arquivamento e auditoria à tabela offers
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Criar tabela de log de auditoria para ofertas
CREATE TABLE IF NOT EXISTS public.offer_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'archived', 'restored', 'deleted'
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  offer_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_offer_audit_log_offer_id ON public.offer_audit_log(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_audit_log_business_id ON public.offer_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_offer_audit_log_created_at ON public.offer_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_archived_at ON public.offers(archived_at) WHERE archived_at IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.offer_audit_log ENABLE ROW LEVEL SECURITY;

-- Política: Business owners podem ver logs de suas ofertas
CREATE POLICY "Business owners can view own offer logs"
ON public.offer_audit_log
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Política: Sistema pode inserir logs
CREATE POLICY "System can insert audit logs"
ON public.offer_audit_log
FOR INSERT
WITH CHECK (true);

-- Política: Admin users podem ver todos os logs
CREATE POLICY "Admin users can view all offer logs"
ON public.offer_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Função para registrar ações de auditoria
CREATE OR REPLACE FUNCTION public.log_offer_action(
  p_offer_id UUID,
  p_business_id UUID,
  p_action TEXT,
  p_offer_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.offer_audit_log (
    offer_id,
    business_id,
    action,
    performed_by,
    offer_data,
    metadata
  ) VALUES (
    p_offer_id,
    p_business_id,
    p_action,
    auth.uid(),
    p_offer_data,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Atualizar política de ofertas para excluir ofertas arquivadas e deletadas da visualização pública
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.offers;

CREATE POLICY "Anyone can view active non-archived offers"
ON public.offers
FOR SELECT
USING (
  is_active = true 
  AND archived_at IS NULL 
  AND deleted_at IS NULL
);