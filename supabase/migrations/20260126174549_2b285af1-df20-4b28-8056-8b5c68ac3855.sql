
-- Adicionar política para permitir que anunciantes atualizem campos de patrocínio em campanhas
-- Isso é necessário para que o sistema de patrocínio funcione corretamente

-- Primeiro, adicionar política que permite anunciantes (donos de negócio) atualizarem 
-- os campos de patrocínio em qualquer campanha ativa
CREATE POLICY "Business owners can sponsor campaigns" 
ON public.crowdfunding_campaigns 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.owner_id = auth.uid() 
    AND b.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.owner_id = auth.uid() 
    AND b.is_active = true
  )
);

-- Também adicionar política para patrocinios_vaquinha permitir que donos de negócio 
-- visualizem seus próprios patrocínios (caso não exista)
DO $$ 
BEGIN
  -- Verificar se a política já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patrocinios_vaquinha' 
    AND policyname = 'Business owners can view own sponsorships'
  ) THEN
    CREATE POLICY "Business owners can view own sponsorships" 
    ON public.patrocinios_vaquinha 
    FOR SELECT 
    USING (
      business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Política para inserir patrocínios
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patrocinios_vaquinha' 
    AND policyname = 'Business owners can create sponsorships'
  ) THEN
    CREATE POLICY "Business owners can create sponsorships" 
    ON public.patrocinios_vaquinha 
    FOR INSERT 
    WITH CHECK (
      business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Política para atualizar patrocínios (cancelar)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patrocinios_vaquinha' 
    AND policyname = 'Business owners can update own sponsorships'
  ) THEN
    CREATE POLICY "Business owners can update own sponsorships" 
    ON public.patrocinios_vaquinha 
    FOR UPDATE 
    USING (
      business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Habilitar RLS se não estiver habilitado
ALTER TABLE public.patrocinios_vaquinha ENABLE ROW LEVEL SECURITY;
