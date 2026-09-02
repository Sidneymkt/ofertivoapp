-- Configurar taxa de comissão de 25% para o período de lançamento
-- Atualizar todas as configurações de comissão existentes para 25%

-- Atualizar configurações existentes
UPDATE referral_settings 
SET commission_percentage = 25.00,
    updated_at = NOW()
WHERE is_active = true;

-- Criar trigger para calcular comissões automaticamente quando uma assinatura é criada/renovada
CREATE OR REPLACE FUNCTION calculate_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_commission_percentage NUMERIC;
  v_commission_amount NUMERIC;
BEGIN
  -- Buscar o referrer do negócio
  SELECT referred_by INTO v_referrer_id
  FROM businesses
  WHERE id = NEW.business_id;

  -- Se o negócio foi indicado, calcular comissão
  IF v_referrer_id IS NOT NULL THEN
    -- Buscar taxa de comissão para o plano
    SELECT commission_percentage INTO v_commission_percentage
    FROM referral_settings
    WHERE subscription_plan_id = NEW.plan_id
      AND is_active = true
    LIMIT 1;

    -- Se não encontrar configuração específica, usar taxa padrão de 25%
    IF v_commission_percentage IS NULL THEN
      v_commission_percentage := 25.00;
    END IF;

    -- Calcular valor da assinatura baseado no plano
    DECLARE
      v_subscription_amount NUMERIC;
    BEGIN
      SELECT price INTO v_subscription_amount
      FROM subscription_plans
      WHERE id = NEW.plan_id;

      -- Calcular comissão
      v_commission_amount := (v_subscription_amount * v_commission_percentage / 100);

      -- Inserir registro de comissão
      INSERT INTO referral_commissions (
        referrer_id,
        business_id,
        subscription_id,
        commission_amount,
        commission_percentage,
        subscription_amount,
        status,
        period_start,
        period_end
      ) VALUES (
        v_referrer_id,
        NEW.business_id,
        NEW.id,
        v_commission_amount,
        v_commission_percentage,
        v_subscription_amount,
        'pending',
        NEW.current_period_start,
        NEW.current_period_end
      );

      -- Atualizar estatísticas de indicação
      INSERT INTO referral_stats (user_id, total_commissions_earned, total_commissions_pending)
      VALUES (v_referrer_id, v_commission_amount, v_commission_amount)
      ON CONFLICT (user_id)
      DO UPDATE SET
        total_commissions_earned = referral_stats.total_commissions_earned + v_commission_amount,
        total_commissions_pending = referral_stats.total_commissions_pending + v_commission_amount,
        last_commission_date = NOW();
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_business_subscription_created ON business_subscriptions;

-- Criar trigger para assinaturas criadas
CREATE TRIGGER on_business_subscription_created
  AFTER INSERT ON business_subscriptions
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' OR NEW.status = 'active')
  EXECUTE FUNCTION calculate_referral_commission();

-- Criar função para atualizar comissões quando status de pagamento muda
CREATE OR REPLACE FUNCTION update_referral_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se pagamento foi confirmado e ainda não havia comissão
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    -- Calcular comissão (chamando a função existente)
    PERFORM calculate_referral_commission();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_subscription_payment_confirmed ON business_subscriptions;

-- Criar trigger para quando pagamento é confirmado
CREATE TRIGGER on_subscription_payment_confirmed
  AFTER UPDATE ON business_subscriptions
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND OLD.payment_status != 'paid')
  EXECUTE FUNCTION calculate_referral_commission();

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_businesses_referred_by ON businesses(referred_by);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business ON business_subscriptions(business_id);

-- Comentários explicativos
COMMENT ON FUNCTION calculate_referral_commission() IS 'Calcula automaticamente comissões de indicação quando uma assinatura é criada ou paga';
COMMENT ON FUNCTION update_referral_on_payment() IS 'Atualiza comissões quando o pagamento de uma assinatura é confirmado';
COMMENT ON COLUMN referral_settings.commission_percentage IS 'Taxa de comissão em porcentagem (25% = 25.00 durante período de lançamento)';
COMMENT ON TABLE referral_commissions IS 'Histórico de comissões geradas por indicações de anunciantes';