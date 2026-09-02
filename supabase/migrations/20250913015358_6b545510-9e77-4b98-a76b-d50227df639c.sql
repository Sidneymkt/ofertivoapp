-- Fix discount_percentage to be editable and computed when not provided
-- 1) Make column a normal, nullable integer (remove identity/generated/default restrictions if any)
DO $$
BEGIN
  -- Drop identity if it was mistakenly set
  BEGIN
    EXECUTE 'ALTER TABLE public.offers ALTER COLUMN discount_percentage DROP IDENTITY IF EXISTS';
  EXCEPTION WHEN others THEN
    -- ignore if not identity
    NULL;
  END;

  -- Drop generated expression if it exists (Postgres 12+)
  BEGIN
    EXECUTE 'ALTER TABLE public.offers ALTER COLUMN discount_percentage DROP EXPRESSION IF EXISTS';
  EXCEPTION WHEN others THEN
    -- ignore if not generated
    NULL;
  END;

  -- Ensure it's integer, nullable, and without a forced default
  BEGIN
    EXECUTE 'ALTER TABLE public.offers ALTER COLUMN discount_percentage DROP DEFAULT';
  EXCEPTION WHEN others THEN
    NULL;
  END;

  -- Cast to integer in case of numeric
  BEGIN
    EXECUTE 'ALTER TABLE public.offers ALTER COLUMN discount_percentage TYPE integer USING (CASE WHEN discount_percentage IS NULL THEN NULL ELSE ROUND(discount_percentage::numeric)::integer END)';
  EXCEPTION WHEN others THEN
    -- if already integer, ignore
    NULL;
  END;

  -- Allow NULLs
  BEGIN
    EXECUTE 'ALTER TABLE public.offers ALTER COLUMN discount_percentage DROP NOT NULL';
  EXCEPTION WHEN others THEN
    NULL;
  END;
END$$;

-- 2) Create a trigger to automatically calculate discount_percentage if not provided
CREATE OR REPLACE FUNCTION public.set_discount_percentage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct integer;
BEGIN
  -- Only try to compute if we have valid prices
  IF NEW.original_price IS NOT NULL AND NEW.original_price > 0
     AND NEW.discounted_price IS NOT NULL AND NEW.discounted_price >= 0 THEN

    -- If user didn't provide or provided out-of-range value, compute
    IF NEW.discount_percentage IS NULL OR NEW.discount_percentage < 0 OR NEW.discount_percentage > 100
       OR TG_OP = 'INSERT'
       OR (COALESCE(NEW.original_price,0) <> COALESCE(OLD.original_price,0))
       OR (COALESCE(NEW.discounted_price,0) <> COALESCE(OLD.discounted_price,0)) THEN

      v_pct := GREATEST(0, LEAST(100, ROUND(((NEW.original_price - NEW.discounted_price) * 100.0) / NEW.original_price))::integer);
      NEW.discount_percentage := v_pct;
    END IF;
  ELSE
    -- If prices are not valid, leave as NULL
    NEW.discount_percentage := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_discount_percentage ON public.offers;
CREATE TRIGGER trg_set_discount_percentage
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.set_discount_percentage();