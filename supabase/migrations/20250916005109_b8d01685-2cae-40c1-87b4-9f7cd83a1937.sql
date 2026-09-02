-- Adicionar campo bio para perfis de usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Garantir que perfis públicos são acessíveis a qualquer visitante
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

CREATE POLICY "Anyone can view public profiles" 
ON public.profiles 
FOR SELECT 
USING (true);