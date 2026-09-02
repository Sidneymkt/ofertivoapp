-- Primeiro, vamos assegurar que temos uma business para o usuário
-- Criar uma business temporária se não existir para permitir criação de ofertas
DO $$
BEGIN
  -- Inserir um business padrão para usuários que não têm
  INSERT INTO businesses (
    id,
    owner_id, 
    name, 
    description, 
    category, 
    address, 
    latitude, 
    longitude,
    is_active
  ) 
  SELECT 
    gen_random_uuid(),
    p.user_id,
    COALESCE(p.full_name, 'Negócio sem nome') || ' - Estabelecimento',
    'Estabelecimento criado automaticamente',
    'outros',
    'Manaus, AM',
    -3.1190275,
    -60.0217314,
    true
  FROM profiles p 
  WHERE p.user_type = 'business' 
    AND NOT EXISTS (
      SELECT 1 FROM businesses b 
      WHERE b.owner_id = p.user_id
    );
END $$;