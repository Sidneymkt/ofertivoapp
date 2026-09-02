import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface BusinessStatus {
  id: string;
  name: string;
  is_active: boolean;
}

export const useBusinessStatus = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [business, setBusiness] = useState<BusinessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBusinessStatus = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user || !isAuthenticated) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, is_active')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useBusinessStatus] Error loading business:', error);
        throw error;
      }

      setBusiness(data ?? null);
      setLoading(false);
    } catch (error) {
      console.error('[useBusinessStatus] Failed to load business:', error);
      setBusiness(null);
      setLoading(false);
    }
  }, [user?.id, isAuthenticated, authLoading]);

  // Initial load
  useEffect(() => {
    loadBusinessStatus();
  }, [loadBusinessStatus]);

  // Real-time subscription for business status changes
  useEffect(() => {
    if (!user || !isAuthenticated || authLoading) return;

    // First, get the business ID
    const setupRealtimeSubscription = async () => {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!businessData?.id) return;

      const channelName = `business-status-${businessData.id}-${Math.random().toString(36).substr(2, 9)}`;
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'businesses',
            filter: `id=eq.${businessData.id}`
          },
          (payload) => {
            console.log('[useBusinessStatus] Real-time update received:', payload);
            
            const newData = payload.new as BusinessStatus;
            
            setBusiness(prev => {
              if (!prev) return prev;
              
              // Check if status actually changed
              if (prev.is_active !== newData.is_active) {
                if (newData.is_active) {
                  toast.success('🎉 Sua conta foi ativada!', {
                    description: 'Agora você pode criar ofertas e sorteios.',
                  });
                } else {
                  toast.warning('⚠️ Sua conta foi desativada', {
                    description: 'Entre em contato com o suporte para mais informações.',
                  });
                }
              }
              
              return {
                ...prev,
                is_active: newData.is_active,
                name: newData.name || prev.name,
              };
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [user?.id, isAuthenticated, authLoading]);

  return {
    business,
    businessId: business?.id ?? null,
    businessName: business?.name ?? null,
    isActive: business?.is_active ?? false,
    isInactive: business !== null && !business.is_active,
    loading,
    refetch: loadBusinessStatus,
  };
};
