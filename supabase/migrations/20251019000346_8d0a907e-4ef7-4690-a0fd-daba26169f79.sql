-- Adicionar coluna cover_image_url na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Adicionar coluna cover_image_url na tabela businesses (se ainda não existir)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS cover_image_url text;