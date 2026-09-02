-- Políticas para o bucket offer-images
-- Primeiro, remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload offer images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own offer images" ON storage.objects;

-- Política para visualizar imagens do bucket offer-images (público)
CREATE POLICY "Public can view offer images" ON storage.objects
FOR SELECT USING (bucket_id = 'offer-images');

-- Política para upload de imagens por usuários autenticados
CREATE POLICY "Authenticated users can upload offer images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'offer-images' 
  AND auth.uid() IS NOT NULL
);

-- Política para atualizar imagens 
CREATE POLICY "Users can update offer images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'offer-images' 
  AND auth.uid() IS NOT NULL
);

-- Política para deletar imagens
CREATE POLICY "Users can delete offer images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'offer-images' 
  AND auth.uid() IS NOT NULL
);