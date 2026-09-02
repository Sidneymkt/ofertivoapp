CREATE TABLE IF NOT EXISTS public.platform_sensitive_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_sensitive_settings TO authenticated;
GRANT ALL ON public.platform_sensitive_settings TO service_role;

ALTER TABLE public.platform_sensitive_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage platform sensitive settings" ON public.platform_sensitive_settings;
CREATE POLICY "Admins can manage platform sensitive settings"
ON public.platform_sensitive_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_platform_sensitive_settings_updated_at ON public.platform_sensitive_settings;
CREATE TRIGGER update_platform_sensitive_settings_updated_at
BEFORE UPDATE ON public.platform_sensitive_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.donations_pix
ADD COLUMN IF NOT EXISTS pix_key_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.patrocinio_pix
ADD COLUMN IF NOT EXISTS pix_key_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Public can read active settings" ON public.platform_settings;
CREATE POLICY "Public can read active settings"
ON public.platform_settings
FOR SELECT
TO public
USING (
  is_active = true
  AND setting_key NOT IN ('pix_key', 'payment_key', 'bank_details', 'financial_credentials')
);

DROP POLICY IF EXISTS "System can insert automatic participations" ON public.automatic_raffle_participations;
DROP POLICY IF EXISTS "Service role can insert automatic participations" ON public.automatic_raffle_participations;
CREATE POLICY "Service role can insert automatic participations"
ON public.automatic_raffle_participations
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_active_platform_pix_key()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pix_key jsonb;
BEGIN
  SELECT setting_value
  INTO v_pix_key
  FROM public.platform_sensitive_settings
  WHERE setting_key = 'pix_key'
    AND is_active = true
  LIMIT 1;

  IF v_pix_key IS NULL THEN
    SELECT setting_value
    INTO v_pix_key
    FROM public.platform_settings
    WHERE setting_key = 'pix_key'
      AND is_active = true
    LIMIT 1;
  END IF;

  IF v_pix_key IS NULL OR coalesce(v_pix_key->>'value', '') = '' THEN
    RAISE EXCEPTION 'Chave PIX da plataforma não configurada';
  END IF;

  RETURN jsonb_build_object(
    'type', coalesce(v_pix_key->>'type', 'pix'),
    'value', v_pix_key->>'value',
    'holder', coalesce(v_pix_key->>'holder', v_pix_key->>'holderName', '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_platform_pix_key() FROM public;
GRANT EXECUTE ON FUNCTION public.get_active_platform_pix_key() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_platform_pix_donation(
  p_valor_total numeric,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS public.donations_pix
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_type text := 'consumidor';
  v_valor_fundo numeric;
  v_valor_convertido numeric;
  v_pontos integer;
  v_transaction_id text;
  v_pix_key jsonb;
  v_row public.donations_pix;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_valor_total IS NULL OR p_valor_total < 1 THEN
    RAISE EXCEPTION 'Valor inválido para doação PIX';
  END IF;

  SELECT CASE WHEN user_type = 'business' THEN 'anunciante' ELSE 'consumidor' END
  INTO v_user_type
  FROM public.profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  v_pix_key := public.get_active_platform_pix_key();
  v_valor_fundo := round((p_valor_total * 0.10)::numeric, 2);
  v_valor_convertido := round((p_valor_total - v_valor_fundo)::numeric, 2);
  v_pontos := round(v_valor_convertido * 100)::integer;
  v_transaction_id := 'PIX-' || extract(epoch from clock_timestamp())::bigint || '-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO public.donations_pix (
    user_id,
    user_type,
    valor_total,
    valor_convertido_pontos,
    valor_fundo,
    pontos_gerados,
    status,
    transaction_id_pix,
    campaign_id,
    pix_key_snapshot
  ) VALUES (
    v_user_id,
    coalesce(v_user_type, 'consumidor'),
    p_valor_total,
    v_valor_convertido,
    v_valor_fundo,
    v_pontos,
    'pending',
    v_transaction_id,
    p_campaign_id,
    v_pix_key
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_platform_pix_donation(numeric, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.create_platform_pix_donation(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_platform_pix_donation(numeric, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.create_platform_pix_sponsorship(
  p_business_id uuid,
  p_valor_total numeric,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS public.patrocinio_pix
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_valor_fundo numeric;
  v_valor_beneficio numeric;
  v_pontos integer;
  v_transaction_id text;
  v_pix_key jsonb;
  v_row public.patrocinio_pix;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_valor_total IS NULL OR p_valor_total < 1 THEN
    RAISE EXCEPTION 'Valor inválido para patrocínio PIX';
  END IF;

  IF NOT public.user_owns_business(v_user_id, p_business_id) THEN
    RAISE EXCEPTION 'Negócio não pertence ao usuário autenticado';
  END IF;

  v_pix_key := public.get_active_platform_pix_key();
  v_valor_fundo := round((p_valor_total * 0.10)::numeric, 2);
  v_valor_beneficio := round((p_valor_total * 0.90)::numeric, 2);
  v_pontos := round(v_valor_beneficio * 100)::integer;
  v_transaction_id := 'PAT-' || extract(epoch from clock_timestamp())::bigint || '-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO public.patrocinio_pix (
    advertiser_id,
    business_id,
    campaign_id,
    valor_total,
    valor_fundo,
    valor_beneficio,
    pontos_gerados,
    status,
    transaction_id_pix,
    pix_key_snapshot
  ) VALUES (
    v_user_id,
    p_business_id,
    p_campaign_id,
    p_valor_total,
    v_valor_fundo,
    v_valor_beneficio,
    v_pontos,
    'pendente',
    v_transaction_id,
    v_pix_key
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_platform_pix_sponsorship(uuid, numeric, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.create_platform_pix_sponsorship(uuid, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_platform_pix_sponsorship(uuid, numeric, uuid) TO service_role;