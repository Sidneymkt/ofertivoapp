-- Trigger para marcar automaticamente novas ofertas como recentes
CREATE OR REPLACE FUNCTION public.auto_mark_offer_as_recent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marcar a nova oferta como recente
  NEW.is_featured_recent := true;
  
  -- Limitar a 12 ofertas recentes (remover as mais antigas)
  UPDATE public.offers
  SET is_featured_recent = false
  WHERE is_featured_recent = true
    AND is_active = true
    AND id != NEW.id
    AND created_at < (
      SELECT created_at 
      FROM public.offers 
      WHERE is_featured_recent = true 
        AND is_active = true
      ORDER BY created_at DESC 
      LIMIT 1 OFFSET 11
    );
  
  RETURN NEW;
END;
$$;

-- Criar o trigger para novas ofertas
DROP TRIGGER IF EXISTS trigger_auto_mark_recent ON public.offers;
CREATE TRIGGER trigger_auto_mark_recent
  BEFORE INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_mark_offer_as_recent();

-- Marcar as ofertas existentes mais recentes como recentes (últimas 12 ativas)
UPDATE public.offers
SET is_featured_recent = true
WHERE id IN (
  SELECT id 
  FROM public.offers 
  WHERE is_active = true 
    AND valid_until > now()
    AND archived_at IS NULL
    AND deleted_at IS NULL
  ORDER BY created_at DESC 
  LIMIT 12
);