-- Criar tabela de selos/badges para negócios
CREATE TABLE public.business_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  criteria_type text NOT NULL, -- 'offers_created', 'followers', 'positive_reviews', 'checkins_received', 'raffles_created'
  criteria_value integer NOT NULL,
  rarity text NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de conquistas de negócios
CREATE TABLE public.business_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.business_badges(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  is_unlocked boolean DEFAULT false,
  earned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id, badge_id)
);

-- Habilitar RLS
ALTER TABLE public.business_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_achievements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para business_badges
CREATE POLICY "Anyone can view active business badges" 
ON public.business_badges 
FOR SELECT 
USING (is_active = true);

-- Políticas RLS para business_achievements
CREATE POLICY "Business owners can view own achievements" 
ON public.business_achievements 
FOR SELECT 
USING (business_id IN (
  SELECT id FROM businesses WHERE owner_id = auth.uid()
));

CREATE POLICY "Anyone can view unlocked achievements" 
ON public.business_achievements 
FOR SELECT 
USING (is_unlocked = true);

CREATE POLICY "System can manage business achievements" 
ON public.business_achievements 
FOR ALL 
WITH CHECK (true);

-- Inserir badges padrão para negócios
INSERT INTO public.business_badges (name, description, icon, color, criteria_type, criteria_value, rarity) VALUES
-- Ofertas criadas
('Primeiro Passo', 'Criou sua primeira oferta', '🎯', '#10B981', 'offers_created', 1, 'common'),
('Empreendedor Ativo', 'Criou 5 ofertas', '🚀', '#3B82F6', 'offers_created', 5, 'common'),
('Mestre das Ofertas', 'Criou 25 ofertas', '👑', '#F59E0B', 'offers_created', 25, 'rare'),
('Lenda das Promoções', 'Criou 100 ofertas', '⭐', '#8B5CF6', 'offers_created', 100, 'legendary'),

-- Seguidores
('Conquistando Corações', 'Conseguiu 10 seguidores', '❤️', '#EF4444', 'followers', 10, 'common'),
('Influenciador Local', 'Conseguiu 50 seguidores', '📈', '#3B82F6', 'followers', 50, 'rare'),
('Fenômeno Regional', 'Conseguiu 200 seguidores', '🌟', '#F59E0B', 'followers', 200, 'epic'),
('Sensação Nacional', 'Conseguiu 1000 seguidores', '🏆', '#8B5CF6', 'followers', 1000, 'legendary'),

-- Avaliações positivas (4-5 estrelas)
('Bem Avaliado', 'Recebeu 5 avaliações positivas', '⭐', '#10B981', 'positive_reviews', 5, 'common'),
('Excelência Reconhecida', 'Recebeu 25 avaliações positivas', '🌟', '#3B82F6', 'positive_reviews', 25, 'rare'),
('Padrão Ouro', 'Recebeu 100 avaliações positivas', '🏅', '#F59E0B', 'positive_reviews', 100, 'epic'),

-- Check-ins recebidos
('Primeiro Cliente', 'Recebeu primeiro check-in', '📍', '#10B981', 'checkins_received', 1, 'common'),
('Ponto de Encontro', 'Recebeu 50 check-ins', '🎯', '#3B82F6', 'checkins_received', 50, 'common'),
('Destino Popular', 'Recebeu 200 check-ins', '🔥', '#F59E0B', 'checkins_received', 200, 'rare'),
('Lenda Urbana', 'Recebeu 1000 check-ins', '💎', '#8B5CF6', 'checkins_received', 1000, 'legendary'),

-- Sorteios realizados
('Sortudo Iniciante', 'Realizou primeiro sorteio', '🎲', '#10B981', 'raffles_created', 1, 'common'),
('Mestre dos Sorteios', 'Realizou 10 sorteios', '🎰', '#3B82F6', 'raffles_created', 10, 'rare'),
('Rei da Sorte', 'Realizou 50 sorteios', '👑', '#F59E0B', 'raffles_created', 50, 'epic');

