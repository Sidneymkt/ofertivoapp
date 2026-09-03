-- Fix search path on timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix search path and restrict execution on points update function
CREATE OR REPLACE FUNCTION public.update_user_points(user_id UUID, points_to_add INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET total_points = total_points + points_to_add 
  WHERE profiles.user_id = update_user_points.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public and authenticated execute on security definer function
REVOKE EXECUTE ON FUNCTION public.update_user_points(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_points(UUID, INTEGER) FROM authenticated;