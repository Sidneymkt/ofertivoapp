-- Remover a função anterior se existir
DROP FUNCTION IF EXISTS public.contribute_to_campaign(UUID, UUID, INTEGER, TEXT, BOOLEAN);

-- Criar função corrigida para contribuir em campanhas de crowdfunding
CREATE OR REPLACE FUNCTION public.contribute_to_campaign(
  p_campaign_id UUID,
  p_contributor_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_points INTEGER;
  v_campaign_active BOOLEAN;
  v_campaign_creator_id UUID;
  v_campaign_title TEXT;
BEGIN
  -- Verificar se o usuário tem pontos suficientes
  SELECT COALESCE(total_points, 0) INTO v_user_points
  FROM profiles
  WHERE user_id = p_contributor_id;

  IF v_user_points < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pontos insuficientes'
    );
  END IF;

  -- Verificar se a campanha está ativa e obter dados
  SELECT is_active, creator_id, title
  INTO v_campaign_active, v_campaign_creator_id, v_campaign_title
  FROM crowdfunding_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha não encontrada'
    );
  END IF;

  IF NOT v_campaign_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha não está ativa'
    );
  END IF;

  -- Inserir a contribuição
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
  );

  -- Atualizar pontos da campanha
  UPDATE crowdfunding_campaigns
  SET current_points = current_points + p_amount,
      updated_at = now()
  WHERE id = p_campaign_id;

  -- Deduzir pontos do usuário (apenas no perfil, sem usar user_points)
  UPDATE profiles
  SET total_points = total_points - p_amount
  WHERE user_id = p_contributor_id;

  -- Criar notificação para o criador da campanha (se não for anônimo)
  IF NOT p_is_anonymous AND v_campaign_creator_id != p_contributor_id THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      related_id,
      metadata
    ) VALUES (
      v_campaign_creator_id,
      'Nova Contribuição! 🎉',
      (SELECT COALESCE(full_name, 'Um usuário') FROM profiles WHERE user_id = p_contributor_id) || ' contribuiu com ' || p_amount || ' pontos para ' || v_campaign_title,
      'campaign_contribution',
      p_campaign_id,
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'contributor_id', p_contributor_id,
        'amount', p_amount
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contribuição realizada com sucesso!'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro ao processar contribuição: ' || SQLERRM
  );
END;
$$;