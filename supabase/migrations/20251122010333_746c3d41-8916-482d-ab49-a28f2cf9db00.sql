-- Modificar tabela chats para suportar chat entre usuários
ALTER TABLE chats
ALTER COLUMN business_id DROP NOT NULL;

-- Adicionar coluna para chat usuário-usuário
ALTER TABLE chats
ADD COLUMN target_user_id uuid REFERENCES auth.users(id);

-- Adicionar constraint para garantir que pelo menos um tipo de chat existe
ALTER TABLE chats
ADD CONSTRAINT chats_type_check CHECK (
  (business_id IS NOT NULL AND target_user_id IS NULL) OR
  (business_id IS NULL AND target_user_id IS NOT NULL)
);

-- Criar índice para performance
CREATE INDEX idx_chats_target_user_id ON chats(target_user_id);

-- Atualizar RLS policies para chats
DROP POLICY IF EXISTS "Business owners can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;

-- Policy para business owners verem chats de seus negócios
CREATE POLICY "Business owners can view their chats" ON chats
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Policy para usuários criarem chats (com business ou com outro usuário)
CREATE POLICY "Users can create chats" ON chats
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  (
    (business_id IS NOT NULL AND target_user_id IS NULL) OR
    (business_id IS NULL AND target_user_id IS NOT NULL)
  )
);

-- Policy para usuários verem seus próprios chats
CREATE POLICY "Users can view their own chats" ON chats
FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = target_user_id
);