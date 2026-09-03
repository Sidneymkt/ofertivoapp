CREATE OR REPLACE FUNCTION public.sync_achievement_credits(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_synced integer := 0;
  v_total integer := 0;
  v_balance integer := 0;
  r record;
  v_credits integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF NOT public.user_owns_business(p_business_id, auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  INSERT INTO public.business_achievement_credits (business_id, total_credits)
  VALUES (p_business_id, 0)
  ON CONFLICT (business_id) DO NOTHING;

  FOR r IN
    SELECT ba.badge_id, bb.rarity
    FROM public.business_achievements ba
    JOIN public.business_badges bb ON bb.id = ba.badge_id
    WHERE ba.business_id = p_business_id
      AND ba.is_unlocked = true
      AND NOT EXISTS (
        SELECT 1 FROM public.achievement_credit_transactions t
        WHERE t.business_id = p_business_id
          AND t.badge_id = ba.badge_id
          AND t.transaction_type = 'earn'
      )
  LOOP
    v_credits := public.get_rarity_credits(r.rarity);
    IF v_credits > 0 THEN
      UPDATE public.business_achievement_credits
      SET total_credits = total_credits + v_credits,
          updated_at = now()
      WHERE business_id = p_business_id
      RETURNING total_credits INTO v_balance;

      INSERT INTO public.achievement_credit_transactions (
        business_id, badge_id, transaction_type, amount, balance_after, description
      ) VALUES (
        p_business_id, r.badge_id, 'earn', v_credits, v_balance,
        'Sincronização de créditos por conquista desbloqueada'
      );

      v_synced := v_synced + v_credits;
    END IF;
  END LOOP;

  SELECT total_credits INTO v_total
  FROM public.business_achievement_credits
  WHERE business_id = p_business_id;

  RETURN jsonb_build_object('success', true, 'total_credits', COALESCE(v_total, 0), 'synced_amount', v_synced);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_achievement_credits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_achievement_credits(uuid) TO authenticated, service_role;

DROP TABLE IF EXISTS public.test_apply_helper;
DROP TABLE IF EXISTS public.test_grant_helper;
DROP TABLE IF EXISTS public.test_owner_check;
DROP TABLE IF EXISTS public.test_run_sql;
DROP FUNCTION IF EXISTS public.whoami();