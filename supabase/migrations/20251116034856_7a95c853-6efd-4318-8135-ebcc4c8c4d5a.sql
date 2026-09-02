-- Criar função para transferir pontos entre usuários
CREATE OR REPLACE FUNCTION transfer_points(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance INTEGER;
  v_transfer_id UUID;
BEGIN
  -- Validar que não é para si mesmo
  IF p_sender_id = p_receiver_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não pode transferir pontos para si mesmo'
    );
  END IF;
  
  -- Validar quantidade positiva
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A quantidade deve ser maior que zero'
    );
  END IF;
  
  -- Calcular saldo do remetente
  SELECT COALESCE(SUM(points_earned), 0)
  INTO v_sender_balance
  FROM user_points
  WHERE user_id = p_sender_id;
  
  -- Validar saldo suficiente
  IF v_sender_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Saldo insuficiente'
    );
  END IF;
  
  -- Criar registro de transferência
  INSERT INTO points_transfers (sender_id, receiver_id, amount, message, status)
  VALUES (p_sender_id, p_receiver_id, p_amount, p_message, 'completed')
  RETURNING id INTO v_transfer_id;
  
  -- Débito para o remetente
  INSERT INTO user_points (user_id, points_earned, action_type, description)
  VALUES (
    p_sender_id,
    -p_amount,
    'donation',
    'Doação enviada para ' || (SELECT full_name FROM profiles WHERE user_id = p_receiver_id LIMIT 1)
  );
  
  -- Crédito para o receptor
  INSERT INTO user_points (user_id, points_earned, action_type, description)
  VALUES (
    p_receiver_id,
    p_amount,
    'donation',
    'Doação recebida de ' || (SELECT full_name FROM profiles WHERE user_id = p_sender_id LIMIT 1)
  );
  
  -- Atualizar total_points nos perfis
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM user_points
    WHERE user_id = p_sender_id
  )
  WHERE user_id = p_sender_id;
  
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM user_points
    WHERE user_id = p_receiver_id
  )
  WHERE user_id = p_receiver_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transferência realizada com sucesso',
    'transfer_id', v_transfer_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Erro ao processar transferência: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;