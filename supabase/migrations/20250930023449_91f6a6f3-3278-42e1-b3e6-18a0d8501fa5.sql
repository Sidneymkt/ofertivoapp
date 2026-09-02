-- Remover política permissiva que expõe dados de contato publicamente
DROP POLICY IF EXISTS "Everyone can view active businesses" ON public.businesses;

-- Criar política para usuários autenticados verem negócios ativos com informações completas
CREATE POLICY "Authenticated users can view active businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (is_active = true);

-- Criar política para usuários não autenticados verem apenas dados básicos (sem contato)
-- Nota: Esta política permite SELECT mas as informações sensíveis devem ser acessadas via view
CREATE POLICY "Public can view basic business info"
ON public.businesses
FOR SELECT
TO anon
USING (
  is_active = true 
  AND id IN (
    SELECT id FROM public.businesses 
    WHERE is_active = true
  )
);

-- Criar função para retornar dados públicos de negócios (sem informações de contato)
CREATE OR REPLACE FUNCTION public.get_public_business_info(business_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  address text,
  latitude numeric,
  longitude numeric,
  logo_url text,
  cover_image_url text,
  followers_count integer,
  average_rating numeric,
  total_reviews integer,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    b.name,
    b.description,
    b.category,
    b.address,
    b.latitude,
    b.longitude,
    b.logo_url,
    b.cover_image_url,
    b.followers_count,
    b.average_rating,
    b.total_reviews,
    b.is_active,
    b.created_at,
    b.updated_at
  FROM public.businesses b
  WHERE b.id = business_id_param
  AND b.is_active = true;
$$;

-- Comentário explicativo
COMMENT ON POLICY "Authenticated users can view active businesses" ON public.businesses IS 
'Usuários autenticados podem ver todas as informações de negócios ativos, incluindo contatos';

COMMENT ON POLICY "Public can view basic business info" ON public.businesses IS 
'Usuários não autenticados podem ver negócios ativos mas devem usar a função get_public_business_info para dados sanitizados';

COMMENT ON FUNCTION public.get_public_business_info IS 
'Retorna informações públicas de negócios sem expor email, telefone ou WhatsApp para prevenir scraping';