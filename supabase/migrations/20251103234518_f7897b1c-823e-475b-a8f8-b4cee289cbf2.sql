-- Criar bucket para imagens de campanhas
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o bucket campaign-images
-- Permitir que qualquer usuário autenticado faça upload
CREATE POLICY "Usuários autenticados podem fazer upload de imagens de campanha"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir leitura pública das imagens
CREATE POLICY "Imagens de campanha são públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-images');

-- Permitir que usuários atualizem suas próprias imagens
CREATE POLICY "Usuários podem atualizar suas próprias imagens de campanha"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que usuários deletem suas próprias imagens
CREATE POLICY "Usuários podem deletar suas próprias imagens de campanha"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);