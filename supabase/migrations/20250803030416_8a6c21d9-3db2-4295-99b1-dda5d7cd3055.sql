-- Primeiro, vamos corrigir o trigger handle_new_user para evitar duplicação
-- e garantir que funcione corretamente com os tipos de usuário

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  referrer_id uuid;
  new_user_type text;
BEGIN
  -- Verificar se já existe um perfil para este usuário (evita duplicação)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new.id) THEN
    RETURN new;
  END IF;

  -- Determinar o tipo de usuário
  new_user_type := COALESCE(new.raw_user_meta_data ->> 'user_type', 'consumer');

  -- Check if there's a referral code in the metadata
  IF new.raw_user_meta_data ? 'referral_code' THEN
    -- Find the user who owns this referral code (using their user_id as referral code)
    SELECT user_id INTO referrer_id 
    FROM profiles 
    WHERE user_id::text = new.raw_user_meta_data ->> 'referral_code';
    
    -- Insert profile with referrer
    INSERT INTO public.profiles (
      id, 
      user_id, 
      full_name, 
      phone, 
      city, 
      state, 
      user_type,
      referred_by
    )
    VALUES (
      new.id,
      new.id, 
      new.raw_user_meta_data ->> 'full_name', 
      new.raw_user_meta_data ->> 'phone',
      COALESCE(new.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(new.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type,
      referrer_id
    );
    
    -- Award referral points to both users if referrer exists
    IF referrer_id IS NOT NULL THEN
      -- Points for the referrer
      INSERT INTO user_points (user_id, points_earned, action_type, description)
      VALUES (referrer_id, 50, 'referral', 'Pontos por indicar um amigo');
      
      -- Update referrer's total points
      UPDATE profiles 
      SET total_points = total_points + 50
      WHERE user_id = referrer_id;
      
      -- Welcome points for the new user
      INSERT INTO user_points (user_id, points_earned, action_type, description)
      VALUES (new.id, 25, 'signup', 'Pontos de boas-vindas por indicação');
      
      -- Update new user's total points
      UPDATE profiles 
      SET total_points = total_points + 25
      WHERE user_id = new.id;
    END IF;
  ELSE
    -- Insert profile without referrer
    INSERT INTO public.profiles (
      id, 
      user_id, 
      full_name, 
      phone, 
      city, 
      state, 
      user_type
    )
    VALUES (
      new.id,
      new.id, 
      new.raw_user_meta_data ->> 'full_name', 
      new.raw_user_meta_data ->> 'phone',
      COALESCE(new.raw_user_meta_data ->> 'city', 'Manaus'),
      COALESCE(new.raw_user_meta_data ->> 'state', 'AM'),
      new_user_type
    );
    
    -- Standard welcome points for new user
    INSERT INTO user_points (user_id, points_earned, action_type, description)
    VALUES (new.id, 10, 'signup', 'Pontos de boas-vindas');
    
    -- Update new user's total points
    UPDATE profiles 
    SET total_points = total_points + 10
    WHERE user_id = new.id;
  END IF;

  RETURN new;
END;
$function$;