
-- Add slug column to businesses for personalized hotsite URLs
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses (slug) WHERE slug IS NOT NULL;

-- Function to auto-generate slug from business name
CREATE OR REPLACE FUNCTION public.generate_business_slug(business_name text, business_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Normalize: lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(trim(business_name));
  base_slug := regexp_replace(base_slug, '[àáâãäå]', 'a', 'g');
  base_slug := regexp_replace(base_slug, '[èéêë]', 'e', 'g');
  base_slug := regexp_replace(base_slug, '[ìíîï]', 'i', 'g');
  base_slug := regexp_replace(base_slug, '[òóôõö]', 'o', 'g');
  base_slug := regexp_replace(base_slug, '[ùúûü]', 'u', 'g');
  base_slug := regexp_replace(base_slug, '[ç]', 'c', 'g');
  base_slug := regexp_replace(base_slug, '[ñ]', 'n', 'g');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Try base slug first
  final_slug := base_slug;
  
  LOOP
    -- Check if slug is unique (excluding current business)
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE slug = final_slug AND id != business_id) THEN
      RETURN final_slug;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
END;
$$;

-- Generate slugs for all existing businesses that don't have one
DO $$
DECLARE
  biz RECORD;
BEGIN
  FOR biz IN SELECT id, name FROM public.businesses WHERE slug IS NULL
  LOOP
    UPDATE public.businesses 
    SET slug = public.generate_business_slug(biz.name, biz.id)
    WHERE id = biz.id;
  END LOOP;
END;
$$;
