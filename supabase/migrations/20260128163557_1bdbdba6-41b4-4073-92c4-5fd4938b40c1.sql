-- =============================================================================
-- SISTEMA DE PONTOS PROMOCIONAIS PARA ANUNCIANTES
-- 100 pontos = R$ 1,00 (crédito promocional)
-- =============================================================================

-- 1. Tabela de Carteira de Pontos do Anunciante
CREATE TABLE IF NOT EXISTS public.business_points_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  monthly_allocation INTEGER NOT NULL DEFAULT 1000,
  current_balance INTEGER NOT NULL DEFAULT 1000,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_business_wallet UNIQUE (business_id),
  CONSTRAINT positive_balance CHECK (current_balance >= 0),
  CONSTRAINT positive_allocation CHECK (monthly_allocation >= 0)
);

-- 2. Tabela de Transações de Pontos do Anunciante
CREATE TABLE IF NOT EXISTS public.business_points_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  user_id UUID,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Adicionar campos na tabela offers para controle de pontos
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS points_per_action INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_actions INTEGER,
ADD COLUMN IF NOT EXISTS current_actions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_consumed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paused_no_balance BOOLEAN DEFAULT false;

-- 4. Atualizar subscription_plans com alocação de pontos por plano
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS monthly_points_allocation INTEGER DEFAULT 1000;

-- 5. Atualizar alocação de pontos por plano (usando name ao invés de slug)
UPDATE public.subscription_plans SET monthly_points_allocation = 1000 WHERE name = 'Start';
UPDATE public.subscription_plans SET monthly_points_allocation = 5000 WHERE name = 'Essencial';
UPDATE public.subscription_plans SET monthly_points_allocation = 12000 WHERE name = 'Pro';
UPDATE public.subscription_plans SET monthly_points_allocation = 30000 WHERE name = 'Premium';
UPDATE public.subscription_plans SET monthly_points_allocation = 100000 WHERE name = 'Empresarial';

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_business_points_wallet_business ON public.business_points_wallet(business_id);
CREATE INDEX IF NOT EXISTS idx_business_points_transactions_business ON public.business_points_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_points_transactions_offer ON public.business_points_transactions(offer_id);
CREATE INDEX IF NOT EXISTS idx_business_points_transactions_created ON public.business_points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_paused_balance ON public.offers(is_paused_no_balance) WHERE is_paused_no_balance = true;

-- 7. Enable RLS
ALTER TABLE public.business_points_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_points_transactions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies para business_points_wallet
CREATE POLICY "Business owners can view their wallet"
ON public.business_points_wallet FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their wallet"
ON public.business_points_wallet FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- 9. RLS Policies para business_points_transactions
CREATE POLICY "Business owners can view their transactions"
ON public.business_points_transactions FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- 10. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_business_points_wallet_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_business_points_wallet_updated_at ON public.business_points_wallet;
CREATE TRIGGER trigger_update_business_points_wallet_updated_at
  BEFORE UPDATE ON public.business_points_wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_points_wallet_updated_at();

