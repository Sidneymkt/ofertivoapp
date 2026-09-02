-- 1) Corrigir função de novo usuário e ligar trigger em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  new_user_type text;
BEGIN
  -- Evitar duplicação
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Tipo de usuário
  new_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'consumer');

  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    SELECT user_id INTO referrer_id
    FROM public.profiles
    WHERE user_id::text = NEW.raw_user_meta_data ->> 'referral_code';

    INSERT INTO public.profiles (
      id, user_id, full_name, phone, city, state, user_type, referred_by
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type,
      referrer_id
    );

    IF referrer_id IS NOT NULL THEN
      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (referrer_id, 50, 'referral', 'Pontos por indicar um amigo');

      UPDATE public.profiles
      SET total_points = total_points + 50
      WHERE user_id = referrer_id;

      INSERT INTO public.user_points (user_id, points_earned, action_type, description)
      VALUES (NEW.id, 25, 'signup', 'Pontos de boas-vindas por indicação');

      UPDATE public.profiles
      SET total_points = total_points + 25
      WHERE user_id = NEW.id;
    END IF;
  ELSE
    INSERT INTO public.profiles (
      id, user_id, full_name, phone, city, state, user_type
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'phone',
      COALESCE(NEW.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(NEW.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type
    );

    INSERT INTO public.user_points (user_id, points_earned, action_type, description)
    VALUES (NEW.id, 10, 'signup', 'Pontos de boas-vindas');

    UPDATE public.profiles
    SET total_points = total_points + 10
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2) Triggers de updated_at para tabelas com coluna updated_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;
    CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='offers' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
    CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON public.offers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
    CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='business_subscriptions' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS update_business_subscriptions_updated_at ON public.business_subscriptions;
    CREATE TRIGGER update_business_subscriptions_updated_at
    BEFORE UPDATE ON public.business_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_tickets' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
    CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- 3) Endurecer RLS de businesses (só inserir com owner_id = auth.uid())
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.businesses;
CREATE POLICY "Users insert own business"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());


-- 4) Endurecer RLS de offers (garantir WITH CHECK para proprietário)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.offers;
DROP POLICY IF EXISTS "Business owners can manage own offers" ON public.offers;
CREATE POLICY "Business owners can manage own offers"
ON public.offers
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
);
-- manter a política pública de select existente (Anyone can view active offers)


-- 5) Endurecer RLS de raffles (garantir WITH CHECK para proprietário)
DROP POLICY IF EXISTS "Business owners can manage own raffles" ON public.raffles;
CREATE POLICY "Business owners can manage own raffles"
ON public.raffles
FOR ALL
TO authenticated
USING (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
);


-- 6) Permitir UPDATE em QR Codes pelo dono do negócio
DROP POLICY IF EXISTS "Business owners can update own QR codes" ON public.qr_codes;
CREATE POLICY "Business owners can update own QR codes"
ON public.qr_codes
FOR UPDATE
TO authenticated
USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
)
WITH CHECK (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);


-- 7) Regras de raffle_entries: numerar ticket, validar status e limitar capacidade, e atualizar contagem
CREATE OR REPLACE FUNCTION public.before_insert_raffle_entries()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  r public.raffles%ROWTYPE;
  max_entry int;
BEGIN
  SELECT * INTO r FROM public.raffles WHERE id = NEW.raffle_id;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Raffle not found';
  END IF;
  IF NOT COALESCE(r.is_active, true) OR now() > r.end_date THEN
    RAISE EXCEPTION 'Raffle is not active or has ended';
  END IF;
  IF r.max_participants IS NOT NULL AND COALESCE(r.current_participants,0) >= r.max_participants THEN
    RAISE EXCEPTION 'Raffle capacity reached';
  END IF;

  SELECT COALESCE(MAX(entry_number), 0) INTO max_entry FROM public.raffle_entries WHERE raffle_id = NEW.raffle_id;
  NEW.entry_number := max_entry + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_before_insert_raffle_entries ON public.raffle_entries;
CREATE TRIGGER trg_before_insert_raffle_entries
BEFORE INSERT ON public.raffle_entries
FOR EACH ROW
EXECUTE FUNCTION public.before_insert_raffle_entries();

CREATE OR REPLACE FUNCTION public.after_insert_raffle_entries()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.raffles
  SET current_participants = COALESCE(current_participants,0) + 1
  WHERE id = NEW.raffle_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_insert_raffle_entries ON public.raffle_entries;
CREATE TRIGGER trg_after_insert_raffle_entries
AFTER INSERT ON public.raffle_entries
FOR EACH ROW
EXECUTE FUNCTION public.after_insert_raffle_entries();