-- =============================================
-- SISTEMA DE CRÉDITOS POR CONQUISTAS
-- =============================================

-- 1. Tabela principal de créditos por conquistas
CREATE TABLE public.business_achievement_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- 2. Tabela de transações de créditos
CREATE TABLE public.achievement_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.business_badges(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  advantage_type TEXT,
  advantage_expires_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de vantagens ativas
CREATE TABLE public.business_active_advantages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  advantage_type TEXT NOT NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  credits_spent INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_achievement_credits_business ON public.business_achievement_credits(business_id);
CREATE INDEX idx_achievement_transactions_business ON public.achievement_credit_transactions(business_id);
CREATE INDEX idx_achievement_transactions_type ON public.achievement_credit_transactions(transaction_type);
CREATE INDEX idx_active_advantages_business ON public.business_active_advantages(business_id);
CREATE INDEX idx_active_advantages_active ON public.business_active_advantages(is_active) WHERE is_active = true;
CREATE INDEX idx_active_advantages_expires ON public.business_active_advantages(expires_at) WHERE is_active = true;

-- =============================================
-- FUNÇÕES
-- =============================================

-- Função para calcular créditos baseado na raridade
CREATE OR REPLACE FUNCTION public.get_rarity_credits(rarity TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE rarity
    WHEN 'common' THEN 100
    WHEN 'rare' THEN 250
    WHEN 'epic' THEN 500
    WHEN 'legendary' THEN 1000
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para creditar pontos quando conquista é desbloqueada
CREATE OR REPLACE FUNCTION public.award_achievement_credits()
RETURNS TRIGGER AS $$
DECLARE
  v_badge_rarity TEXT;
  v_credits INTEGER;
  v_current_total INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Só processa se está sendo desbloqueado agora
  IF NEW.is_unlocked = true AND (OLD.is_unlocked IS NULL OR OLD.is_unlocked = false) THEN
    -- Busca raridade do badge
    SELECT rarity INTO v_badge_rarity
    FROM public.business_badges
    WHERE id = NEW.badge_id;
    
    -- Calcula créditos
    v_credits := public.get_rarity_credits(v_badge_rarity);
    
    IF v_credits > 0 THEN
      -- Cria ou atualiza registro de créditos
      INSERT INTO public.business_achievement_credits (business_id, total_credits)
      VALUES (NEW.business_id, v_credits)
      ON CONFLICT (business_id) DO UPDATE
      SET total_credits = business_achievement_credits.total_credits + v_credits,
          updated_at = now()
      RETURNING total_credits INTO v_new_balance;
      
      -- Registra transação
      INSERT INTO public.achievement_credit_transactions (
        business_id, badge_id, transaction_type, amount, balance_after, description
      ) VALUES (
        NEW.business_id,
        NEW.badge_id,
        'earn',
        v_credits,
        v_new_balance,
        'Créditos por conquista desbloqueada'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para creditar automaticamente
CREATE TRIGGER trigger_award_achievement_credits
  AFTER UPDATE ON public.business_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.award_achievement_credits();

-- Função para resgatar vantagem
CREATE OR REPLACE FUNCTION public.redeem_advantage(
  p_business_id UUID,
  p_advantage_type TEXT,
  p_credits_cost INTEGER,
  p_duration_days INTEGER,
  p_offer_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_advantage_id UUID;
  v_existing_advantage UUID;
BEGIN
  -- Verifica se já existe vantagem ativa do mesmo tipo
  SELECT id INTO v_existing_advantage
  FROM public.business_active_advantages
  WHERE business_id = p_business_id 
    AND advantage_type = p_advantage_type 
    AND is_active = true
    AND expires_at > now();
  
  IF v_existing_advantage IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Já existe uma vantagem ativa deste tipo'
    );
  END IF;

  -- Busca saldo atual
  SELECT (total_credits - used_credits) INTO v_current_balance
  FROM public.business_achievement_credits
  WHERE business_id = p_business_id;
  
  IF v_current_balance IS NULL OR v_current_balance < p_credits_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente de créditos por conquistas'
    );
  END IF;
  
  -- Calcula data de expiração
  v_expires_at := now() + (p_duration_days || ' days')::INTERVAL;
  
  -- Debita créditos
  UPDATE public.business_achievement_credits
  SET used_credits = used_credits + p_credits_cost,
      updated_at = now()
  WHERE business_id = p_business_id;
  
  v_new_balance := v_current_balance - p_credits_cost;
  
  -- Cria vantagem ativa
  INSERT INTO public.business_active_advantages (
    business_id, advantage_type, offer_id, expires_at, credits_spent, metadata
  ) VALUES (
    p_business_id, p_advantage_type, p_offer_id, v_expires_at, p_credits_cost, p_metadata
  ) RETURNING id INTO v_advantage_id;
  
  -- Registra transação
  INSERT INTO public.achievement_credit_transactions (
    business_id, transaction_type, amount, balance_after, 
    advantage_type, advantage_expires_at, description
  ) VALUES (
    p_business_id,
    'redeem',
    -p_credits_cost,
    v_new_balance,
    p_advantage_type,
    v_expires_at,
    'Resgate de vantagem: ' || p_advantage_type
  );
  
  -- Se for destaque na home, atualiza a oferta
  IF p_advantage_type = 'featured_offer' AND p_offer_id IS NOT NULL THEN
    UPDATE public.offers
    SET is_featured = true, featured_at = now()
    WHERE id = p_offer_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'advantage_id', v_advantage_id,
    'expires_at', v_expires_at,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para expirar vantagens
CREATE OR REPLACE FUNCTION public.expire_advantages()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_advantage RECORD;
BEGIN
  FOR v_advantage IN
    SELECT id, business_id, advantage_type, offer_id
    FROM public.business_active_advantages
    WHERE is_active = true AND expires_at <= now()
  LOOP
    -- Desativa a vantagem
    UPDATE public.business_active_advantages
    SET is_active = false
    WHERE id = v_advantage.id;
    
    -- Se for destaque na home, remove da oferta
    IF v_advantage.advantage_type = 'featured_offer' AND v_advantage.offer_id IS NOT NULL THEN
      UPDATE public.offers
      SET is_featured = false, featured_at = NULL
      WHERE id = v_advantage.offer_id;
    END IF;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.business_achievement_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_active_advantages ENABLE ROW LEVEL SECURITY;

-- Políticas para business_achievement_credits
CREATE POLICY "Business owners can view their credits"
  ON public.business_achievement_credits FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "System can manage credits"
  ON public.business_achievement_credits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para achievement_credit_transactions
CREATE POLICY "Business owners can view their transactions"
  ON public.achievement_credit_transactions FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "System can insert transactions"
  ON public.achievement_credit_transactions FOR INSERT
  WITH CHECK (true);

-- Políticas para business_active_advantages
CREATE POLICY "Business owners can view their advantages"
  ON public.business_active_advantages FOR SELECT
  USING (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active verified badges"
  ON public.business_active_advantages FOR SELECT
  USING (advantage_type = 'verified_badge' AND is_active = true);

CREATE POLICY "System can manage advantages"
  ON public.business_active_advantages FOR ALL
  USING (true)
  WITH CHECK (true);