-- Corrigir patrocinadores não vinculados em campanhas com patrocínios ativos
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT pv.campanha_id, pv.business_id, pv.multiplicador
    FROM patrocinios_vaquinha pv
    JOIN crowdfunding_campaigns cc ON cc.id = pv.campanha_id
    WHERE pv.is_active = true
      AND cc.patrocinador_id IS NULL
  LOOP
    UPDATE crowdfunding_campaigns
    SET patrocinador_id = r.business_id,
        multiplicador_patrocinio = r.multiplicador,
        updated_at = now()
    WHERE id = r.campanha_id;
    
    RAISE NOTICE 'Vinculado business % à campanha %', r.business_id, r.campanha_id;
  END LOOP;
END $$;