-- Remover função anterior com problema
DROP FUNCTION IF EXISTS public.contribute_to_campaign(UUID, UUID, INTEGER, TEXT, BOOLEAN);

-- Criar função completa e corrigida
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
  v_campaign campaigns%ROWTYPE;
  v_campaign_title TEXT;
  v_campaign_creator_id UUID;
BEGIN
  -- Verificar se o usuário tem pontos suficientes
  SELECT COALESCE(total_points, 0) INTO v_user_points
  FROM profiles
  WHERE user_id = p_contributor_id;

  IF v_user_points < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pontos insuficientes para esta contribuição'
    );
  END IF;

  -- Buscar informações da campanha
  SELECT * INTO v_campaign
  FROM crowdfunding_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha não encontrada'
    );
  END IF;

  IF NOT v_campaign.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Esta campanha não está mais ativa'
    );
  END IF;

  -- Verificar se a campanha já atingiu a meta
  IF v_campaign.current_points >= v_campaign.goal_points THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Esta campanha já atingiu a meta'
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
  SET 
    current_points = current_points + p_amount,
    updated_at = now()
  WHERE id = p_campaign_id;

  -- Deduzir pontos do usuário (apenas atualizar o perfil)
  UPDATE profiles
  SET total_points = total_points - p_amount
  WHERE user_id = p_contributor_id;

  -- Criar notificação para o criador (se não for anônimo e não for o próprio criador)
  IF NOT p_is_anonymous AND v_campaign.creator_id != p_contributor_id THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      related_id,
      metadata
    ) VALUES (
      v_campaign.creator_id,
      'Nova Contribuição Recebida! 🎉',
      (SELECT COALESCE(full_name, 'Um apoiador') FROM profiles WHERE user_id = p_contributor_id) || 
      ' contribuiu com ' || p_amount || ' pontos para sua campanha "' || v_campaign.title || '"',
      'campaign_contribution',
      p_campaign_id,
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'contributor_id', p_contributor_id,
        'amount', p_amount,
        'campaign_title', v_campaign.title
      )
    );
  END IF;

  -- Verificar se a campanha atingiu a meta com esta contribuição
  IF (v_campaign.current_points + p_amount) >= v_campaign.goal_points THEN
    -- Notificar o criador que a meta foi atingida
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      related_id,
      metadata
    ) VALUES (
      v_campaign.creator_id,
      'Meta Atingida! 🎯',
      'Parabéns! Sua campanha "' || v_campaign.title || '" atingiu a meta de ' || v_campaign.goal_points || ' pontos!',
      'campaign_goal_reached',
      p_campaign_id,
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'goal_points', v_campaign.goal_points,
        'campaign_title', v_campaign.title
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contribuição realizada com sucesso! Obrigado pelo apoio! 💚'
  );

EXCEPTION 
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erro ao processar contribuição: ' || SQLERRM
    );
END;
$$;