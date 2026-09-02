-- 1. Storage: enforce folder ownership on offer-images uploads
DROP POLICY IF EXISTS "Authenticated users can upload offer images" ON storage.objects;
CREATE POLICY "Authenticated users can upload offer images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2. Guard wrappers for sensitive SECURITY DEFINER functions
-- update_user_points
ALTER FUNCTION public.update_user_points(uuid, integer) RENAME TO update_user_points_internal;
REVOKE ALL ON FUNCTION public.update_user_points_internal(uuid, integer) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.update_user_points(user_id uuid, points_to_add integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to award points to another user';
  END IF;
  PERFORM public.update_user_points_internal(user_id, points_to_add);
END;
$$;

-- award_special_badge
ALTER FUNCTION public.award_special_badge(uuid, text) RENAME TO award_special_badge_internal;
REVOKE ALL ON FUNCTION public.award_special_badge_internal(uuid, text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.award_special_badge(user_id_param uuid, badge_name_param text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin()
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to award badges';
  END IF;
  PERFORM public.award_special_badge_internal(user_id_param, badge_name_param);
END;
$$;

-- create_notification
ALTER FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) RENAME TO create_notification_internal;
REVOKE ALL ON FUNCTION public.create_notification_internal(uuid, text, text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, p_title text, p_message text, p_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb, p_related_id uuid DEFAULT NULL::uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to create notifications for another user';
  END IF;
  RETURN public.create_notification_internal(p_user_id, p_title, p_message, p_type, p_metadata, p_related_id);
END;
$$;

-- check_and_award_badges
ALTER FUNCTION public.check_and_award_badges(uuid) RENAME TO check_and_award_badges_internal;
REVOKE ALL ON FUNCTION public.check_and_award_badges_internal(uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.check_and_award_badges(user_id_param uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_id_param AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM public.check_and_award_badges_internal(user_id_param);
END;
$$;

-- check_and_award_business_badges
ALTER FUNCTION public.check_and_award_business_badges(uuid) RENAME TO check_and_award_business_badges_internal;
REVOKE ALL ON FUNCTION public.check_and_award_business_badges_internal(uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.check_and_award_business_badges(business_id_param uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.user_owns_business(business_id_param) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM public.check_and_award_business_badges_internal(business_id_param);
END;
$$;

-- debit_business_points
ALTER FUNCTION public.debit_business_points(uuid, uuid, uuid, integer) RENAME TO debit_business_points_internal;
REVOKE ALL ON FUNCTION public.debit_business_points_internal(uuid, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.debit_business_points(p_business_id uuid, p_offer_id uuid, p_user_id uuid, p_points integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.user_owns_business(p_business_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized for this business';
  END IF;
  RETURN public.debit_business_points_internal(p_business_id, p_offer_id, p_user_id, p_points);
END;
$$;

-- debit_business_wallet
ALTER FUNCTION public.debit_business_wallet(uuid, integer, uuid, uuid, text) RENAME TO debit_business_wallet_internal;
REVOKE ALL ON FUNCTION public.debit_business_wallet_internal(uuid, integer, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.debit_business_wallet(
  p_business_id uuid, p_amount integer, p_offer_id uuid, p_user_id uuid,
  p_description text DEFAULT 'Check-in validado'::text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.user_owns_business(p_business_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized for this business';
  END IF;
  RETURN public.debit_business_wallet_internal(p_business_id, p_amount, p_offer_id, p_user_id, p_description);
END;
$$;

-- initialize_business_wallet
ALTER FUNCTION public.initialize_business_wallet(uuid) RENAME TO initialize_business_wallet_internal;
REVOKE ALL ON FUNCTION public.initialize_business_wallet_internal(uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.initialize_business_wallet(p_business_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.user_owns_business(p_business_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized for this business';
  END IF;
  RETURN public.initialize_business_wallet_internal(p_business_id);
END;
$$;

-- process_automatic_raffle_participation
ALTER FUNCTION public.process_automatic_raffle_participation(uuid, text, uuid, uuid) RENAME TO process_automatic_raffle_participation_internal;
REVOKE ALL ON FUNCTION public.process_automatic_raffle_participation_internal(uuid, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.process_automatic_raffle_participation(
  p_user_id uuid, p_action_type text, p_trigger_id uuid DEFAULT NULL::uuid, p_business_id uuid DEFAULT NULL::uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM public.process_automatic_raffle_participation_internal(p_user_id, p_action_type, p_trigger_id, p_business_id);
END;
$$;

-- conduct_raffle
ALTER FUNCTION public.conduct_raffle(uuid) RENAME TO conduct_raffle_internal;
REVOKE ALL ON FUNCTION public.conduct_raffle_internal(uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.conduct_raffle(raffle_id_param uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.user_owns_raffle_business(raffle_id_param) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized for this raffle';
  END IF;
  RETURN public.conduct_raffle_internal(raffle_id_param);
END;
$$;

-- 3. Grants: authenticated only (anon keeps only public banner counters)
REVOKE ALL ON FUNCTION public.update_user_points(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_special_badge(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_and_award_business_badges(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.debit_business_points(uuid, uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.debit_business_wallet(uuid, integer, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.initialize_business_wallet(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_automatic_raffle_participation(uuid, text, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.conduct_raffle(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_user_points(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_special_badge(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_award_business_badges(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.debit_business_points(uuid, uuid, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.debit_business_wallet(uuid, integer, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_business_wallet(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_automatic_raffle_participation(uuid, text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.conduct_raffle(uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.update_user_points_internal(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_special_badge_internal(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification_internal(uuid, text, text, text, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges_internal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_award_business_badges_internal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_business_points_internal(uuid, uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_business_wallet_internal(uuid, integer, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.initialize_business_wallet_internal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_automatic_raffle_participation_internal(uuid, text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.conduct_raffle_internal(uuid) TO service_role;