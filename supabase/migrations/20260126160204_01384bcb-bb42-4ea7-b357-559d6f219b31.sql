-- Tabela para armazenar interesses normalizados da plataforma
CREATE TABLE IF NOT EXISTS public.interests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    normalized_name text NOT NULL UNIQUE,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Índice para busca por nome normalizado
CREATE INDEX IF NOT EXISTS idx_interests_normalized_name ON public.interests (normalized_name);
CREATE INDEX IF NOT EXISTS idx_interests_usage_count ON public.interests (usage_count DESC);

-- Tabela relacional para associar interesses às ofertas
CREATE TABLE IF NOT EXISTS public.offer_interests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    interest_id uuid NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(offer_id, interest_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_offer_interests_offer_id ON public.offer_interests (offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_interests_interest_id ON public.offer_interests (interest_id);

-- Habilitar RLS
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_interests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para interests
CREATE POLICY "Anyone can view interests"
ON public.interests FOR SELECT
USING (true);

CREATE POLICY "System can insert interests"
ON public.interests FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update interests"
ON public.interests FOR UPDATE
USING (true)
WITH CHECK (true);

-- Políticas RLS para offer_interests
CREATE POLICY "Anyone can view offer interests"
ON public.offer_interests FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage offer interests"
ON public.offer_interests FOR ALL
USING (
    offer_id IN (
        SELECT o.id FROM offers o
        JOIN businesses b ON b.id = o.business_id
        WHERE b.owner_id = auth.uid()
    )
);

-- Função para normalizar interesse
CREATE OR REPLACE FUNCTION public.normalize_interest(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT lower(trim(regexp_replace(input, '[^\w\sáéíóúàèìòùâêîôûãõç-]', '', 'gi')));
$$;

-- Função para buscar interesses com autocomplete
CREATE OR REPLACE FUNCTION public.search_interests(
    search_term text,
    result_limit integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    name text,
    normalized_name text,
    usage_count integer,
    relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    normalized_search text;
BEGIN
    normalized_search := public.normalize_interest(search_term);
    
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.normalized_name,
        i.usage_count,
        CASE 
            WHEN i.normalized_name = normalized_search THEN 100.0
            WHEN i.normalized_name LIKE normalized_search || '%' THEN 80.0 + (i.usage_count::numeric / 100)
            WHEN i.normalized_name LIKE '%' || normalized_search || '%' THEN 50.0 + (i.usage_count::numeric / 100)
            ELSE 0.0 + (i.usage_count::numeric / 100)
        END as relevance_score
    FROM public.interests i
    WHERE i.normalized_name LIKE '%' || normalized_search || '%'
    ORDER BY relevance_score DESC, i.usage_count DESC
    LIMIT result_limit;
END;
$$;

-- Função para criar ou buscar interesse existente
CREATE OR REPLACE FUNCTION public.upsert_interest(interest_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    normalized text;
    interest_id uuid;
BEGIN
    normalized := public.normalize_interest(interest_name);
    
    SELECT id INTO interest_id
    FROM public.interests
    WHERE normalized_name = normalized;
    
    IF interest_id IS NULL THEN
        INSERT INTO public.interests (name, normalized_name, usage_count)
        VALUES (trim(interest_name), normalized, 1)
        RETURNING id INTO interest_id;
    ELSE
        UPDATE public.interests
        SET usage_count = usage_count + 1, updated_at = now()
        WHERE id = interest_id;
    END IF;
    
    RETURN interest_id;
END;
$$;

-- Função para associar múltiplos interesses a uma oferta
CREATE OR REPLACE FUNCTION public.set_offer_interests(
    p_offer_id uuid,
    p_interests text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    interest_name text;
    interest_id uuid;
BEGIN
    DELETE FROM public.offer_interests WHERE offer_id = p_offer_id;
    
    IF p_interests IS NOT NULL THEN
        FOREACH interest_name IN ARRAY p_interests
        LOOP
            IF interest_name IS NOT NULL AND trim(interest_name) <> '' THEN
                interest_id := public.upsert_interest(interest_name);
                INSERT INTO public.offer_interests (offer_id, interest_id)
                VALUES (p_offer_id, interest_id)
                ON CONFLICT (offer_id, interest_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
END;
$$;

-- Função para buscar ofertas por compatibilidade de interesses
CREATE OR REPLACE FUNCTION public.get_offers_by_interest_compatibility(
    user_interests text[],
    user_lat numeric DEFAULT NULL,
    user_lon numeric DEFAULT NULL,
    max_distance_km numeric DEFAULT 50,
    result_limit integer DEFAULT 50
)
RETURNS TABLE (
    offer_id uuid,
    title text,
    business_id uuid,
    matching_interests integer,
    distance_km numeric,
    compatibility_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH user_normalized_interests AS (
        SELECT public.normalize_interest(unnest) as normalized_interest
        FROM unnest(user_interests)
    ),
    offer_interest_matches AS (
        SELECT 
            o.id as offer_id,
            o.title,
            o.business_id,
            o.latitude,
            o.longitude,
            COUNT(DISTINCT i.id) as matching_count
        FROM public.offers o
        LEFT JOIN public.offer_interests oi ON oi.offer_id = o.id
        LEFT JOIN public.interests i ON i.id = oi.interest_id
        LEFT JOIN user_normalized_interests uni ON i.normalized_name = uni.normalized_interest
        WHERE o.is_active = true
            AND o.valid_until > now()
            AND o.deleted_at IS NULL
        GROUP BY o.id, o.title, o.business_id, o.latitude, o.longitude
    )
    SELECT 
        oim.offer_id,
        oim.title,
        oim.business_id,
        oim.matching_count::integer as matching_interests,
        CASE 
            WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(user_lat)) * cos(radians(oim.latitude)) * 
                    cos(radians(oim.longitude) - radians(user_lon)) + 
                    sin(radians(user_lat)) * sin(radians(oim.latitude))
                ))
            ELSE NULL
        END as distance_km,
        (oim.matching_count * 10.0) + 
        CASE 
            WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
                GREATEST(0, (max_distance_km - (6371 * acos(
                    cos(radians(user_lat)) * cos(radians(oim.latitude)) * 
                    cos(radians(oim.longitude) - radians(user_lon)) + 
                    sin(radians(user_lat)) * sin(radians(oim.latitude))
                )))) / max_distance_km * 5
            ELSE 0
        END as compatibility_score
    FROM offer_interest_matches oim
    WHERE (user_lat IS NULL OR user_lon IS NULL OR 
           (6371 * acos(
               cos(radians(user_lat)) * cos(radians(oim.latitude)) * 
               cos(radians(oim.longitude) - radians(user_lon)) + 
               sin(radians(user_lat)) * sin(radians(oim.latitude))
           )) <= max_distance_km)
    ORDER BY compatibility_score DESC, matching_count DESC
    LIMIT result_limit;
END;
$$;