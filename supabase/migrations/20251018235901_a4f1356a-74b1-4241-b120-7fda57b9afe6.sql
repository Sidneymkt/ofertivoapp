-- Criar bucket para capas de usuários (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-covers', 'user-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para capas de negócios (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-covers', 'business-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para user-covers

-- Permitir que todos visualizem as capas (bucket público)
CREATE POLICY "Anyone can view user covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-covers');

-- Permitir que usuários façam upload de suas próprias capas
CREATE POLICY "Users can upload their own cover"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que usuários atualizem suas próprias capas
CREATE POLICY "Users can update their own cover"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que usuários deletem suas próprias capas
CREATE POLICY "Users can delete their own cover"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Políticas RLS para business-covers

-- Permitir que todos visualizem as capas de negócios (bucket público)
CREATE POLICY "Anyone can view business covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-covers');

-- Permitir que donos de negócios façam upload de capas
CREATE POLICY "Business owners can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que donos de negócios atualizem capas
CREATE POLICY "Business owners can update covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'business-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir que donos de negócios deletem capas
CREATE POLICY "Business owners can delete covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);