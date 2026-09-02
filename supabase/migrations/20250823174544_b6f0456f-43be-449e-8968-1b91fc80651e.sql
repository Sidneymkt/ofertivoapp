
-- Atualizar a tabela raffles para suportar todos os recursos necessários
ALTER TABLE public.raffles 
ADD COLUMN IF NOT EXISTS entry_cost_points integer NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS terms_and_conditions text,
ADD COLUMN IF NOT EXISTS winner_drawn_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_raffles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_raffles_updated_at ON public.raffles;
CREATE TRIGGER trigger_raffles_updated_at
  BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION update_raffles_updated_at();

-- Habilitar realtime para a tabela raffles
ALTER TABLE public.raffles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raffles;

-- Habilitar realtime para raffle_entries
ALTER TABLE public.raffle_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_entries;

-- Criar função para buscar sorteios com participantes
CREATE OR REPLACE FUNCTION get_raffles_with_participants(business_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  title text,
  description text,
  prize text,
  entry_cost integer,
  entry_cost_points integer,
  max_participants integer,
  current_participants integer,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  winner_id uuid,
  is_active boolean,
  image_url text,
  image_urls jsonb,
  terms_and_conditions text,
  winner_drawn_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  participant_names text[]
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.business_id,
    r.title,
    r.description,
    r.prize,
    r.entry_cost,
    COALESCE(r.entry_cost_points, r.entry_cost) as entry_cost_points,
    r.max_participants,
    r.current_participants,
    r.start_date,
    r.end_date,
    r.winner_id,
    r.is_active,
    r.image_url,
    COALESCE(r.image_urls, '[]'::jsonb) as image_urls,
    r.terms_and_conditions,
    r.winner_drawn_at,
    r.created_at,
    COALESCE(r.updated_at, r.created_at) as updated_at,
    COALESCE(
      ARRAY_AGG(p.full_name ORDER BY re.created_at) FILTER (WHERE p.full_name IS NOT NULL),
      ARRAY[]::text[]
    ) as participant_names
  FROM public.raffles r
  LEFT JOIN public.raffle_entries re ON r.id = re.raffle_id
  LEFT JOIN public.profiles p ON re.user_id = p.user_id
  WHERE (business_id_param IS NULL OR r.business_id = business_id_param)
  GROUP BY r.id, r.business_id, r.title, r.description, r.prize, r.entry_cost, 
           r.entry_cost_points, r.max_participants, r.current_participants, 
           r.start_date, r.end_date, r.winner_id, r.is_active, r.image_url, 
           r.image_urls, r.terms_and_conditions, r.winner_drawn_at, 
           r.created_at, r.updated_at
  ORDER BY r.created_at DESC;
END;
$$;

-- Criar storage bucket para imagens de sorteios se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'raffle-images', 
  'raffle-images', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para raffle-images bucket
DELETE FROM storage.policies WHERE bucket_id = 'raffle-images';

CREATE POLICY "Business owners can upload raffle images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'raffle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view raffle images"
ON storage.objects FOR SELECT
USING (bucket_id = 'raffle-images');

CREATE POLICY "Business owners can update own raffle images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'raffle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business owners can delete own raffle images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'raffle-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
