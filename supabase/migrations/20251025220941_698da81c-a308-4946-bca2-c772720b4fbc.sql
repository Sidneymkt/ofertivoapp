-- Função para verificar se o usuário está na lista de anunciantes autorizados
CREATE OR REPLACE FUNCTION public.is_authorized_advertiser()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN (
      'empreendeon@gmail.com',
      'consultmotos@gmail.com',
      'ivaiqda@gmail.com'
    )
  );
$$;

-- Remover políticas antigas de INSERT para offers
DROP POLICY IF EXISTS "Business owners can manage own offers" ON public.offers;

-- Criar nova política de INSERT restrita para offers
CREATE POLICY "Authorized advertisers can insert offers"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (
  is_authorized_advertiser() 
  AND business_id IN (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
);

-- Criar política de SELECT para offers (mantém visualização)
CREATE POLICY "Business owners can view own offers"
ON public.offers
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
);

-- Criar política de UPDATE para offers
CREATE POLICY "Business owners can update own offers"
ON public.offers
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
);

-- Criar política de DELETE para offers
CREATE POLICY "Business owners can delete own offers"
ON public.offers
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
);

-- Remover políticas antigas de INSERT para raffles
DROP POLICY IF EXISTS "Negócios podem criar sorteios" ON public.raffles;
DROP POLICY IF EXISTS "raffles_insert_policy" ON public.raffles;

-- Criar nova política de INSERT restrita para raffles
CREATE POLICY "Authorized advertisers can insert raffles"
ON public.raffles
FOR INSERT
TO authenticated
WITH CHECK (
  is_authorized_advertiser()
  AND business_id IN (
    SELECT businesses.id
    FROM businesses
    WHERE businesses.owner_id = auth.uid()
    AND businesses.is_active = true
  )
);