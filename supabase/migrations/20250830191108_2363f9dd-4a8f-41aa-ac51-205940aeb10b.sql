-- Adicionar colunas de latitude e longitude à tabela profiles para coordenadas do endereço
ALTER TABLE public.profiles 
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;

-- Criar índice para consultas baseadas em localização
CREATE INDEX idx_profiles_location ON public.profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;