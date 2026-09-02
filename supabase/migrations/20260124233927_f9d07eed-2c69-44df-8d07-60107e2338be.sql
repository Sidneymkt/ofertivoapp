-- ========================================
-- FUNDO SOCIAL OFERTIVO - Sistema Completo
-- ========================================

-- 1. Tabela principal do Fundo Social
CREATE TABLE public.fundo_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saldo_disponivel NUMERIC NOT NULL DEFAULT 0,
  saldo_reservado NUMERIC NOT NULL DEFAULT 0,
  percentual_receita NUMERIC NOT NULL DEFAULT 10.00,
  total_arrecadado NUMERIC NOT NULL DEFAULT 0,
  total_liberado NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir registro inicial do fundo
INSERT INTO public.fundo_social (id, saldo_disponivel, saldo_reservado, percentual_receita, total_arrecadado, total_liberado)
VALUES (gen_random_uuid(), 0, 0, 10.00, 0, 0);

-- RLS para fundo_social
ALTER TABLE public.fundo_social ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fundo_social"
ON public.fundo_social FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Anyone can view fundo_social stats"
ON public.fundo_social FOR SELECT
USING (true);

-- 2. Tabela de movimentações do fundo
CREATE TABLE public.fundo_social_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'reserva', 'liberacao', 'cancelamento')),
  valor NUMERIC NOT NULL,
  origem TEXT, -- 'plano_assinatura', 'destaque', 'patrocinio', etc.
  origem_id UUID,
  campanha_id UUID REFERENCES public.crowdfunding_campaigns(id) ON DELETE SET NULL,
  descricao TEXT,
  comprovante_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para movimentacoes
ALTER TABLE public.fundo_social_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage movimentacoes"
ON public.fundo_social_movimentacoes FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Anyone can view movimentacoes"
ON public.fundo_social_movimentacoes FOR SELECT
USING (true);

CREATE POLICY "System can insert movimentacoes"
ON public.fundo_social_movimentacoes FOR INSERT
WITH CHECK (true);

-- 3. Tabela de beneficiários verificados
CREATE TABLE public.beneficiarios_verificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pessoa_fisica', 'instituicao')),
  nome TEXT NOT NULL,
  documento TEXT NOT NULL, -- CPF ou CNPJ
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  chave_pix TEXT,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  comprovante_documento_url TEXT,
  comprovante_social_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  notas_admin TEXT,
  user_id UUID, -- Quem cadastrou o beneficiário
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para beneficiários
ALTER TABLE public.beneficiarios_verificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage beneficiarios"
ON public.beneficiarios_verificados FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view approved beneficiarios"
ON public.beneficiarios_verificados FOR SELECT
USING (status = 'aprovado' OR user_id = auth.uid());

CREATE POLICY "Users can insert own beneficiarios"
ON public.beneficiarios_verificados FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending beneficiarios"
ON public.beneficiarios_verificados FOR UPDATE
USING (auth.uid() = user_id AND status = 'pendente');

-- 4. Tabela de patrocínios de vaquinhas
CREATE TABLE public.patrocinios_vaquinha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES public.crowdfunding_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('dobrar_pontos', 'valor_fixo', 'destaque')),
  valor_maximo NUMERIC,
  multiplicador NUMERIC DEFAULT 2,
  valor_patrocinado NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para patrocinios
ALTER TABLE public.patrocinios_vaquinha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active patrocinios"
ON public.patrocinios_vaquinha FOR SELECT
USING (is_active = true);

CREATE POLICY "Business owners can manage own patrocinios"
ON public.patrocinios_vaquinha FOR ALL
USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Admins can manage all patrocinios"
ON public.patrocinios_vaquinha FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 5. Adicionar colunas na tabela crowdfunding_campaigns
ALTER TABLE public.crowdfunding_campaigns 
ADD COLUMN IF NOT EXISTS beneficiario_id UUID REFERENCES public.beneficiarios_verificados(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tipo_beneficiario TEXT CHECK (tipo_beneficiario IN ('pessoa_fisica', 'instituicao', 'projeto_interno')),
ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'meta_atingida', 'validando', 'aprovado', 'pago', 'cancelado')),
ADD COLUMN IF NOT EXISTS valor_liberado NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_liberacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS comprovante_pagamento_url TEXT,
ADD COLUMN IF NOT EXISTS patrocinador_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS multiplicador_patrocinio NUMERIC DEFAULT 1;

