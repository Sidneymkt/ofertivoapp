-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('points', 'checkins', 'reviews', 'referrals', 'offers_used', 'days_active', 'special')),
  criteria_value INTEGER,
  is_active BOOLEAN DEFAULT true,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table to track which badges users have earned
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
CREATE POLICY "Anyone can view active badges" 
ON public.badges 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for user_badges
CREATE POLICY "Users can view own badges" 
ON public.user_badges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public badges" 
ON public.user_badges 
FOR SELECT 
USING (is_unlocked = true);

CREATE POLICY "System can manage user badges" 
ON public.user_badges 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, color, criteria_type, criteria_value, rarity) VALUES 
-- Points badges
('Primeira Compra', 'Realizou sua primeira compra através do app', 'ShoppingBag', '#10B981', 'checkins', 1, 'common'),
('Explorador', 'Acumulou 100 pontos', 'Map', '#3B82F6', 'points', 100, 'common'),
('Colecionador', 'Acumulou 500 pontos', 'Star', '#8B5CF6', 'points', 500, 'rare'),
('Mestre das Ofertas', 'Acumulou 1000 pontos', 'Crown', '#F59E0B', 'points', 1000, 'epic'),
('Lenda', 'Acumulou 2500 pontos', 'Trophy', '#EF4444', 'points', 2500, 'legendary'),

-- Activity badges
('Check-in Novato', 'Realizou 5 check-ins', 'MapPin', '#10B981', 'checkins', 5, 'common'),
('Frequentador', 'Realizou 25 check-ins', 'Calendar', '#3B82F6', 'checkins', 25, 'rare'),
('Viciado em Ofertas', 'Realizou 50 check-ins', 'Zap', '#8B5CF6', 'checkins', 50, 'epic'),

-- Review badges
('Crítico Iniciante', 'Deixou 3 avaliações', 'MessageSquare', '#10B981', 'reviews', 3, 'common'),
('Crítico Expert', 'Deixou 15 avaliações', 'Edit3', '#3B82F6', 'reviews', 15, 'rare'),

-- Referral badges
('Embaixador', 'Indicou 3 amigos', 'Users', '#8B5CF6', 'referrals', 3, 'rare'),
('Influenciador', 'Indicou 10 amigos', 'UserCheck', '#F59E0B', 'referrals', 10, 'epic'),

-- Special badges  
('Pioneiro', 'Um dos primeiros usuários do Ofertivo', 'Rocket', '#EF4444', 'special', null, 'legendary'),
('Sortudo', 'Ganhou um sorteio', 'Gift', '#F59E0B', 'special', null, 'epic'),
('Fiel', 'Usa o app há mais de 30 dias', 'Heart', '#EC4899', 'days_active', 30, 'rare');

-- Create function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  badge_record public.badges%ROWTYPE;
  user_stats RECORD;
  days_active INTEGER;
BEGIN
  -- Get user statistics
  SELECT 
    COALESCE(p.total_points, 0) as total_points,
    COALESCE(checkin_count.count, 0) as checkin_count,
    COALESCE(review_count.count, 0) as review_count,
    COALESCE(referral_count.count, 0) as referral_count,
    p.created_at
  INTO user_stats
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM public.user_points 
    WHERE action_type = 'checkin' 
    GROUP BY user_id
  ) checkin_count ON p.user_id = checkin_count.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM public.reviews 
    GROUP BY user_id
  ) review_count ON p.user_id = review_count.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM public.profiles 
    WHERE referred_by = user_id_param 
    GROUP BY user_id
  ) referral_count ON p.user_id = referral_count.user_id
  WHERE p.user_id = user_id_param;

  -- Calculate days active
  days_active := EXTRACT(DAY FROM (now() - user_stats.created_at));

  -- Check each badge
  FOR badge_record IN SELECT * FROM public.badges WHERE is_active = true LOOP
    -- Skip if user already has this badge
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = user_id_param AND badge_id = badge_record.id AND is_unlocked = true) THEN
      CONTINUE;
    END IF;

    -- Check criteria
    CASE badge_record.criteria_type
      WHEN 'points' THEN
        IF user_stats.total_points >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.total_points, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.total_points,
            is_unlocked = true,
            earned_at = now();
        ELSE
          -- Update progress
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.total_points, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.total_points;
        END IF;
        
      WHEN 'checkins' THEN
        IF user_stats.checkin_count >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.checkin_count, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.checkin_count,
            is_unlocked = true,
            earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.checkin_count, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.checkin_count;
        END IF;
        
      WHEN 'reviews' THEN
        IF user_stats.review_count >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.review_count, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.review_count,
            is_unlocked = true,
            earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.review_count, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.review_count;
        END IF;
        
      WHEN 'referrals' THEN
        IF user_stats.referral_count >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.referral_count, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.referral_count,
            is_unlocked = true,
            earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.referral_count, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = user_stats.referral_count;
        END IF;
        
      WHEN 'days_active' THEN
        IF days_active >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, days_active, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = days_active,
            is_unlocked = true,
            earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, days_active, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET
            progress = days_active;
        END IF;
        
      ELSE
        -- Skip special badges for now
        CONTINUE;
    END CASE;
  END LOOP;
END;
$$;

-- Create function to award special badges
CREATE OR REPLACE FUNCTION public.award_special_badge(user_id_param UUID, badge_name_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  badge_id_var UUID;
BEGIN
  SELECT id INTO badge_id_var 
  FROM public.badges 
  WHERE name = badge_name_param AND criteria_type = 'special' AND is_active = true;
  
  IF badge_id_var IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_unlocked)
    VALUES (user_id_param, badge_id_var, true)
    ON CONFLICT (user_id, badge_id) DO UPDATE SET
      is_unlocked = true,
      earned_at = now();
  END IF;
END;
$$;

-- Create trigger to check badges when user points are updated
CREATE OR REPLACE FUNCTION public.trigger_check_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_user_points_insert
  AFTER INSERT ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_badges();

CREATE TRIGGER after_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_badges();

-- Add trigger for updated_at
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON public.badges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();