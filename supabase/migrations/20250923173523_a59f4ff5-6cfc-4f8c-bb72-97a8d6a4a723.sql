-- Fix security warnings by adding SET search_path = public to functions

-- Update create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_related_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, type, metadata, related_id
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_metadata, p_related_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Update notify_followers_new_offer function
CREATE OR REPLACE FUNCTION public.notify_followers_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_name TEXT;
  follower_record RECORD;
BEGIN
  -- Get business name
  SELECT name INTO business_name
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  -- Notify all followers of this business
  FOR follower_record IN
    SELECT f.user_id
    FROM public.follows f
    WHERE f.business_id = NEW.business_id
  LOOP
    PERFORM public.create_notification(
      follower_record.user_id,
      'Nova Oferta Disponível! 🔥',
      business_name || ' criou uma nova oferta: ' || NEW.title,
      'new_offer',
      jsonb_build_object(
        'business_id', NEW.business_id,
        'business_name', business_name,
        'offer_title', NEW.title
      ),
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update notify_business_new_review function
CREATE OR REPLACE FUNCTION public.notify_business_new_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_owner_id UUID;
  reviewer_name TEXT;
BEGIN
  -- Get business owner ID
  SELECT owner_id INTO business_owner_id
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  -- Get reviewer name
  SELECT full_name INTO reviewer_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Notify business owner
  PERFORM public.create_notification(
    business_owner_id,
    'Nova Avaliação Recebida! ⭐',
    COALESCE(reviewer_name, 'Um cliente') || ' avaliou seu negócio com ' || NEW.rating || ' estrelas',
    'new_review',
    jsonb_build_object(
      'rating', NEW.rating,
      'reviewer_name', COALESCE(reviewer_name, 'Cliente'),
      'comment', NEW.comment
    ),
    NEW.business_id
  );
  
  RETURN NEW;
END;
$$;

-- Update notify_new_follower function
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_owner_id UUID;
  business_name TEXT;
  follower_name TEXT;
BEGIN
  -- Get business info
  SELECT owner_id, name INTO business_owner_id, business_name
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  -- Get follower name
  SELECT full_name INTO follower_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Notify business owner
  PERFORM public.create_notification(
    business_owner_id,
    'Novo Seguidor! 👥',
    COALESCE(follower_name, 'Alguém') || ' começou a seguir ' || business_name,
    'new_follower',
    jsonb_build_object(
      'follower_name', COALESCE(follower_name, 'Novo seguidor'),
      'business_name', business_name
    ),
    NEW.business_id
  );
  
  RETURN NEW;
END;
$$;

-- Update notify_checkin_success function
CREATE OR REPLACE FUNCTION public.notify_checkin_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_owner_id UUID;
  business_name TEXT;
  offer_title TEXT;
  customer_name TEXT;
BEGIN
  -- Get business and offer info
  SELECT b.owner_id, b.name, o.title
  INTO business_owner_id, business_name, offer_title
  FROM public.businesses b
  JOIN public.offers o ON o.business_id = b.id
  WHERE b.id = NEW.business_id AND o.id = NEW.offer_id;
  
  -- Get customer name
  SELECT full_name INTO customer_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Notify customer about points earned
  PERFORM public.create_notification(
    NEW.user_id,
    'Check-in Realizado! 🎉',
    'Você ganhou ' || NEW.points_awarded || ' pontos no check-in em ' || business_name,
    'checkin_success',
    jsonb_build_object(
      'points_awarded', NEW.points_awarded,
      'business_name', business_name,
      'offer_title', offer_title
    ),
    NEW.offer_id
  );
  
  -- Notify business owner about customer checkin
  PERFORM public.create_notification(
    business_owner_id,
    'Cliente Fez Check-in! 📍',
    COALESCE(customer_name, 'Um cliente') || ' fez check-in na oferta: ' || offer_title,
    'customer_checkin',
    jsonb_build_object(
      'customer_name', COALESCE(customer_name, 'Cliente'),
      'offer_title', offer_title,
      'points_awarded', NEW.points_awarded
    ),
    NEW.offer_id
  );
  
  RETURN NEW;
END;
$$;

-- Update notify_followers_new_raffle function
CREATE OR REPLACE FUNCTION public.notify_followers_new_raffle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_name TEXT;
  follower_record RECORD;
BEGIN
  -- Only notify for active raffles
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;
  
  -- Get business name
  SELECT name INTO business_name
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  -- Notify all followers of this business
  FOR follower_record IN
    SELECT f.user_id
    FROM public.follows f
    WHERE f.business_id = NEW.business_id
  LOOP
    PERFORM public.create_notification(
      follower_record.user_id,
      'Novo Sorteio Disponível! 🎁',
      business_name || ' criou um novo sorteio: ' || NEW.title,
      'new_raffle',
      jsonb_build_object(
        'business_id', NEW.business_id,
        'business_name', business_name,
        'raffle_title', NEW.title,
        'prize', NEW.prize,
        'entry_cost', NEW.entry_cost
      ),
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update notify_raffle_participation function
CREATE OR REPLACE FUNCTION public.notify_raffle_participation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_owner_id UUID;
  raffle_title TEXT;
  participant_name TEXT;
BEGIN
  -- Get raffle and business info
  SELECT r.title, b.owner_id
  INTO raffle_title, business_owner_id
  FROM public.raffles r
  JOIN public.businesses b ON b.id = r.business_id
  WHERE r.id = NEW.raffle_id;
  
  -- Get participant name
  SELECT full_name INTO participant_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Notify business owner
  PERFORM public.create_notification(
    business_owner_id,
    'Nova Participação no Sorteio! 🎫',
    COALESCE(participant_name, 'Alguém') || ' participou do sorteio: ' || raffle_title,
    'raffle_participation',
    jsonb_build_object(
      'participant_name', COALESCE(participant_name, 'Participante'),
      'raffle_title', raffle_title,
      'entries', NEW.number_of_entries
    ),
    NEW.raffle_id
  );
  
  RETURN NEW;
END;
$$;

-- Update notify_points_awarded function
CREATE OR REPLACE FUNCTION public.notify_points_awarded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify for significant point awards (avoid spam for small amounts)
  IF NEW.points_earned >= 25 THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Pontos Conquistados! 🏆',
      'Você ganhou ' || NEW.points_earned || ' pontos: ' || COALESCE(NEW.description, NEW.action_type),
      'points_earned',
      jsonb_build_object(
        'points', NEW.points_earned,
        'action_type', NEW.action_type,
        'description', NEW.description
      ),
      COALESCE(NEW.offer_id, NEW.business_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;