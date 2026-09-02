-- Criar bucket para imagens de posts da comunidade
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-posts',
  'community-posts',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Users can upload their own community post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir que todos vejam imagens públicas
CREATE POLICY "Public access to community post images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'community-posts');

-- Política para permitir que usuários deletem suas próprias imagens
CREATE POLICY "Users can delete their own community post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);