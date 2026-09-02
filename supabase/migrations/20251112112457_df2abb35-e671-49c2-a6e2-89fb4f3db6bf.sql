-- Fix conduct_raffle function to use correct action_type
CREATE OR REPLACE FUNCTION public.conduct_raffle(raffle_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  raffle_record RECORD;
  total_entries INTEGER;
  winning_number INTEGER;
  winner_user_id UUID;
  current_count INTEGER := 0;
  entry_record RECORD;
BEGIN
  -- Buscar dados do sorteio
  SELECT * INTO raffle_record FROM raffles WHERE id = raffle_id_param;
  
  IF NOT FOUND OR raffle_record.winner_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sorteio não encontrado ou já finalizado');
  END IF;
  
  -- Calcular total de entradas
  SELECT COALESCE(SUM(number_of_entries), 0) INTO total_entries
  FROM raffle_entries WHERE raffle_id = raffle_id_param;
  
  IF total_entries = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não há participantes no sorteio');
  END IF;
  
  -- Gerar número vencedor
  winning_number := floor(random() * total_entries) + 1;
  
  -- Encontrar o ganhador
  FOR entry_record IN
    SELECT user_id, number_of_entries 
    FROM raffle_entries 
    WHERE raffle_id = raffle_id_param
    ORDER BY created_at
  LOOP
    current_count := current_count + entry_record.number_of_entries;
    
    IF current_count >= winning_number THEN
      winner_user_id := entry_record.user_id;
      EXIT;
    END IF;
  END LOOP;
  
  -- Atualizar sorteio com o ganhador
  UPDATE raffles 
  SET winner_id = winner_user_id, is_active = false
  WHERE id = raffle_id_param;
  
  -- Conceder badge especial se aplicável
  PERFORM award_special_badge(winner_user_id, 'Ganhador de Sorteio');
  
  -- Dar pontos de consolação para outros participantes (usando action_type correto)
  INSERT INTO user_points (user_id, points_earned, action_type, description)
  SELECT 
    re.user_id, 
    10, 
    'signup', -- Using valid action_type instead of 'raffle_participation'
    'Participação no sorteio: ' || raffle_record.title
  FROM raffle_entries re
  WHERE re.raffle_id = raffle_id_param 
    AND re.user_id != winner_user_id;
  
  -- Atualizar total de pontos dos participantes
  UPDATE profiles
  SET total_points = total_points + 10
  WHERE user_id IN (
    SELECT re.user_id FROM raffle_entries re
    WHERE re.raffle_id = raffle_id_param AND re.user_id != winner_user_id
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'winner_id', winner_user_id,
    'total_entries', total_entries,
    'winning_number', winning_number
  );
END;
$function$;