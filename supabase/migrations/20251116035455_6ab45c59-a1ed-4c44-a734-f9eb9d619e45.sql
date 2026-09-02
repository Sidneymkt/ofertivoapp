-- Atualizar constraint para incluir 'donation' como tipo válido de ação
ALTER TABLE user_points
DROP CONSTRAINT IF EXISTS user_points_action_type_check;

ALTER TABLE user_points
ADD CONSTRAINT user_points_action_type_check
CHECK (action_type = ANY (ARRAY[
  'checkin'::text,
  'share'::text,
  'review'::text,
  'signup'::text,
  'follow'::text,
  'raffle_entry'::text,
  'transfer'::text,
  'donation'::text
]));