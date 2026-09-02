-- Função para contribuir com pontos para vaquinhas
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
SET search_path = public
AS $$
DECLARE
  v_contributor_points INTEGER;
  v_campaign_record crowdfunding_campaigns%ROWTYPE;
  v_contribution_id UUID;
BEGIN
  -- Validações básicas
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantidade inválida de pontos'
    );
  END IF;

  -- Verificar saldo do contribuidor
  SELECT total_points INTO v_contributor_points
  FROM profiles
  WHERE user_id = p_contributor_id;

  IF v_contributor_points IS NULL OR v_contributor_points < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo insuficiente de pontos'
    );
  END IF;

  -- Buscar informações da campanha
  SELECT * INTO v_campaign_record
  FROM crowdfunding_campaigns
  WHERE id = p_campaign_id
    AND is_active = true
    AND end_date > now();

  IF v_campaign_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha não encontrada ou encerrada'
    );
  END IF;

  -- Não permitir que o criador contribua para sua própria campanha
  IF v_campaign_record.creator_id = p_contributor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você não pode contribuir para sua própria campanha'
    );
  END IF;

  -- Deduzir pontos do contribuidor
  UPDATE profiles
  SET total_points = total_points - p_amount
  WHERE user_id = p_contributor_id;

  -- Adicionar pontos à campanha
  UPDATE crowdfunding_campaigns
  SET current_points = current_points + p_amount
  WHERE id = p_campaign_id;

  -- Registrar a contribuição
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

  -- Registrar movimentação de pontos do contribuidor (débito)
  INSERT INTO user_points (
    user_id,
    points_earned,
    action_type,
    description
  ) VALUES (
    p_contributor_id,
    -p_amount,
    'donation',
    'Contribuição para vaquinha: ' || v_campaign_record.title
  );

  -- Criar notificação para o criador da campanha
  PERFORM create_notification(
    v_campaign_record.creator_id,
    '💚 Nova contribuição!',
    CASE 
      WHEN p_is_anonymous THEN 
        'Você recebeu uma contribuição anônima de ' || p_amount || ' pontos!'
      ELSE
        'Alguém contribuiu com ' || p_amount || ' pontos para sua campanha!'
    END,
    'campaign_contribution',
    jsonb_build_object(
      'campaign_id', p_campaign_id,
      'amount', p_amount,
      'is_anonymous', p_is_anonymous
    ),
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contribuição realizada com sucesso!',
    'contribution_id', v_contribution_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erro ao processar contribuição: ' || SQLERRM
    );
END;
$$;