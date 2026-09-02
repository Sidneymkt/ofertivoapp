
-- Primeiro, vamos remover todas as políticas conflitantes e recriar corretamente
DROP POLICY IF EXISTS "Business owners can select their raffles" ON public.raffles;
DROP POLICY IF EXISTS "Business owners can insert their raffles" ON public.raffles;
DROP POLICY IF EXISTS "Business owners can update their raffles" ON public.raffles;
DROP POLICY IF EXISTS "Business owners can delete their raffles" ON public.raffles;
DROP POLICY IF EXISTS "Business owners can manage own raffles" ON public.raffles;
DROP POLICY IF EXISTS "Anyone can view active raffles" ON public.raffles;

-- Recriar políticas mais simples e eficazes
CREATE POLICY "raffles_select_policy" ON public.raffles
  FOR SELECT
  USING (
    is_active = true OR 
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "raffles_insert_policy" ON public.raffles
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses 
      WHERE owner_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "raffles_update_policy" ON public.raffles
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "raffles_delete_policy" ON public.raffles
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Corrigir políticas de raffle_entries também
DROP POLICY IF EXISTS "Business owners can view entries for their raffles" ON public.raffle_entries;
DROP POLICY IF EXISTS "Users can view own entries" ON public.raffle_entries;
DROP POLICY IF EXISTS "Users can insert entries" ON public.raffle_entries;

CREATE POLICY "raffle_entries_select_policy" ON public.raffle_entries
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    raffle_id IN (
      SELECT r.id FROM public.raffles r
      JOIN public.businesses b ON b.id = r.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "raffle_entries_insert_policy" ON public.raffle_entries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Criar tabela para validações de check-in se não existir
CREATE TABLE IF NOT EXISTS public.checkin_validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  offer_id UUID NOT NULL REFERENCES public.offers(id),
  user_id UUID NOT NULL,
  qr_code TEXT NOT NULL,
  validated_by UUID NOT NULL REFERENCES auth.users(id),
  points_awarded INTEGER DEFAULT 50,
  location_latitude NUMERIC,
  location_longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para checkin_validations
ALTER TABLE public.checkin_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_validations_business_policy" ON public.checkin_validations
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Função para processar validação de check-in
CREATE OR REPLACE FUNCTION public.validate_checkin(
  p_business_id UUID,
  p_offer_id UUID,
  p_user_id UUID,
  p_qr_code TEXT,
  p_location_lat NUMERIC DEFAULT NULL,
  p_location_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_owner_id UUID;
  v_offer_exists BOOLEAN := FALSE;
  v_already_checked_in BOOLEAN := FALSE;
  v_points_to_award INTEGER := 50;
  v_checkin_id UUID;
BEGIN
  -- Verificar se o negócio pertence ao usuário autenticado
  SELECT owner_id INTO v_business_owner_id
  FROM public.businesses
  WHERE id = p_business_id AND is_active = true;

  IF v_business_owner_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Negócio não encontrado ou não autorizado'
    );
  END IF;

  -- Verificar se a oferta existe e pertence ao negócio
  SELECT EXISTS(
    SELECT 1 FROM public.offers
    WHERE id = p_offer_id 
      AND business_id = p_business_id 
      AND is_active = true
      AND valid_until > now()
  ) INTO v_offer_exists;

  IF NOT v_offer_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Oferta não encontrada ou expirada'
    );
  END IF;

  -- Verificar se o usuário já fez check-in hoje
  SELECT EXISTS(
    SELECT 1 FROM public.checkin_validations
    WHERE business_id = p_business_id
      AND offer_id = p_offer_id
      AND user_id = p_user_id
      AND DATE(created_at) = CURRENT_DATE
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário já fez check-in nesta oferta hoje'
    );
  END IF;

  -- Registrar validação de check-in
  INSERT INTO public.checkin_validations (
    business_id,
    offer_id,
    user_id,
    qr_code,
    validated_by,
    points_awarded,
    location_latitude,
    location_longitude
  ) VALUES (
    p_business_id,
    p_offer_id,
    p_user_id,
    p_qr_code,
    auth.uid(),
    v_points_to_award,
    p_location_lat,
    p_location_lng
  ) RETURNING id INTO v_checkin_id;

  -- Adicionar pontos ao usuário
  INSERT INTO public.user_points (
    user_id,
    points_earned,
    action_type,
    offer_id,
    business_id,
    description
  ) VALUES (
    p_user_id,
    v_points_to_award,
    'checkin',
    p_offer_id,
    p_business_id,
    'Check-in validado pelo estabelecimento'
  );

  -- Atualizar total de pontos do usuário
  UPDATE public.profiles
  SET total_points = total_points + v_points_to_award
  WHERE user_id = p_user_id;

  -- Incrementar uso da oferta
  UPDATE public.offers
  SET current_uses = current_uses + 1
  WHERE id = p_offer_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in validado com sucesso',
    'points_awarded', v_points_to_award,
    'checkin_id', v_checkin_id
  );
END;
$$;
