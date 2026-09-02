-- Corrigir policies RLS para permitir que usuários logados vejam informações básicas dos negócios

-- Remover a policy restritiva atual
DROP POLICY IF EXISTS "Public can view basic business info" ON public.businesses;

-- Criar nova policy que permite acesso a informações básicas para todos (logados e não logados)
CREATE POLICY "Everyone can view active businesses" 
ON public.businesses 
FOR SELECT 
USING (is_active = true);

-- A policy existente para owners continua permitindo acesso completo aos próprios negócios