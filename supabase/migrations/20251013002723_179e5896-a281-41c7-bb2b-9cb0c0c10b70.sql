-- Criar tabela de transações unificada
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.business_subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('abacatepay', 'mercadopago')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'debit_card')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
  gateway_transaction_id TEXT,
  gateway_payment_url TEXT,
  pix_code TEXT,
  pix_qr_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  transaction_fee NUMERIC(10,2),
  net_revenue NUMERIC(10,2),
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON public.transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON public.transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON public.transactions(gateway);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway_transaction_id ON public.transactions(gateway_transaction_id);

-- Criar tabela de configuração de gateways
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name TEXT NOT NULL UNIQUE CHECK (gateway_name IN ('abacatepay', 'mercadopago')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted TEXT,
  webhook_secret TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração inicial dos gateways
INSERT INTO public.payment_gateways (gateway_name, is_active, is_primary, config)
VALUES 
  ('abacatepay', true, true, '{"payment_types": ["pix"], "auto_confirm": true}'::jsonb),
  ('mercadopago', true, false, '{"payment_types": ["credit_card", "debit_card"], "installments": true}'::jsonb)
ON CONFLICT (gateway_name) DO NOTHING;

-- Adicionar campos na tabela business_subscriptions
ALTER TABLE public.business_subscriptions 
ADD COLUMN IF NOT EXISTS payment_gateway TEXT CHECK (payment_gateway IN ('abacatepay', 'mercadopago')),
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'debit_card')),
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'active', 'past_due', 'cancelled'));

-- Criar tabela de logs de pagamento
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  gateway TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id ON public.payment_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON public.payment_logs(event_type);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transaction_updated_at();

-- Função para processar pagamento confirmado
CREATE OR REPLACE FUNCTION public.process_payment_confirmation(p_transaction_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_subscription public.business_subscriptions%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
BEGIN
  -- Buscar transação
  SELECT * INTO v_transaction FROM public.transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction not found');
  END IF;
  
  -- Se já foi processada, retornar
  IF v_transaction.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;
  
  -- Atualizar status da transação
  UPDATE public.transactions
  SET status = 'paid', paid_at = now()
  WHERE id = p_transaction_id;
  
  -- Atualizar ou criar assinatura
  IF v_transaction.subscription_id IS NOT NULL THEN
    SELECT * INTO v_subscription 
    FROM public.business_subscriptions 
    WHERE id = v_transaction.subscription_id;
    
    SELECT * INTO v_plan 
    FROM public.subscription_plans 
    WHERE id = v_subscription.plan_id;
    
    -- Atualizar assinatura
    UPDATE public.business_subscriptions
    SET 
      status = 'active',
      payment_status = 'active',
      payment_gateway = v_transaction.gateway,
      payment_method = v_transaction.payment_method,
      last_payment_at = now(),
      next_payment_at = CASE 
        WHEN v_plan.billing_period = 'monthly' THEN now() + interval '1 month'
        WHEN v_plan.billing_period = 'yearly' THEN now() + interval '1 year'
        ELSE now() + interval '1 month'
      END,
      current_period_start = now(),
      current_period_end = CASE 
        WHEN v_plan.billing_period = 'monthly' THEN now() + interval '1 month'
        WHEN v_plan.billing_period = 'yearly' THEN now() + interval '1 year'
        ELSE now() + interval '1 month'
      END
    WHERE id = v_transaction.subscription_id;
  END IF;
  
  -- Criar notificação
  PERFORM public.create_notification(
    (SELECT owner_id FROM public.businesses WHERE id = v_transaction.business_id),
    'Pagamento Confirmado! 💳',
    'Seu pagamento de R$ ' || v_transaction.amount || ' foi confirmado e sua assinatura está ativa.',
    'payment_confirmed',
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'amount', v_transaction.amount,
      'gateway', v_transaction.gateway
    ),
    v_transaction.business_id
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Payment processed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para expirar pagamentos pendentes
CREATE OR REPLACE FUNCTION public.expire_pending_payments()
RETURNS void AS $$
BEGIN
  -- Expirar transações pendentes após 10 minutos (AbacatePay PIX)
  UPDATE public.transactions
  SET status = 'expired'
  WHERE status = 'pending'
    AND gateway = 'abacatepay'
    AND created_at < now() - interval '10 minutes';
    
  -- Expirar transações pendentes após 24 horas (Mercado Pago)
  UPDATE public.transactions
  SET status = 'expired'
  WHERE status = 'pending'
    AND gateway = 'mercadopago'
    AND created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies para transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own transactions"
ON public.transactions FOR SELECT
USING (business_id IN (
  SELECT id FROM public.businesses WHERE owner_id = auth.uid()
));

CREATE POLICY "System can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update transactions"
ON public.transactions FOR UPDATE
USING (true);

CREATE POLICY "Admin users can view all transactions"
ON public.transactions FOR SELECT
USING (is_admin());

-- RLS Policies para payment_gateways
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gateways config"
ON public.payment_gateways FOR SELECT
USING (is_active = true);

CREATE POLICY "Only admins can manage gateways"
ON public.payment_gateways FOR ALL
USING (is_admin());

-- RLS Policies para payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view all payment logs"
ON public.payment_logs FOR SELECT
USING (is_admin());

CREATE POLICY "System can insert payment logs"
ON public.payment_logs FOR INSERT
WITH CHECK (true);

-- Habilitar realtime para transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;