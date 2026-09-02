import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PlanLimits {
  maxOffers: number | null;
  maxRaffles: number | null;
  currentOffers: number;
  currentRaffles: number;
  planName: string | null;
  canCreateOffer: boolean;
  canCreateRaffle: boolean;
  loading: boolean;
  offersRemaining: number | null;
  rafflesRemaining: number | null;
}

export const usePlanLimits = () => {
  const { user } = useAuth();
  const [limits, setLimits] = useState<PlanLimits>({
    maxOffers: null,
    maxRaffles: null,
    currentOffers: 0,
    currentRaffles: 0,
    planName: null,
    canCreateOffer: false,
    canCreateRaffle: false,
    loading: true,
    offersRemaining: null,
    rafflesRemaining: null,
  });

  const loadLimits = useCallback(async () => {
    if (!user?.id) {
      setLimits(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // 1. Get business ID
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (businessError || !business) {
        setLimits(prev => ({ ...prev, loading: false }));
        return;
      }

      // 2. Get active subscription and plan limits
      const { data: subscription, error: subError } = await supabase
        .from('business_subscriptions')
        .select('plan_id, status, payment_status')
        .eq('business_id', business.id)
        .in('status', ['active', 'trialing', 'paid', 'approved'])
        .in('payment_status', ['active', 'trialing', 'paid', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError || !subscription) {
        setLimits({
          maxOffers: 0,
          maxRaffles: 0,
          currentOffers: 0,
          currentRaffles: 0,
          planName: null,
          canCreateOffer: false,
          canCreateRaffle: false,
          loading: false,
          offersRemaining: 0,
          rafflesRemaining: 0,
        });
        return;
      }

      // 3. Get plan limits
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('name, max_offers, max_raffles')
        .eq('id', subscription.plan_id)
        .single();

      if (planError || !plan) {
        setLimits(prev => ({ ...prev, loading: false }));
        return;
      }

      // 4. Count current active offers (not archived, not deleted)
      const { count: offersCount, error: offersError } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('is_active', true)
        .is('archived_at', null)
        .is('deleted_at', null);

      // 5. Count current active raffles
      const { count: rafflesCount, error: rafflesError } = await supabase
        .from('raffles')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('is_active', true)
        .is('winner_id', null);

      const currentOffers = offersCount ?? 0;
      const currentRaffles = rafflesCount ?? 0;
      const maxOffers = plan.max_offers;
      const maxRaffles = plan.max_raffles;

      // Calculate remaining and permissions
      // null means unlimited (Empresarial plan)
      const offersRemaining = maxOffers === null ? null : Math.max(0, maxOffers - currentOffers);
      const rafflesRemaining = maxRaffles === null ? null : Math.max(0, maxRaffles - currentRaffles);
      
      const canCreateOffer = maxOffers === null || currentOffers < maxOffers;
      const canCreateRaffle = maxRaffles === null || currentRaffles < maxRaffles;

      setLimits({
        maxOffers,
        maxRaffles,
        currentOffers,
        currentRaffles,
        planName: plan.name,
        canCreateOffer,
        canCreateRaffle,
        loading: false,
        offersRemaining,
        rafflesRemaining,
      });
    } catch (error) {
      console.error('Error loading plan limits:', error);
      setLimits(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  return {
    ...limits,
    refresh: loadLimits,
  };
};
