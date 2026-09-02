CREATE POLICY "Persona library is public to read"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-ai-assets' AND (storage.foldername(name))[1] = 'persona-library');

CREATE POLICY "Authenticated can publish persona library"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'offer-ai-assets' AND (storage.foldername(name))[1] = 'persona-library');

CREATE POLICY "Authenticated can update persona library"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'offer-ai-assets' AND (storage.foldername(name))[1] = 'persona-library')
WITH CHECK (bucket_id = 'offer-ai-assets' AND (storage.foldername(name))[1] = 'persona-library');