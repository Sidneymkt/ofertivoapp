-- ==========================================
-- SISTEMA DE TRANSFERÊNCIA DE PONTOS E VAQUINHAS DIGITAIS
-- ==========================================

-- 1. Tabela de transferências de pontos entre usuários
CREATE TABLE IF NOT EXISTS public.points_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de campanhas de vaquinha (crowdfunding)
CREATE TABLE IF NOT EXISTS public.crowdfunding_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_points INTEGER NOT NULL CHECK (goal_points > 0),
  current_points INTEGER NOT NULL DEFAULT 0 CHECK (current_points >= 0),
  image_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('community', 'business', 'charity', 'event', 'other')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de contribuições para vaquinhas
CREATE TABLE IF NOT EXISTS public.campaign_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.crowdfunding_campaigns(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela de chat entre usuários (peer-to-peer)
CREATE TABLE IF NOT EXISTS public.user_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT no_self_chat CHECK (user1_id <> user2_id)
);

-- 5. Tabela de mensagens de chat entre usuários
CREATE TABLE IF NOT EXISTS public.user_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.user_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_points_transfers_sender ON public.points_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_points_transfers_receiver ON public.points_transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_points_transfers_created ON public.points_transfers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON public.crowdfunding_campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON public.crowdfunding_campaigns(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.crowdfunding_campaigns(category);

CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON public.campaign_contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contributions_contributor ON public.campaign_contributions(contributor_id);

CREATE INDEX IF NOT EXISTS idx_user_chats_users ON public.user_chats(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_messages_chat ON public.user_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_messages_sender ON public.user_chat_messages(sender_id);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger para atualizar updated_at em transfers
CREATE OR REPLACE FUNCTION update_points_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_points_transfers_updated_at
  BEFORE UPDATE ON public.points_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_points_transfers_updated_at();

-- Trigger para atualizar updated_at em campaigns
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON public.crowdfunding_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Trigger para atualizar user_chats quando nova mensagem chega
CREATE OR REPLACE FUNCTION update_user_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_chats 
  SET updated_at = now() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_user_chats_on_message
  AFTER INSERT ON public.user_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_chats_updated_at();

-- ==========================================
-- FUNÇÕES DE NEGÓCIO
-- ==========================================

-- Função para transferir pontos entre usuários
CREATE OR REPLACE FUNCTION transfer_points(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_points INTEGER;
  v_transfer_id UUID;
BEGIN
  -- Validações
  IF p_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você não pode transferir pontos para si mesmo'
    );
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantidade inválida'
    );
  END IF;

  -- Verificar saldo do remetente
  SELECT total_points INTO v_sender_points
  FROM public.profiles
  WHERE user_id = p_sender_id;

  IF v_sender_points IS NULL OR v_sender_points < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo insuficiente'
    );
  END IF;

  -- Debitar pontos do remetente
  UPDATE public.profiles
  SET total_points = total_points - p_amount
  WHERE user_id = p_sender_id;

  -- Creditar pontos no destinatário
  UPDATE public.profiles
  SET total_points = total_points + p_amount
  WHERE user_id = p_receiver_id;

  -- Registrar transferência
  INSERT INTO public.points_transfers (sender_id, receiver_id, amount, message)
  VALUES (p_sender_id, p_receiver_id, p_amount, p_message)
  RETURNING id INTO v_transfer_id;

  -- Registrar movimentação de pontos para ambos
  INSERT INTO public.user_points (user_id, points_earned, action_type, description)
  VALUES (
    p_sender_id,
    -p_amount,
    'transfer_sent',
    'Transferência enviada: ' || COALESCE(p_message, 'Sem mensagem')
  );

  INSERT INTO public.user_points (user_id, points_earned, action_type, description)
  VALUES (
    p_receiver_id,
    p_amount,
    'transfer_received',
    'Transferência recebida: ' || COALESCE(p_message, 'Sem mensagem')
  );

  -- Criar notificações
  PERFORM create_notification(
    p_receiver_id,
    '💰 Você recebeu pontos!',
    'Você recebeu ' || p_amount || ' pontos. ' || COALESCE(p_message, ''),
    'points_received',
    jsonb_build_object('amount', p_amount, 'sender_id', p_sender_id),
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transferência realizada com sucesso',
    'transfer_id', v_transfer_id
  );
