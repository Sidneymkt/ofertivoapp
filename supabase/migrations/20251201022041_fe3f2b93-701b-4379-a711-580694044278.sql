-- Add policy for admins to upload platform images to avatars bucket
CREATE POLICY "Admins can upload platform images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'platform'
  AND public.is_admin()
);

-- Add policy for admins to update platform images in avatars bucket
CREATE POLICY "Admins can update platform images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'platform'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'platform'
  AND public.is_admin()
);

-- Add policy for admins to delete platform images in avatars bucket
CREATE POLICY "Admins can delete platform images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'platform'
  AND public.is_admin()
);