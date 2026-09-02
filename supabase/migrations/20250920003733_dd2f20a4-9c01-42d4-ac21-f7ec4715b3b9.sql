-- Criar políticas de storage para o bucket raffle-images

-- Política para permitir que usuários autenticados façam upload de imagens de sorteio
CREATE POLICY "Usuários autenticados podem fazer upload de imagens de sorteio" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'raffle-images' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir que usuários vejam imagens de sorteio
CREATE POLICY "Imagens de sorteio são publicamente visíveis" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'raffle-images');

-- Política para permitir que o dono da imagem possa atualizá-la
CREATE POLICY "Usuários podem atualizar suas próprias imagens de sorteio" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'raffle-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir que o dono da imagem possa deletá-la
CREATE POLICY "Usuários podem deletar suas próprias imagens de sorteio" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'raffle-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verificar se a tabela raffles tem as políticas RLS corretas
-- Política para permitir que negócios vejam seus próprios sorteios
CREATE POLICY "Negócios podem ver seus próprios sorteios" 
ON public.raffles 
FOR SELECT 
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Política para permitir que negócios criem sorteios
CREATE POLICY "Negócios podem criar sorteios" 
ON public.raffles 
FOR INSERT 
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Política para permitir que negócios atualizem seus próprios sorteios
CREATE POLICY "Negócios podem atualizar seus próprios sorteios" 
ON public.raffles 
FOR UPDATE 
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Política para permitir que todos vejam sorteios ativos
CREATE POLICY "Todos podem ver sorteios ativos" 
ON public.raffles 
FOR SELECT 
TO public
USING (is_active = true);

-- Política para entradas de sorteio - usuários podem ver suas próprias entradas
CREATE POLICY "Usuários podem ver suas próprias entradas de sorteio" 
ON public.raffle_entries 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Política para criar entradas de sorteio
CREATE POLICY "Usuários autenticados podem criar entradas de sorteio" 
ON public.raffle_entries 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Política para participações automáticas
CREATE POLICY "Usuários podem ver suas participações automáticas" 
ON public.automatic_raffle_participations 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Política para criar participações automáticas
CREATE POLICY "Sistema pode criar participações automáticas" 
ON public.automatic_raffle_participations 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());