-- 6. Função para calcular valor equivalente em reais (100 pontos = R$1)
CREATE OR REPLACE FUNCTION public.calcular_valor_equivalente(pontos INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN pontos / 100.0;
END;
$$;

-- 7. Função para processar meta atingida
CREATE OR REPLACE FUNCTION public.processar_meta_atingida(p_campanha_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campanha crowdfunding_campaigns%ROWTYPE;
  v_valor_reais NUMERIC;
  v_fundo fundo_social%ROWTYPE;
BEGIN
  -- Buscar campanha
  SELECT * INTO v_campanha FROM crowdfunding_campaigns WHERE id = p_campanha_id;
  
  IF v_campanha.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada');
  END IF;
  
  -- Verificar se meta foi atingida
  IF v_campanha.current_points < v_campanha.goal_points THEN
    RETURN jsonb_build_object('success', false, 'message', 'Meta ainda não foi atingida');
  END IF;
  
  -- Verificar se já foi processada
  IF v_campanha.status_pagamento IN ('meta_atingida', 'validando', 'aprovado', 'pago') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Campanha já foi processada');
  END IF;
  
  -- Calcular valor em reais
  v_valor_reais := v_campanha.current_points / 100.0;
  
  -- Buscar fundo social
  SELECT * INTO v_fundo FROM fundo_social LIMIT 1;
  
  -- Verificar saldo disponível
  IF v_fundo.saldo_disponivel < v_valor_reais THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Saldo insuficiente no Fundo Social',
      'saldo_disponivel', v_fundo.saldo_disponivel,
      'valor_necessario', v_valor_reais
    );
  END IF;
  
  -- Reservar valor no fundo
  UPDATE fundo_social SET
    saldo_disponivel = saldo_disponivel - v_valor_reais,
    saldo_reservado = saldo_reservado + v_valor_reais,
    updated_at = now()
  WHERE id = v_fundo.id;
  
  -- Registrar movimentação de reserva
  INSERT INTO fundo_social_movimentacoes (tipo, valor, campanha_id, descricao)
  VALUES ('reserva', v_valor_reais, p_campanha_id, 'Reserva para campanha: ' || v_campanha.title);
  
  -- Atualizar status da campanha
  UPDATE crowdfunding_campaigns SET
    status_pagamento = 'meta_atingida',
    updated_at = now()
  WHERE id = p_campanha_id;
  
  -- Notificar admin
  INSERT INTO notifications (user_id, type, title, message, related_id, metadata)
  SELECT au.user_id, 'campaign_goal_reached', 'Meta de Vaquinha Atingida! 🎯',
    'A campanha "' || v_campanha.title || '" atingiu a meta de ' || v_campanha.goal_points || ' pontos',
    p_campanha_id,
    jsonb_build_object('valor_reais', v_valor_reais, 'pontos', v_campanha.current_points)
  FROM admin_users au WHERE au.is_active = true;
  
  -- Notificar criador
  INSERT INTO notifications (user_id, type, title, message, related_id, metadata)
  VALUES (v_campanha.creator_id, 'campaign_goal_reached', 'Sua Vaquinha Atingiu a Meta! 🎉',
    'Parabéns! A campanha "' || v_campanha.title || '" atingiu a meta. Aguarde a validação.',
    p_campanha_id,
    jsonb_build_object('valor_reais', v_valor_reais, 'pontos', v_campanha.current_points));
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Meta processada com sucesso',
    'valor_reservado', v_valor_reais
  );
END;
$$;

