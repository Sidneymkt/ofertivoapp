-- Tabela de leads do CRM Kanban
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'interessado', 'cliente', 'perdido')),
  origem TEXT NOT NULL DEFAULT 'checkin' CHECK (origem IN ('checkin', 'comentario', 'favorito', 'sorteio', 'mensagem', 'follow')),
  ultima_interacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  score_engajamento INTEGER NOT NULL DEFAULT 0,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  inativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_crm_leads_business_id ON public.crm_leads(business_id);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(business_id, status);
CREATE INDEX idx_crm_leads_ultima_interacao ON public.crm_leads(ultima_interacao DESC);

-- RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their leads"
ON public.crm_leads FOR SELECT
USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can insert leads"
ON public.crm_leads FOR INSERT
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can update their leads"
ON public.crm_leads FOR UPDATE
USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can delete their leads"
ON public.crm_leads FOR DELETE
USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "System can insert crm leads"
ON public.crm_leads FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update crm leads"
ON public.crm_leads FOR UPDATE
USING (true);

-- Tabela de alertas do CRM
CREATE TABLE public.crm_alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN ('lead_inativo', 'interessado_sem_acao', 'cliente_recorrente', 'novo_lead', 'reengajamento')),
  visualizado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_alertas_business ON public.crm_alertas(business_id);
CREATE INDEX idx_crm_alertas_lead ON public.crm_alertas(lead_id);

ALTER TABLE public.crm_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their alerts"
ON public.crm_alertas FOR SELECT
USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can update their alerts"
ON public.crm_alertas FOR UPDATE
USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "System can insert crm alerts"
ON public.crm_alertas FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can delete crm alerts"
ON public.crm_alertas FOR DELETE
USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();