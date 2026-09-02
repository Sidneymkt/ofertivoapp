-- Adicionar política para permitir visualização pública de perfis
CREATE POLICY "Anyone can view public profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Opcional: Se quisermos restringir alguns dados sensíveis, 
-- podemos criar uma view pública mais tarde