-- 11. Função para criar/inicializar carteira do anunciante
CREATE OR REPLACE FUNCTION public.initialize_business_wallet(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_allocation INTEGER;
  v_wallet_id UUID;
BEGIN
  SELECT COALESCE(sp.monthly_points_allocation, 1000) INTO v_plan_allocation
  FROM public.business_subscriptions bs
  JOIN public.subscription_plans sp ON bs.plan_id = sp.id
  WHERE bs.business_id = p_business_id
    AND bs.status = 'active'
  ORDER BY bs.created_at DESC
  LIMIT 1;
  
  IF v_plan_allocation IS NULL THEN
    v_plan_allocation := 1000;
  END IF;
  
  INSERT INTO public.business_points_wallet (
    business_id,
    monthly_allocation,
    current_balance,
    total_consumed,
    last_reset_at,
    next_reset_at
  ) VALUES (
    p_business_id,
    v_plan_allocation,
    v_plan_allocation,
    0,
    now(),
    now() + interval '1 month'
  )
  ON CONFLICT (business_id) DO UPDATE SET
    monthly_allocation = v_plan_allocation,
    updated_at = now()
  RETURNING id INTO v_wallet_id;
  
  INSERT INTO public.business_points_transactions (
    business_id,
    transaction_type,
    amount,
    balance_after,
    description
  ) VALUES (
    p_business_id,
    'allocation',
    v_plan_allocation,
    v_plan_allocation,
    'Alocação mensal de pontos - Plano'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet_id,
    'allocation', v_plan_allocation
  );
END;
$$;

-- 12. Função para debitar pontos na carteira
CREATE OR REPLACE FUNCTION public.debit_business_points(
  p_business_id UUID,
  p_offer_id UUID,
  p_user_id UUID,
  p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_offer RECORD;
  v_new_balance INTEGER;
  v_new_actions INTEGER;
  v_new_consumed INTEGER;
BEGIN
  SELECT * INTO v_wallet
  FROM public.business_points_wallet
  WHERE business_id = p_business_id
  FOR UPDATE;
  
  IF v_wallet IS NULL THEN
    PERFORM public.initialize_business_wallet(p_business_id);
    SELECT * INTO v_wallet
    FROM public.business_points_wallet
    WHERE business_id = p_business_id
    FOR UPDATE;
  END IF;
  
  IF v_wallet.current_balance < p_points THEN
    UPDATE public.offers
    SET is_paused_no_balance = true
    WHERE business_id = p_business_id
      AND is_active = true
      AND deleted_at IS NULL;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo insuficiente na carteira. Ofertas pausadas.',
      'balance', v_wallet.current_balance,
      'required', p_points
    );
  END IF;
  
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;
  
  IF v_offer.max_actions IS NOT NULL AND v_offer.current_actions >= v_offer.max_actions THEN
    UPDATE public.offers
    SET is_active = false
    WHERE id = p_offer_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Limite de ações da oferta atingido',
      'max_actions', v_offer.max_actions,
      'current_actions', v_offer.current_actions
    );
  END IF;
  
  v_new_balance := v_wallet.current_balance - p_points;
  v_new_actions := COALESCE(v_offer.current_actions, 0) + 1;
  v_new_consumed := COALESCE(v_offer.total_points_consumed, 0) + p_points;
  
  UPDATE public.business_points_wallet
  SET 
    current_balance = v_new_balance,
    total_consumed = total_consumed + p_points
  WHERE business_id = p_business_id;
  
  UPDATE public.offers
  SET 
    current_actions = v_new_actions,
    total_points_consumed = v_new_consumed
  WHERE id = p_offer_id;
  
  INSERT INTO public.business_points_transactions (
    business_id,
    offer_id,
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    metadata
  ) VALUES (
    p_business_id,
    p_offer_id,
    p_user_id,
    'debit',
    p_points,
    v_new_balance,
    'Check-in validado',
    jsonb_build_object(
      'offer_title', v_offer.title,
      'action_number', v_new_actions
    )
  );
  
  IF v_new_balance = 0 THEN
    UPDATE public.offers
    SET is_paused_no_balance = true
    WHERE business_id = p_business_id
      AND is_active = true
      AND deleted_at IS NULL;
  END IF;
  
  IF v_offer.max_actions IS NOT NULL AND v_new_actions >= v_offer.max_actions THEN
    UPDATE public.offers
    SET is_active = false
    WHERE id = p_offer_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'points_debited', p_points,
    'new_balance', v_new_balance,
    'offer_actions', v_new_actions,
    'offer_max_actions', v_offer.max_actions
  );
END;
$$;

