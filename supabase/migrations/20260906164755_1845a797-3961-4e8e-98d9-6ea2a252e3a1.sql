-- AVATARS
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- BUSINESS LOGOS
DROP POLICY IF EXISTS "Business logos are publicly viewable" ON storage.objects;
CREATE POLICY "Business logos are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "Owners can upload business logos" ON storage.objects;
CREATE POLICY "Owners can upload business logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners can update business logos" ON storage.objects;
CREATE POLICY "Owners can update business logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-logos' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'business-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners can delete business logos" ON storage.objects;
CREATE POLICY "Owners can delete business logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- COMMUNITY POSTS (leitura pública)
DROP POLICY IF EXISTS "Community post images are publicly viewable" ON storage.objects;
CREATE POLICY "Community post images are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-posts');
