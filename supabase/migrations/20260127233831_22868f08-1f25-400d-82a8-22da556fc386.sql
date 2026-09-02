-- Função para notificar criador quando campanha recebe patrocinador
CREATE OR REPLACE FUNCTION public.notify_campaign_sponsored()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
  v_campaign_title TEXT;
  v_sponsor_name TEXT;
  v_message TEXT;
BEGIN
  -- Buscar dados da campanha
  SELECT creator_id, title 
  INTO v_creator_id, v_campaign_title
  FROM public.crowdfunding_campaigns
  WHERE id = NEW.campanha_id;
  
  -- Buscar nome do patrocinador
  SELECT name INTO v_sponsor_name
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  -- Montar mensagem baseada no tipo
  IF NEW.tipo = 'dobrar_pontos' THEN
    v_message := v_sponsor_name || ' está patrocinando sua vaquinha "' || 
                 v_campaign_title || '" com multiplicador ' || 
                 NEW.multiplicador || 'x nos pontos!';
  ELSIF NEW.tipo = 'valor_fixo' THEN
    v_message := v_sponsor_name || ' está patrocinando sua vaquinha "' || 
                 v_campaign_title || '" com até R$ ' || 
                 COALESCE(NEW.valor_maximo::TEXT, '0') || '!';
  ELSE
    v_message := v_sponsor_name || ' está patrocinando sua vaquinha "' || 
                 v_campaign_title || '" com destaque especial!';
  END IF;
  
  -- Criar notificação para o criador
  PERFORM public.create_notification(
    v_creator_id,
    'Sua Vaquinha Foi Patrocinada! 🎉',
    v_message,
    'campaign_sponsored',
    jsonb_build_object(
      'sponsor_name', v_sponsor_name,
      'sponsor_id', NEW.business_id,
      'tipo', NEW.tipo,
      'multiplicador', NEW.multiplicador,
      'valor_maximo', NEW.valor_maximo,
      'campaign_title', v_campaign_title
    ),
    NEW.campanha_id
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para novos patrocínios
CREATE TRIGGER trigger_notify_campaign_sponsored
  AFTER INSERT ON public.patrocinios_vaquinha
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.notify_campaign_sponsored();