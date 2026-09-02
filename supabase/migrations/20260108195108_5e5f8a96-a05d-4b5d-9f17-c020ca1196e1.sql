-- Adicionar política para permitir leitura pública de perfis (dados não-sensíveis)
-- Isso é necessário para o ranking e lista de membros da comunidade funcionar

CREATE POLICY "Profiles are publicly viewable"
ON public.profiles
FOR SELECT
USING (true);

-- Manter política para usuários editarem apenas seu próprio perfil
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permitir inserção do próprio perfil
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);