
-- Drop existing FK and recreate with CASCADE for business_analytics
ALTER TABLE public.business_analytics DROP CONSTRAINT IF EXISTS business_analytics_offer_id_fkey;
ALTER TABLE public.business_analytics ADD CONSTRAINT business_analytics_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

-- Do the same for other tables that reference offers to ensure clean deletion
ALTER TABLE public.offer_likes DROP CONSTRAINT IF EXISTS offer_likes_offer_id_fkey;
ALTER TABLE public.offer_likes ADD CONSTRAINT offer_likes_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.offer_views DROP CONSTRAINT IF EXISTS fk_offer_views_offer;
ALTER TABLE public.offer_views ADD CONSTRAINT fk_offer_views_offer 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_offer_id_fkey;
ALTER TABLE public.favorites ADD CONSTRAINT favorites_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS fk_favorites_offer;
ALTER TABLE public.favorites ADD CONSTRAINT fk_favorites_offer 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.offer_checkins DROP CONSTRAINT IF EXISTS offer_checkins_offer_id_fkey;
ALTER TABLE public.offer_checkins ADD CONSTRAINT offer_checkins_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.checkin_validations DROP CONSTRAINT IF EXISTS checkin_validations_offer_id_fkey;
ALTER TABLE public.checkin_validations ADD CONSTRAINT checkin_validations_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.manual_checkin_codes DROP CONSTRAINT IF EXISTS manual_checkin_codes_offer_id_fkey;
ALTER TABLE public.manual_checkin_codes ADD CONSTRAINT manual_checkin_codes_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.offer_interests DROP CONSTRAINT IF EXISTS offer_interests_offer_id_fkey;
ALTER TABLE public.offer_interests ADD CONSTRAINT offer_interests_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE public.business_points_transactions DROP CONSTRAINT IF EXISTS business_points_transactions_offer_id_fkey;
ALTER TABLE public.business_points_transactions ADD CONSTRAINT business_points_transactions_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.business_active_advantages DROP CONSTRAINT IF EXISTS business_active_advantages_offer_id_fkey;
ALTER TABLE public.business_active_advantages ADD CONSTRAINT business_active_advantages_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;