-- 8. Função para liberar pagamento (admin)
CREATE OR REPLACE FUNCTION public.liberar_pagamento_vaquinha(
  p_campanha_id UUID,
  p_comprovante_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campanha crowdfunding_campaigns%ROWTYPE;
  v_valor_reais NUMERIC;
  v_fundo fundo_social%ROWTYPE;
BEGIN
  -- Verificar se é admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acesso negado');
  END IF;
  
  -- Buscar campanha
  SELECT * INTO v_campanha FROM crowdfunding_campaigns WHERE id = p_campanha_id;
  
  IF v_campanha.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada');
  END IF;
  
  -- Verificar status
  IF v_campanha.status_pagamento NOT IN ('meta_atingida', 'validando', 'aprovado') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Campanha não está pronta para liberação');
  END IF;
  
  -- Calcular valor
  v_valor_reais := v_campanha.current_points / 100.0;
  
  -- Buscar fundo
  SELECT * INTO v_fundo FROM fundo_social LIMIT 1;
  
  -- Verificar se valor está reservado
  IF v_fundo.saldo_reservado < v_valor_reais THEN
    RETURN jsonb_build_object('success', false, 'message', 'Valor não está reservado no fundo');
  END IF;
  
  -- Liberar do fundo
  UPDATE fundo_social SET
    saldo_reservado = saldo_reservado - v_valor_reais,
    total_liberado = total_liberado + v_valor_reais,
    updated_at = now()
  WHERE id = v_fundo.id;
  
  -- Registrar movimentação de liberação
  INSERT INTO fundo_social_movimentacoes (tipo, valor, campanha_id, descricao, comprovante_url, created_by)
  VALUES ('liberacao', v_valor_reais, p_campanha_id, 'Pagamento liberado: ' || v_campanha.title, p_comprovante_url, auth.uid());
  
  -- Atualizar campanha
  UPDATE crowdfunding_campaigns SET
    status_pagamento = 'pago',
    valor_liberado = v_valor_reais,
    data_liberacao = now(),
    comprovante_pagamento_url = p_comprovante_url,
    is_active = false,
    updated_at = now()
  WHERE id = p_campanha_id;
  
  -- Notificar criador
  INSERT INTO notifications (user_id, type, title, message, related_id, metadata)
  VALUES (v_campanha.creator_id, 'campaign_paid', 'Pagamento Liberado! 💰',
    'O pagamento de R$ ' || v_valor_reais || ' da campanha "' || v_campanha.title || '" foi realizado!',
    p_campanha_id,
    jsonb_build_object('valor_reais', v_valor_reais, 'comprovante', p_comprovante_url));
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pagamento liberado com sucesso',
    'valor_liberado', v_valor_reais
  );
END;
$$;

-- 9. Trigger para verificar meta atingida após contribuição
CREATE OR REPLACE FUNCTION public.check_campaign_goal_after_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campanha crowdfunding_campaigns%ROWTYPE;
BEGIN
  -- Buscar campanha atualizada
  SELECT * INTO v_campanha FROM crowdfunding_campaigns WHERE id = NEW.id;
  
  -- Verificar se meta foi atingida e ainda não processada
  IF v_campanha.current_points >= v_campanha.goal_points 
     AND v_campanha.status_pagamento = 'pendente' THEN
    PERFORM processar_meta_atingida(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_campaign_goal
AFTER UPDATE OF current_points ON crowdfunding_campaigns
FOR EACH ROW
WHEN (NEW.current_points >= NEW.goal_points AND OLD.current_points < NEW.goal_points)
EXECUTE FUNCTION check_campaign_goal_after_contribution();

-- 10. Função para alimentar o fundo a partir de assinaturas
CREATE OR REPLACE FUNCTION public.alimentar_fundo_social()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percentual NUMERIC;
  v_valor_plano NUMERIC;
  v_contribuicao NUMERIC;
BEGIN
  -- Apenas para pagamentos confirmados
  IF NEW.payment_status = 'active' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'active') THEN
    -- Buscar percentual configurado
    SELECT percentual_receita INTO v_percentual FROM fundo_social LIMIT 1;
    v_percentual := COALESCE(v_percentual, 10.00);
    
    -- Buscar valor do plano
    SELECT price_monthly INTO v_valor_plano FROM subscription_plans WHERE id = NEW.plan_id;
    
    IF v_valor_plano IS NOT NULL AND v_valor_plano > 0 THEN
      v_contribuicao := (v_valor_plano * v_percentual) / 100.0;
      
      -- Atualizar fundo
      UPDATE fundo_social SET
        saldo_disponivel = saldo_disponivel + v_contribuicao,
        total_arrecadado = total_arrecadado + v_contribuicao,
        updated_at = now();
      
      -- Registrar movimentação
      INSERT INTO fundo_social_movimentacoes (tipo, valor, origem, origem_id, descricao)
      VALUES ('entrada', v_contribuicao, 'plano_assinatura', NEW.id, 
        'Contribuição de ' || v_percentual || '% do plano');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_alimentar_fundo_social
AFTER INSERT OR UPDATE OF payment_status ON business_subscriptions
FOR EACH ROW
EXECUTE FUNCTION alimentar_fundo_social();

-- 11. Índices para performance
CREATE INDEX IF NOT EXISTS idx_fundo_movimentacoes_campanha ON fundo_social_movimentacoes(campanha_id);
CREATE INDEX IF NOT EXISTS idx_fundo_movimentacoes_tipo ON fundo_social_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_status ON beneficiarios_verificados(status);
CREATE INDEX IF NOT EXISTS idx_patrocinios_campanha ON patrocinios_vaquinha(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_pagamento ON crowdfunding_campaigns(status_pagamento);