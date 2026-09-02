
-- 1) automatic_raffle_participations: remove authenticated insert policy (service_role only)
DROP POLICY IF EXISTS "Sistema pode criar participações automáticas" ON public.automatic_raffle_participations;

-- 2) offer_checkins: remove authenticated insert policy (only via SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.offer_checkins;

-- 3) user_missions_progress: remove authenticated insert/update policies
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_missions_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_missions_progress;

-- 4) daily_mission_completions: replace direct insert with SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users can insert own mission completions" ON public.daily_mission_completions;

CREATE OR REPLACE FUNCTION public.complete_daily_mission(p_mission_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_points integer;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_user_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  -- Business users don't get consumer gamification rewards
  SELECT user_type INTO v_user_type FROM public.profiles WHERE user_id = v_user_id;
  IF v_user_type = 'business' THEN
    RETURN jsonb_build_object('success', false, 'error', 'business_excluded');
  END IF;

  -- Server-side points table (source of truth)
  v_points := CASE p_mission_key
    WHEN 'view_3_offers' THEN 50
    WHEN 'visit_map' THEN 30
    WHEN 'favorite_offer' THEN 40
    WHEN 'share_offer' THEN 60
    WHEN 'visit_community' THEN 20
    ELSE 0
  END;

  IF v_points = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_mission');
  END IF;

  BEGIN
    INSERT INTO public.daily_mission_completions (user_id, mission_key, points_awarded, mission_date)
    VALUES (v_user_id, p_mission_key, v_points, v_today);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_completed');
  END;

  -- Credit points
  INSERT INTO public.user_points (user_id, points_earned, action_type, description)
  VALUES (v_user_id, v_points, 'checkin', 'Missão diária: ' || p_mission_key);

  PERFORM public.update_user_points(v_user_id, v_points);

  RETURN jsonb_build_object('success', true, 'points', v_points);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_daily_mission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_daily_mission(text) TO authenticated;

-- 5) checkin_validations: allow consumers to view their own; clamp points_awarded to offer.checkin_points
CREATE POLICY "Consumers can view their own checkin validations"
  ON public.checkin_validations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.clamp_checkin_validation_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
BEGIN
  SELECT COALESCE(checkin_points, 0) INTO v_max
  FROM public.offers WHERE id = NEW.offer_id;

  IF NEW.points_awarded IS NULL OR NEW.points_awarded < 0 THEN
    NEW.points_awarded := 0;
  END IF;

  IF v_max IS NOT NULL AND NEW.points_awarded > v_max THEN
    NEW.points_awarded := v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clamp_checkin_validation_points ON public.checkin_validations;
CREATE TRIGGER trg_clamp_checkin_validation_points
  BEFORE INSERT OR UPDATE OF points_awarded ON public.checkin_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.clamp_checkin_validation_points();

-- 6) Storage: drop broad SELECT policies allowing listing on public buckets
DROP POLICY IF EXISTS "Public access to community post images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view offer ai assets" ON storage.objects;

-- 7) Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER helpers/triggers
DO $$
DECLARE
  r record;
  v_sig text;
  -- Functions that ARE user-facing RPCs and must keep authenticated execute
  v_keep_authenticated text[] := ARRAY[
    'award_special_badge','check_admin_status','check_and_award_badges','check_and_award_business_badges',
    'conduct_raffle','confirm_offer_order','contribute_to_campaign','create_business_raffle_secure',
    'create_notification','create_offer_pix_order','create_platform_pix_donation','create_platform_pix_sponsorship',
    'debit_business_points','debit_business_wallet','get_ai_art_usage_this_month','get_ai_text_improvement_usage_this_month',
    'get_business_wallet_balance','get_current_user_admin_status','get_engaged_users_addresses',
    'get_offer_favorite_count','get_offers_by_interest_compatibility','get_post_stats','get_public_business_info',
    'get_raffle_participants','initialize_business_wallet','is_admin','update_user_points',
    'complete_daily_mission','process_automatic_raffle_participation','has_role','user_owns_business',
    'increment_ai_art_usage','increment_ai_text_improvement_usage','transfer_points','send_points',
    'increment_banner_view','increment_banner_click','get_date_from_timestamp','get_active_platform_pix_key'
  ];
  v_keep_anon text[] := ARRAY['increment_banner_view','increment_banner_click','get_offer_favorite_count','get_post_stats','get_public_business_info'];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    v_sig := format('public.%I(%s)', r.proname, r.args);
    -- Always revoke from PUBLIC and anon by default
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', v_sig);
    IF NOT (r.proname = ANY(v_keep_anon)) THEN
      BEGIN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', v_sig);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
    IF NOT (r.proname = ANY(v_keep_authenticated)) THEN
      BEGIN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', v_sig);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;
