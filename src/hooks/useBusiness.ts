
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface BusinessRow {
  id: string;
  logo_url?: string | null;
  name?: string | null;
}

export const useBusiness = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const loadBusiness = useCallback(async (isMounted = true) => {
    if (authLoading) {
      console.log('[useBusiness] Waiting for auth to complete...');
      return;
    }

    if (!user || !isAuthenticated) {
      console.log('[useBusiness] No authenticated user, clearing business');
      if (isMounted) {
        setBusiness(null);
        setLoading(false);
      }
      return;
    }

    console.log('[useBusiness] Loading business for user', user.id);
    setLoading(true);

    try {
      // NOTE: intentionally NOT filtering by is_active — dashboard/creation flows
      // (raffles, offers) need to work for owners even while the business is
      // pending activation. RLS still restricts writes to the owner.
      const { data, error } = await supabase
        .from('businesses')
        .select('id, logo_url, name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useBusiness] Error loading business:', error);
        throw error;
      }

      console.log('[useBusiness] Business loaded:', data ? 'Found' : 'Not found', data?.id);

      if (isMounted) {
        setBusiness(data ?? null);
        setLoading(false);
      }
    } catch (error) {
      console.error('[useBusiness] Failed to load business:', error);
      if (isMounted) {
        setBusiness(null);
        setLoading(false);
      }
    }
  }, [user?.id, isAuthenticated, authLoading]);

  console.log('[useBusiness] State:', {
    hasUser: !!user,
    userId: user?.id,
    isAuthenticated,
    authLoading,
    loading,
    hasBusiness: !!business,
    businessId: business?.id
  });

  useEffect(() => {
    let isMounted = true;

    loadBusiness();

    // Listen for logo/profile updates dispatched from other components
    const handleUpdate = () => {
      setVersion((v) => v + 1);
      loadBusiness();
    };
    window.addEventListener('business-profile-updated', handleUpdate);

    if (user && isAuthenticated && !authLoading) {
      const channel = supabase
        .channel(`owner-business-sync-${user.id}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'businesses',
            filter: `owner_id=eq.${user.id}`,
          },
          (payload: any) => {
            if (!isMounted) return;
            const nextBusiness = payload.eventType === 'DELETE' ? null : payload.new as BusinessRow;
            setBusiness(nextBusiness);
            setVersion((v) => v + 1);
            setLoading(false);
          }
        )
        .subscribe();

      return () => {
        console.log('[useBusiness] Cleaning up');
        isMounted = false;
        window.removeEventListener('business-profile-updated', handleUpdate);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      console.log('[useBusiness] Cleaning up');
      isMounted = false;
      window.removeEventListener('business-profile-updated', handleUpdate);
    };
  }, [user?.id, isAuthenticated, authLoading, loadBusiness]);

  return {
    business,
    businessId: business?.id ?? null,
    businessLogoUrl: business?.logo_url ?? null,
    businessName: business?.name ?? null,
    logoVersion: version,
    loading,
  };
};
