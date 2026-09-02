
-- Fix views to use security_invoker (PostgreSQL 15+) instead of security_definer
-- First check if the views have any issues
ALTER VIEW public.profiles_public SET (security_invoker = true);
ALTER VIEW public.businesses_public SET (security_invoker = true);
