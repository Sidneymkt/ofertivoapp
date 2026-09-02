-- Remover função antiga e recriar com tipo correto
DROP FUNCTION IF EXISTS transfer_points(uuid, uuid, integer, text);

CREATE OR REPLACE FUNCTION transfer_points(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_balance INTEGER;
  v_transfer_id UUID;
BEGIN
  -- Validações
  IF p_sender_id = p_receiver_id THEN
    RETURN json_build_object('success', false, 'message', 'Você não pode transferir pontos para si mesmo');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'A quantidade deve ser maior que zero');
  END IF;

  -- Verificar saldo do remetente
  SELECT COALESCE(SUM(points), 0) INTO v_sender_balance
  FROM user_points
  WHERE user_id = p_sender_id;

  IF v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente');
  END IF;

  -- Criar registro de transferência
  INSERT INTO points_transfers (sender_id, receiver_id, amount, message, status)
  VALUES (p_sender_id, p_receiver_id, p_amount, p_message, 'completed')
  RETURNING id INTO v_transfer_id;

  -- Debitar pontos do remetente
  INSERT INTO user_points (user_id, points, action_type, action_id, description)
  VALUES (
    p_sender_id,
    -p_amount,
    'transfer',
    v_transfer_id,
    'Transferência enviada' || COALESCE(': ' || p_message, '')
  );

  -- Creditar pontos para o destinatário
  INSERT INTO user_points (user_id, points, action_type, action_id, description)
  VALUES (
    p_receiver_id,
    p_amount,
    'transfer',
    v_transfer_id,
    'Transferência recebida' || COALESCE(': ' || p_message, '')
  );

  -- Criar notificação para o destinatário
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_receiver_id,
    'points_received',
    '💰 Pontos Recebidos!',
    'Você recebeu ' || p_amount || ' pontos',
    v_transfer_id
  );

  RETURN json_build_object('success', true, 'message', 'Transferência realizada com sucesso');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;