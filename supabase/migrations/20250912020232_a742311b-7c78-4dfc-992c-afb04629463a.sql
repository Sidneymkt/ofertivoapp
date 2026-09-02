-- Criar tabela para códigos manuais de check-in
CREATE TABLE public.manual_checkin_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_user_id UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.manual_checkin_codes ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Negócios podem gerenciar seus próprios códigos" 
ON public.manual_checkin_codes 
FOR ALL 
USING (auth.uid() = business_id);

-- Política para permitir que usuários validem códigos (apenas leitura)
CREATE POLICY "Usuários podem verificar códigos válidos" 
ON public.manual_checkin_codes 
FOR SELECT 
USING (NOT used AND expires_at > now());

-- Criar índices para performance
CREATE INDEX idx_manual_checkin_codes_business_id ON public.manual_checkin_codes(business_id);
CREATE INDEX idx_manual_checkin_codes_offer_id ON public.manual_checkin_codes(offer_id);
CREATE INDEX idx_manual_checkin_codes_code ON public.manual_checkin_codes(code);
CREATE INDEX idx_manual_checkin_codes_expires_at ON public.manual_checkin_codes(expires_at);

-- Criar função para validar códigos manuais
CREATE OR REPLACE FUNCTION public.validate_manual_checkin_code(
  p_code TEXT,
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
  v_offer_record RECORD;
  v_business_record RECORD;
  v_points INTEGER;
  v_checkin_id UUID;
BEGIN
  -- Buscar o código
  SELECT * INTO v_code_record
  FROM manual_checkin_codes
  WHERE code = p_code
    AND NOT used
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Código inválido, expirado ou já utilizado'
    );
  END IF;

  -- Buscar informações da oferta
  SELECT * INTO v_offer_record
  FROM offers
  WHERE id = v_code_record.offer_id
    AND is_active = true
    AND (valid_until IS NULL OR valid_until > now());

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Oferta não encontrada ou expirada'
    );
  END IF;

  -- Verificar se o usuário já fez check-in nesta oferta
  IF EXISTS (
    SELECT 1 FROM checkin_validations
    WHERE offer_id = v_offer_record.id
      AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você já fez check-in nesta oferta anteriormente'
    );
  END IF;

  -- Buscar informações do negócio
  SELECT * INTO v_business_record
  FROM businesses
  WHERE id = v_code_record.business_id;

  -- Marcar código como usado
  UPDATE manual_checkin_codes
  SET used = true,
      used_at = now(),
      used_by_user_id = p_user_id
  WHERE id = v_code_record.id;

  -- Registrar check-in
  INSERT INTO checkin_validations (
    offer_id,
    user_id,
    business_id,
    validation_method,
    validation_data,
    location_lat,
    location_lng,
    points_awarded,
    validated_at
  )
  VALUES (
    v_offer_record.id,
    p_user_id,
    v_code_record.business_id,
    'manual_code',
    json_build_object('code', p_code, 'code_id', v_code_record.id),
    null, -- localização não obrigatória para código manual
    null,
    v_offer_record.checkin_points,
    now()
  )
  RETURNING id INTO v_checkin_id;

  -- Creditar pontos ao usuário
  INSERT INTO user_points (
    user_id,
    points,
    source_type,
    source_id,
    description
  )
  VALUES (
    p_user_id,
    v_offer_record.checkin_points,
    'checkin',
    v_checkin_id,
    'Check-in manual na oferta: ' || v_offer_record.title
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Check-in realizado com sucesso!',
    'points_awarded', v_offer_record.checkin_points,
    'checkin_id', v_checkin_id,
    'offer_title', v_offer_record.title,
    'business_name', v_business_record.name
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erro interno: ' || SQLERRM
    );
END;
$$;