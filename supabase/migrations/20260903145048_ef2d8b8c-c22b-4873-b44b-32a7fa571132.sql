CREATE OR REPLACE FUNCTION public.apply_migration_sql(sql_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_migration_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_migration_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_migration_sql(text) TO anon;