END;
$$;

-- Função para contribuir em uma vaquinha
CREATE OR REPLACE FUNCTION contribute_to_campaign(
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
  v_campaign_active BOOLEAN;
  v_campaign_title TEXT;
  v_contribution_id UUID;
BEGIN
  -- Validações
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quantidade inválida'
    );
  END IF;

  -- Verificar se campanha está ativa
  SELECT is_active, title INTO v_campaign_active, v_campaign_title
  FROM public.crowdfunding_campaigns
  WHERE id = p_campaign_id;

  IF NOT v_campaign_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campanha não está mais ativa'
    );
  END IF;

  -- Verificar saldo do contribuinte
  SELECT total_points INTO v_contributor_points
  FROM public.profiles
  WHERE user_id = p_contributor_id;

  IF v_contributor_points IS NULL OR v_contributor_points < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo insuficiente'
    );
  END IF;

  -- Debitar pontos do contribuinte
  UPDATE public.profiles
  SET total_points = total_points - p_amount
  WHERE user_id = p_contributor_id;

  -- Adicionar pontos na campanha
  UPDATE public.crowdfunding_campaigns
  SET current_points = current_points + p_amount
  WHERE id = p_campaign_id;

  -- Registrar contribuição
  INSERT INTO public.campaign_contributions (
    campaign_id, contributor_id, amount, message, is_anonymous
  )
  VALUES (p_campaign_id, p_contributor_id, p_amount, p_message, p_is_anonymous)
  RETURNING id INTO v_contribution_id;

  -- Registrar movimentação de pontos
  INSERT INTO public.user_points (user_id, points_earned, action_type, description)
  VALUES (
    p_contributor_id,
    -p_amount,
    'campaign_contribution',
    'Contribuição para: ' || v_campaign_title
  );

  -- Notificar criador da campanha
  PERFORM create_notification(
    (SELECT creator_id FROM public.crowdfunding_campaigns WHERE id = p_campaign_id),
    '🎉 Nova contribuição!',
    'Sua campanha "' || v_campaign_title || '" recebeu ' || p_amount || ' pontos!',
    'campaign_contribution',
    jsonb_build_object('amount', p_amount, 'campaign_id', p_campaign_id),
    p_campaign_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contribuição realizada com sucesso!',
    'contribution_id', v_contribution_id
  );
END;
$$;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.points_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowdfunding_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies para points_transfers
CREATE POLICY "Users can view their own transfers"
  ON public.points_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policies para crowdfunding_campaigns
CREATE POLICY "Anyone can view active campaigns"
  ON public.crowdfunding_campaigns FOR SELECT
  TO authenticated
  USING (is_active = true OR creator_id = auth.uid());

CREATE POLICY "Users can create campaigns"
  ON public.crowdfunding_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own campaigns"
  ON public.crowdfunding_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Policies para campaign_contributions
CREATE POLICY "Users can view contributions to campaigns"
  ON public.campaign_contributions FOR SELECT
  TO authenticated
  USING (
    contributor_id = auth.uid() OR 
    campaign_id IN (SELECT id FROM public.crowdfunding_campaigns WHERE creator_id = auth.uid())
  );

-- Policies para user_chats
CREATE POLICY "Users can view their own chats"
  ON public.user_chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create chats"
  ON public.user_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Policies para user_chat_messages
CREATE POLICY "Users can view messages from their chats"
  ON public.user_chat_messages FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT id FROM public.user_chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON public.user_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    chat_id IN (
      SELECT id FROM public.user_chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON public.user_chat_messages FOR UPDATE
  TO authenticated
  USING (
    chat_id IN (
      SELECT id FROM public.user_chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ==========================================
-- REALTIME PARA MENSAGENS
-- ==========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.points_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_contributions;