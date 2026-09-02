
-- Create storage bucket for marketing campaign media
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-media', 'marketing-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to marketing-media bucket
CREATE POLICY "Authenticated users can upload marketing media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketing-media' AND auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Marketing media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketing-media');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete marketing media"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketing-media' AND auth.role() = 'authenticated');
