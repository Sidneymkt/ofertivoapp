CREATE OR REPLACE FUNCTION public.check_and_award_badges_internal(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  badge_record public.badges%ROWTYPE;
  user_stats record;
  days_active integer;
BEGIN
  SELECT
    COALESCE(p.total_points, 0) AS total_points,
    COALESCE(checkin_count.count, 0) AS checkin_count,
    COALESCE(review_count.count, 0) AS review_count,
    COALESCE(referral_count.count, 0) AS referral_count,
    p.created_at
  INTO user_stats
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS count
    FROM public.user_points
    WHERE action_type = 'checkin'
    GROUP BY user_id
  ) checkin_count ON p.user_id = checkin_count.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS count
    FROM public.reviews
    GROUP BY user_id
  ) review_count ON p.user_id = review_count.user_id
  LEFT JOIN (
    SELECT referred_by AS user_id, COUNT(*) AS count
    FROM public.profiles
    WHERE referred_by = user_id_param
    GROUP BY referred_by
  ) referral_count ON p.user_id = referral_count.user_id
  WHERE p.user_id = user_id_param;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  days_active := EXTRACT(DAY FROM (now() - user_stats.created_at));

  FOR badge_record IN SELECT * FROM public.badges WHERE is_active = true LOOP
    IF EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = user_id_param
        AND badge_id = badge_record.id
        AND is_unlocked = true
    ) THEN
      CONTINUE;
    END IF;

    CASE badge_record.criteria_type
      WHEN 'points' THEN
        IF user_stats.total_points >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.total_points, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.total_points, is_unlocked = true, earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.total_points, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.total_points;
        END IF;
      WHEN 'checkins' THEN
        IF user_stats.checkin_count >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.checkin_count, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.checkin_count, is_unlocked = true, earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.checkin_count, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.checkin_count;
        END IF;
      WHEN 'reviews' THEN
        IF user_stats.review_count >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.review_count, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.review_count, is_unlocked = true, earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.review_count, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.review_count;
        END IF;
      WHEN 'referrals' THEN
        IF user_stats.referral_count >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.referral_count, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.referral_count, is_unlocked = true, earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, user_stats.referral_count, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = user_stats.referral_count;
        END IF;
      WHEN 'days_active' THEN
        IF days_active >= badge_record.criteria_value THEN
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, days_active, true)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = days_active, is_unlocked = true, earned_at = now();
        ELSE
          INSERT INTO public.user_badges (user_id, badge_id, progress, is_unlocked)
          VALUES (user_id_param, badge_record.id, days_active, false)
          ON CONFLICT (user_id, badge_id) DO UPDATE SET progress = days_active;
        END IF;
      ELSE
        CONTINUE;
    END CASE;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_special_badge_internal(user_id_param uuid, badge_name_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  badge_id_var uuid;
BEGIN
  SELECT id INTO badge_id_var
  FROM public.badges
  WHERE name = badge_name_param
    AND criteria_type = 'special'
    AND is_active = true;

  IF badge_id_var IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_unlocked)
    VALUES (user_id_param, badge_id_var, true)
    ON CONFLICT (user_id, badge_id) DO UPDATE SET is_unlocked = true, earned_at = now();
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_and_award_badges_internal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_special_badge_internal(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges_internal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_special_badge_internal(uuid, text) TO service_role;