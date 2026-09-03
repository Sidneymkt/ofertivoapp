CREATE TABLE IF NOT EXISTS public.offer_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  location_latitude numeric,
  location_longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offer_checkins TO authenticated;
GRANT ALL ON public.offer_checkins TO service_role;
ALTER TABLE public.offer_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own checkins" ON public.offer_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Business owners can view their checkins" ON public.offer_checkins FOR SELECT TO authenticated USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_offer_checkins_business ON public.offer_checkins(business_id);
CREATE INDEX IF NOT EXISTS idx_offer_checkins_user ON public.offer_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_checkins_offer ON public.offer_checkins(offer_id);

CREATE TABLE IF NOT EXISTS public.validation_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_validations integer NOT NULL DEFAULT 0,
  unique_users integer NOT NULL DEFAULT 0,
  total_points_awarded integer NOT NULL DEFAULT 0,
  peak_hour integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT validation_analytics_unique UNIQUE (business_id, offer_id, date)
);
GRANT SELECT ON public.validation_analytics TO authenticated;
GRANT ALL ON public.validation_analytics TO service_role;
ALTER TABLE public.validation_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can view own analytics" ON public.validation_analytics FOR SELECT TO authenticated USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE TRIGGER update_validation_analytics_updated_at BEFORE UPDATE ON public.validation_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.automatic_raffle_participations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  raffle_id uuid NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  trigger_action text NOT NULL,
  trigger_id uuid,
  entries_earned integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automatic_raffle_participations_unique UNIQUE (user_id, raffle_id, trigger_action, trigger_id)
);
GRANT SELECT ON public.automatic_raffle_participations TO authenticated;
GRANT ALL ON public.automatic_raffle_participations TO service_role;
ALTER TABLE public.automatic_raffle_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own automatic participations" ON public.automatic_raffle_participations FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.business_pix_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key_type text NOT NULL,
  key_value text NOT NULL,
  holder_name text NOT NULL,
  bank_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_pix_keys TO authenticated;
GRANT ALL ON public.business_pix_keys TO service_role;
ALTER TABLE public.business_pix_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can manage own pix keys" ON public.business_pix_keys FOR ALL TO authenticated USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())) WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE TRIGGER update_business_pix_keys_updated_at BEFORE UPDATE ON public.business_pix_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();