-- Remover políticas que dependem da função is_authorized_advertiser()
DROP POLICY IF EXISTS "Authorized advertisers can insert offers" ON public.offers;
DROP POLICY IF EXISTS "Authorized advertisers can insert raffles" ON public.raffles;

-- Agora remover a função
DROP FUNCTION IF EXISTS public.is_authorized_advertiser();

-- Criar política de INSERT para offers (libera para donos de negócios ativos OU emails de teste)
CREATE POLICY "Business owners and test accounts can insert offers"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
    AND b.is_active = true
  )
  OR auth.email() IN (
    'empreendeon@gmail.com',
    'consultmotos@gmail.com',
    'ivaiqda@gmail.com'
  )
);

-- Criar política de INSERT para raffles (libera para donos de negócios ativos OU emails de teste)
CREATE POLICY "Business owners and test accounts can insert raffles"
ON public.raffles
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT businesses.id
    FROM businesses
    WHERE businesses.owner_id = auth.uid()
    AND businesses.is_active = true
  )
  OR auth.email() IN (
    'empreendeon@gmail.com',
    'consultmotos@gmail.com',
    'ivaiqda@gmail.com'
  )
);