-- 13. Função para resetar carteira mensalmente
CREATE OR REPLACE FUNCTION public.reset_business_wallet_monthly(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_plan_allocation INTEGER;
BEGIN
  SELECT * INTO v_wallet
  FROM public.business_points_wallet
  WHERE business_id = p_business_id;
  
  IF v_wallet IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Carteira não encontrada');
  END IF;
  
  SELECT COALESCE(sp.monthly_points_allocation, v_wallet.monthly_allocation) INTO v_plan_allocation
  FROM public.business_subscriptions bs
  JOIN public.subscription_plans sp ON bs.plan_id = sp.id
  WHERE bs.business_id = p_business_id
    AND bs.status = 'active'
  ORDER BY bs.created_at DESC
  LIMIT 1;
  
  IF v_plan_allocation IS NULL THEN
    v_plan_allocation := v_wallet.monthly_allocation;
  END IF;
  
  UPDATE public.business_points_wallet
  SET 
    monthly_allocation = v_plan_allocation,
    current_balance = v_plan_allocation,
    total_consumed = 0,
    last_reset_at = now(),
    next_reset_at = now() + interval '1 month'
  WHERE business_id = p_business_id;
  
  UPDATE public.offers
  SET is_paused_no_balance = false
  WHERE business_id = p_business_id
    AND is_paused_no_balance = true
    AND deleted_at IS NULL;
  
  INSERT INTO public.business_points_transactions (
    business_id,
    transaction_type,
    amount,
    balance_after,
    description
  ) VALUES (
    p_business_id,
    'reset',
    v_plan_allocation,
    v_plan_allocation,
    'Reset mensal da carteira de pontos'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_plan_allocation,
    'message', 'Carteira resetada com sucesso'
  );
END;
$$;

-- 14. Função para buscar saldo da carteira
CREATE OR REPLACE FUNCTION public.get_business_wallet_balance(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet RECORD;
BEGIN
  SELECT * INTO v_wallet
  FROM public.business_points_wallet
  WHERE business_id = p_business_id;
  
  IF v_wallet IS NULL THEN
    PERFORM public.initialize_business_wallet(p_business_id);
    SELECT * INTO v_wallet
    FROM public.business_points_wallet
    WHERE business_id = p_business_id;
  END IF;
  
  RETURN jsonb_build_object(
    'balance', v_wallet.current_balance,
    'monthly_allocation', v_wallet.monthly_allocation,
    'total_consumed', v_wallet.total_consumed,
    'next_reset_at', v_wallet.next_reset_at,
    'percentage_used', CASE 
      WHEN v_wallet.monthly_allocation > 0 
      THEN ROUND((v_wallet.total_consumed::numeric / v_wallet.monthly_allocation) * 100, 1)
      ELSE 0
    END
  );
END;
$$;

-- 15. Trigger para auto-inicializar carteira quando negócio é criado
CREATE OR REPLACE FUNCTION public.auto_initialize_business_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.initialize_business_wallet(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_init_wallet ON public.businesses;
CREATE TRIGGER trigger_auto_init_wallet
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_initialize_business_wallet();

-- 16. Atualizar validate_checkin para debitar pontos
CREATE OR REPLACE FUNCTION public.validate_checkin(
  p_business_id UUID,
  p_offer_id UUID,
  p_user_id UUID,
  p_qr_code TEXT,
  p_location_lat NUMERIC DEFAULT NULL,
  p_location_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offer RECORD;
  v_already_checked BOOLEAN := FALSE;
  v_checkin_id UUID;
  v_points_to_award INTEGER;
  v_debit_result JSONB;
BEGIN
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
    AND business_id = p_business_id
    AND is_active = true
    AND deleted_at IS NULL
    AND archived_at IS NULL;

  IF v_offer IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Oferta não encontrada ou inativa'
    );
  END IF;

  IF v_offer.is_paused_no_balance = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Oferta pausada - saldo insuficiente na carteira do anunciante'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.offer_checkins
    WHERE offer_id = p_offer_id
      AND user_id = p_user_id
      AND DATE(validated_at) = CURRENT_DATE
    UNION ALL
    SELECT 1 FROM public.checkin_validations
    WHERE offer_id = p_offer_id
      AND user_id = p_user_id
      AND DATE(created_at) = CURRENT_DATE
  ) INTO v_already_checked;

  IF v_already_checked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você já fez check-in nesta oferta hoje'
    );
  END IF;

  v_points_to_award := COALESCE(v_offer.points_per_action, v_offer.checkin_points, 50);

  v_debit_result := public.debit_business_points(
    p_business_id,
    p_offer_id,
    p_user_id,
    v_points_to_award
  );

  IF NOT (v_debit_result->>'success')::boolean THEN
    RETURN v_debit_result;
  END IF;

  INSERT INTO public.offer_checkins (
    offer_id,
    business_id,
    user_id,
    points_awarded,
    location_latitude,
    location_longitude
  ) VALUES (
    p_offer_id,
    p_business_id,
    p_user_id,
    v_points_to_award,
    p_location_lat,
    p_location_lng
  ) RETURNING id INTO v_checkin_id;

  INSERT INTO public.user_points (
    user_id,
    points_earned,
    action_type,
    offer_id,
    business_id,
    description
  ) VALUES (
    p_user_id,
    v_points_to_award,
    'checkin',
    p_offer_id,
    p_business_id,
    'Check-in validado - ' || v_points_to_award || ' pontos'
  );

  UPDATE public.profiles
  SET total_points = COALESCE(total_points, 0) + v_points_to_award
  WHERE user_id = p_user_id;

  UPDATE public.offers
  SET current_uses = COALESCE(current_uses, 0) + 1
  WHERE id = p_offer_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    metadata
  ) VALUES (
    p_user_id,
    'checkin_confirmed',
    'Check-in confirmado! 🎉',
    'Você ganhou +' || v_points_to_award || ' pontos!',
    v_checkin_id,
    jsonb_build_object(
      'offer_id', p_offer_id,
      'business_id', p_business_id,
      'points_awarded', v_points_to_award
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso! +' || v_points_to_award || ' pontos',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id,
    'wallet_balance', (v_debit_result->>'new_balance')::integer
  );
END;
$$;