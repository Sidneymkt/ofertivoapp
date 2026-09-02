
-- Community Highlights table
CREATE TABLE public.community_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  tipo_destaque TEXT NOT NULL CHECK (tipo_destaque IN ('oferta', 'sorteio', 'conquista')),
  titulo TEXT NOT NULL,
  descricao_curta TEXT,
  link_destino TEXT,
  imagem TEXT,
  prioridade INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active highlights"
  ON public.community_highlights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage highlights"
  ON public.community_highlights FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- Weekly Ranking table
CREATE TABLE public.community_weekly_ranking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  semana_fim DATE NOT NULL,
  posicao INTEGER NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  ofertas_criadas INTEGER NOT NULL DEFAULT 0,
  cliques INTEGER NOT NULL DEFAULT 0,
  pontos_movimentados INTEGER NOT NULL DEFAULT 0,
  interacoes INTEGER NOT NULL DEFAULT 0,
  sorteios_ativos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, semana_inicio)
);

ALTER TABLE public.community_weekly_ranking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view weekly rankings"
  ON public.community_weekly_ranking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rankings"
  ON public.community_weekly_ranking FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE INDEX idx_community_highlights_ativo ON public.community_highlights (ativo, prioridade DESC);
CREATE INDEX idx_community_weekly_ranking_semana ON public.community_weekly_ranking (semana_inicio DESC, posicao ASC);
