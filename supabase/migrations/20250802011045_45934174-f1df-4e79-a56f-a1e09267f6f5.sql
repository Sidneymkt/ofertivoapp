-- Verificar e criar políticas de storage se necessário
-- Política para visualizar imagens do bucket offer-images (já deve ser público)
CREATE POLICY IF NOT EXISTS "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'offer-images');

-- Política para upload de imagens por usuários autenticados
CREATE POLICY IF NOT EXISTS "Users can upload offer images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'offer-images' 
  AND auth.uid() IS NOT NULL
);

-- Política para atualizar imagens próprias
CREATE POLICY IF NOT EXISTS "Users can update own offer images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'offer-images' 
  AND auth.uid() IS NOT NULL
);

-- Política para deletar imagens próprias (opcional, por segurança)
CREATE POLICY IF NOT EXISTS "Users can delete own offer images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'offer-images' 
  AND auth.uid() IS NOT NULL
);