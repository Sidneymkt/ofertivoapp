-- Adicionar coluna de menções na tabela community_posts
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_community_posts_mentions ON public.community_posts USING GIN(mentions);

-- Comentário explicativo
COMMENT ON COLUMN public.community_posts.mentions IS 'Array de menções: [{type: "offer|user|business|raffle|campaign", id: uuid, name: string}]';