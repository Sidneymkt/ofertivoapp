-- Função para contribuir com vaquinhas (crowdfunding)
CREATE OR REPLACE FUNCTION public.contribute_to_campaign(
  p_campaign_id UUID,
  p_contributor_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign crowdfunding_campaigns%ROWTYPE;
  v_contributor_balance INTEGER;
  v_contribution_id UUID;
BEGIN
  -- Verificar se a campanha existe e está ativa
  SELECT * INTO v_campaign
  FROM crowdfunding_campaigns
  WHERE id = p_campaign_id AND is_active = true;
  
  IF v_campaign.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha não encontrada ou inativa'
    );
  END IF;
  
  -- Verificar se a campanha ainda não expirou
  IF v_campaign.end_date < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha já encerrada'
    );
  END IF;
  
  -- Verificar se não pode contribuir para própria campanha
  IF v_campaign.creator_id = p_contributor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você não pode contribuir para sua própria campanha'
    );
  END IF;
  
  -- Validar quantidade positiva
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantidade deve ser maior que zero'
    );
  END IF;
  
  -- Verificar saldo do contribuidor
  SELECT COALESCE(total_points, 0)
  INTO v_contributor_balance
  FROM profiles
  WHERE user_id = p_contributor_id;
  
  IF v_contributor_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo insuficiente'
    );
  END IF;
  
  -- Criar registro de contribuição
  INSERT INTO campaign_contributions (
    campaign_id,
    contributor_id,
    amount,
    message,
    is_anonymous
  ) VALUES (
    p_campaign_id,
    p_contributor_id,
    p_amount,
    p_message,
    p_is_anonymous
  ) RETURNING id INTO v_contribution_id;
  
  -- Debitar pontos do contribuidor
  INSERT INTO user_points (
    user_id,
    points_earned,
    action_type,
    description
  ) VALUES (
    p_contributor_id,
    -p_amount,
    'donation',
    'Contribuição para vaquinha: ' || v_campaign.title
  );
  
  -- Atualizar total de pontos do contribuidor
  UPDATE profiles
  SET total_points = total_points - p_amount
  WHERE user_id = p_contributor_id;
  
  -- Atualizar pontos da campanha
  UPDATE crowdfunding_campaigns
  SET current_points = current_points + p_amount
  WHERE id = p_campaign_id;
  
  -- Criar notificação para o criador da campanha (se não anônimo)
  IF NOT p_is_anonymous THEN
    PERFORM create_notification(
      v_campaign.creator_id,
      'Nova Contribuição! 💚',
      'Alguém contribuiu com ' || p_amount || ' pontos para sua vaquinha',
      'campaign_contribution',
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'amount', p_amount,
        'contributor_id', p_contributor_id
      ),
      p_campaign_id
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contribuição realizada com sucesso',
    'contribution_id', v_contribution_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro ao processar contribuição: ' || SQLERRM
  );
END;
$$;