-- Função para verificar e conceder badges para negócios
CREATE OR REPLACE FUNCTION public.check_and_award_business_badges(business_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_record public.business_badges%ROWTYPE;
  business_stats RECORD;
BEGIN
  -- Buscar estatísticas do negócio
  SELECT 
    b.id,
    COALESCE(offer_count.count, 0) as offers_created,
    COALESCE(b.followers_count, 0) as followers_count,
    COALESCE(positive_reviews.count, 0) as positive_reviews_count,
    COALESCE(checkin_count.count, 0) as checkins_received,
    COALESCE(raffle_count.count, 0) as raffles_created
  INTO business_stats
  FROM public.businesses b
  LEFT JOIN (
    SELECT business_id, COUNT(*) as count 
    FROM public.offers 
    WHERE business_id = business_id_param
    GROUP BY business_id
  ) offer_count ON b.id = offer_count.business_id
  LEFT JOIN (
    SELECT business_id, COUNT(*) as count 
    FROM public.business_reviews 
    WHERE business_id = business_id_param AND rating >= 4
    GROUP BY business_id
  ) positive_reviews ON b.id = positive_reviews.business_id
  LEFT JOIN (
    SELECT business_id, COUNT(*) as count 
    FROM public.offer_checkins 
    WHERE business_id = business_id_param
    GROUP BY business_id
  ) checkin_count ON b.id = checkin_count.business_id
  LEFT JOIN (
    SELECT business_id, COUNT(*) as count 
    FROM public.raffles 
    WHERE business_id = business_id_param
    GROUP BY business_id
  ) raffle_count ON b.id = raffle_count.business_id
  WHERE b.id = business_id_param;

  -- Verificar cada badge
  FOR badge_record IN SELECT * FROM public.business_badges WHERE is_active = true LOOP
    -- Pular se o negócio já tem esse badge desbloqueado
    IF EXISTS (
      SELECT 1 FROM public.business_achievements 
      WHERE business_id = business_id_param 
      AND badge_id = badge_record.id 
      AND is_unlocked = true
    ) THEN
      CONTINUE;
    END IF;

    -- Verificar critérios
    CASE badge_record.criteria_type
      WHEN 'offers_created' THEN
        IF business_stats.offers_created >= badge_record.criteria_value THEN
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked, earned_at)
          VALUES (business_id_param, badge_record.id, business_stats.offers_created, true, now())
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.offers_created,
            is_unlocked = true,
            earned_at = now(),
            updated_at = now();
        ELSE
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked)
          VALUES (business_id_param, badge_record.id, business_stats.offers_created, false)
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.offers_created,
            updated_at = now();
        END IF;
        
      WHEN 'followers' THEN
        IF business_stats.followers_count >= badge_record.criteria_value THEN
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked, earned_at)
          VALUES (business_id_param, badge_record.id, business_stats.followers_count, true, now())
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.followers_count,
            is_unlocked = true,
            earned_at = now(),
            updated_at = now();
        ELSE
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked)
          VALUES (business_id_param, badge_record.id, business_stats.followers_count, false)
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.followers_count,
            updated_at = now();
        END IF;
        
      WHEN 'positive_reviews' THEN
        IF business_stats.positive_reviews_count >= badge_record.criteria_value THEN
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked, earned_at)
          VALUES (business_id_param, badge_record.id, business_stats.positive_reviews_count, true, now())
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.positive_reviews_count,
            is_unlocked = true,
            earned_at = now(),
            updated_at = now();
        ELSE
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked)
          VALUES (business_id_param, badge_record.id, business_stats.positive_reviews_count, false)
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.positive_reviews_count,
            updated_at = now();
        END IF;
        
      WHEN 'checkins_received' THEN
        IF business_stats.checkins_received >= badge_record.criteria_value THEN
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked, earned_at)
          VALUES (business_id_param, badge_record.id, business_stats.checkins_received, true, now())
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.checkins_received,
            is_unlocked = true,
            earned_at = now(),
            updated_at = now();
        ELSE
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked)
          VALUES (business_id_param, badge_record.id, business_stats.checkins_received, false)
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.checkins_received,
            updated_at = now();
        END IF;
        
      WHEN 'raffles_created' THEN
        IF business_stats.raffles_created >= badge_record.criteria_value THEN
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked, earned_at)
          VALUES (business_id_param, badge_record.id, business_stats.raffles_created, true, now())
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.raffles_created,
            is_unlocked = true,
            earned_at = now(),
            updated_at = now();
        ELSE
          INSERT INTO public.business_achievements (business_id, badge_id, progress, is_unlocked)
          VALUES (business_id_param, badge_record.id, business_stats.raffles_created, false)
          ON CONFLICT (business_id, badge_id) DO UPDATE SET
            progress = business_stats.raffles_created,
            updated_at = now();
        END IF;
        
      ELSE
        CONTINUE;
    END CASE;
  END LOOP;
END;
$$;

-- Trigger para verificar badges quando ações relevantes acontecem
CREATE OR REPLACE FUNCTION public.trigger_business_badge_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Para inserções em ofertas, check-ins, avaliações, etc.
  IF TG_TABLE_NAME = 'offers' THEN
    PERFORM public.check_and_award_business_badges(NEW.business_id);
  ELSIF TG_TABLE_NAME = 'offer_checkins' THEN
    PERFORM public.check_and_award_business_badges(NEW.business_id);
  ELSIF TG_TABLE_NAME = 'business_reviews' THEN
    PERFORM public.check_and_award_business_badges(NEW.business_id);
  ELSIF TG_TABLE_NAME = 'raffles' THEN
    PERFORM public.check_and_award_business_badges(NEW.business_id);
  ELSIF TG_TABLE_NAME = 'follows' THEN
    PERFORM public.check_and_award_business_badges(NEW.business_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar triggers
CREATE TRIGGER trigger_offers_badge_check
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_badge_check();

CREATE TRIGGER trigger_checkins_badge_check
  AFTER INSERT ON public.offer_checkins
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_badge_check();

CREATE TRIGGER trigger_reviews_badge_check
  AFTER INSERT ON public.business_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_badge_check();

CREATE TRIGGER trigger_raffles_badge_check
  AFTER INSERT ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_badge_check();

CREATE TRIGGER trigger_follows_badge_check
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_badge_check();