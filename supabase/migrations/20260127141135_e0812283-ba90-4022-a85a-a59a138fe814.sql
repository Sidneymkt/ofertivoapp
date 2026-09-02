-- Função segura para vincular patrocinador à campanha (ignora RLS)
CREATE OR REPLACE FUNCTION public.vincular_patrocinador_campanha(
  p_campanha_id UUID,
  p_business_id UUID,
  p_multiplicador INTEGER DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_owner_id UUID;
BEGIN
  -- Verificar se o usuário é dono do negócio
  SELECT owner_id INTO v_business_owner_id
  FROM businesses
  WHERE id = p_business_id AND is_active = true;

  IF v_business_owner_id IS NULL OR v_business_owner_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você não tem permissão para patrocinar com este negócio'
    );
  END IF;

  -- Verificar se a campanha existe e está ativa
  IF NOT EXISTS (SELECT 1 FROM crowdfunding_campaigns WHERE id = p_campanha_id AND is_active = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha não encontrada ou inativa'
    );
  END IF;

  -- Atualizar a campanha com o patrocinador
  UPDATE crowdfunding_campaigns
  SET 
    patrocinador_id = p_business_id,
    multiplicador_patrocinio = GREATEST(p_multiplicador, 1),
    updated_at = now()
  WHERE id = p_campanha_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Patrocinador vinculado com sucesso'
  );
END;
$$;

-- Função para remover patrocinador da campanha
CREATE OR REPLACE FUNCTION public.remover_patrocinador_campanha(
  p_campanha_id UUID,
  p_business_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_owner_id UUID;
BEGIN
  -- Verificar se o usuário é dono do negócio
  SELECT owner_id INTO v_business_owner_id
  FROM businesses
  WHERE id = p_business_id AND is_active = true;

  IF v_business_owner_id IS NULL OR v_business_owner_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você não tem permissão para modificar este patrocínio'
    );
  END IF;

  -- Remover patrocinador apenas se for o mesmo business
  UPDATE crowdfunding_campaigns
  SET 
    patrocinador_id = NULL,
    multiplicador_patrocinio = 1,
    updated_at = now()
  WHERE id = p_campanha_id AND patrocinador_id = p_business_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Patrocinador removido com sucesso'
  );
END;
$$;