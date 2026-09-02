import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  planName: string | null;
  loading: boolean;
}

const ACTIVE_STATUSES = ['active', 'trialing', 'paid', 'approved'];

export const useSubscriptionStatus = () => {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    planName: null,
    loading: true,
  });

  const verifyAttemptedRef = useRef(false);

  const loadBusinessId = useCallback(async () => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) return null;
    return data.id as string;
  }, [user?.id]);

  const checkSubscription = useCallback(
    async (opts?: { forceVerify?: boolean }) => {
      try {
        if (!user?.id) return;

        const bid = businessId ?? (await loadBusinessId());
        setBusinessId(bid);

        if (!bid) {
          setStatus({ hasActiveSubscription: false, planName: null, loading: false });
          return;
        }

        // 1) Try direct DB check (fast path)
        const { data: subscription, error: subError } = await supabase
          .from('business_subscriptions')
          .select('status, payment_status, plan_id')
          .eq('business_id', bid)
          .in('status', ACTIVE_STATUSES)
          .in('payment_status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!subError && subscription) {
          // Fetch plan name separately to avoid type issues
          let planName = 'Plano Ativo';
          if (subscription.plan_id) {
            const { data: planData } = await supabase
              .from('subscription_plans')
              .select('name')
              .eq('id', subscription.plan_id)
              .maybeSingle();
            if (planData?.name) planName = planData.name;
          }
          setStatus({ hasActiveSubscription: true, planName, loading: false });
          return;
        }

        // 2) Fallback: verify via Edge Function (activates if payment is confirmed)
        const shouldVerify = opts?.forceVerify || !verifyAttemptedRef.current;
        if (shouldVerify) {
          verifyAttemptedRef.current = true;

          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            'verify-cakto-payment',
            {
              body: { businessId: bid, planName: null },
            },
          );

          if (!verifyError && verifyData?.hasActiveSubscription) {
            setStatus({
              hasActiveSubscription: true,
              planName: verifyData.planName || 'Plano Ativo',
              loading: false,
            });
            return;
          }
        }

        setStatus({ hasActiveSubscription: false, planName: null, loading: false });
      } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        setStatus({ hasActiveSubscription: false, planName: null, loading: false });
      }
    },
    [user?.id, businessId, loadBusinessId],
  );

  useEffect(() => {
    if (!user?.id) {
      verifyAttemptedRef.current = false;
      setBusinessId(null);
      setStatus({ hasActiveSubscription: false, planName: null, loading: false });
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true }));
    checkSubscription({ forceVerify: false });
  }, [user?.id, checkSubscription]);

  // Real-time refresh (payment/webhook/admin changes)
  useEffect(() => {
    if (!businessId) return;

    const channelName = `subscription-status-${businessId}-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'business_subscriptions',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          // If the subscription row exists, DB path will pick it up quickly
          checkSubscription({ forceVerify: false });
        },
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${businessId}`,
        },
        () => {
          // When business becomes active after payment, re-check subscription
          checkSubscription({ forceVerify: false });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, checkSubscription]);

  return {
    ...status,
    refresh: () => {
      verifyAttemptedRef.current = false;
      setStatus((prev) => ({ ...prev, loading: true }));
      return checkSubscription({ forceVerify: true });
    },
  };
};
