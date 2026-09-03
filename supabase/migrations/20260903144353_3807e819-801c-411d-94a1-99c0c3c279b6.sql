-- Create policies for offer images (bucket already created)
CREATE POLICY "Offer images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'offer-images');

CREATE POLICY "Authenticated users can upload offer images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'offer-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own offer images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'offer-images' AND auth.uid() IS NOT NULL);

-- Create business dashboard table for different user roles
CREATE TABLE IF NOT EXISTS public.business_dashboard_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  role TEXT NOT NULL DEFAULT 'advertiser',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_dashboard_access TO authenticated;
GRANT ALL ON public.business_dashboard_access TO service_role;

-- Enable RLS on business_dashboard_access
ALTER TABLE public.business_dashboard_access ENABLE ROW LEVEL SECURITY;

-- Create policies for business dashboard access
CREATE POLICY "Users can view their own dashboard access" 
ON public.business_dashboard_access 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own dashboard access" 
ON public.business_dashboard_access 
FOR ALL 
USING (auth.uid() = user_id);

-- Update offers table to support image URLs from storage
ALTER TABLE public.offers 
ALTER COLUMN image_url SET DEFAULT NULL;