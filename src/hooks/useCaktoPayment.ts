import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { openCaktoCheckout } from '@/lib/cakto';
import { useNavigate } from 'react-router-dom';

interface CaktoPaymentState {
  isPolling: boolean;
  hasActiveSubscription: boolean;
  planName: string | null;
  loading: boolean;
}

export const useCaktoPayment = (businessId: string | null) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<CaktoPaymentState>({
    isPolling: false,
    hasActiveSubscription: false,
    planName: null,
    loading: true,
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCountRef = useRef(0);
  const maxPollingAttempts = 30; // 5 minutos (10 segundos * 30)

  // Verificar status de pagamento
  const checkPaymentStatus = useCallback(async () => {
    if (!businessId || !user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('verify-cakto-payment', {
        body: { businessId, planName: null }
      });

      if (error) {
        console.error('[useCaktoPayment] Error verifying payment:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[useCaktoPayment] Error:', error);
      return null;
    }
  }, [businessId, user]);

  // Verificação inicial
  useEffect(() => {
    const initialCheck = async () => {
      if (!businessId || !user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const result = await checkPaymentStatus();
      
      if (result?.hasActiveSubscription) {
        setState({
          isPolling: false,
          hasActiveSubscription: true,
          planName: result.planName,
          loading: false,
        });
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initialCheck();
  }, [businessId, user, checkPaymentStatus]);

  // Iniciar checkout e polling
  const startCheckout = useCallback(async (planName: string) => {
    const success = openCaktoCheckout(planName);
    
    if (!success) {
      toast.error('Plano não disponível', {
        description: 'Entre em contato com o suporte.'
      });
      return;
    }

    toast.success('Redirecionando para o pagamento...', {
      description: 'Complete sua assinatura na janela que foi aberta.'
    });

    // Iniciar polling após 5 segundos
    setState(prev => ({ ...prev, isPolling: true }));
    pollingCountRef.current = 0;

    // Delay inicial antes de começar polling
    setTimeout(() => {
      startPolling();
    }, 5000);
  }, []);

  // Polling para verificar pagamento
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      pollingCountRef.current += 1;
      console.log(`[useCaktoPayment] Polling attempt ${pollingCountRef.current}/${maxPollingAttempts}`);

      const result = await checkPaymentStatus();

      if (result?.hasActiveSubscription) {
        // Pagamento confirmado!
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }

        setState({
          isPolling: false,
          hasActiveSubscription: true,
          planName: result.planName,
          loading: false,
        });

        toast.success('🎉 Pagamento Confirmado!', {
          description: `Sua assinatura do plano ${result.planName} foi ativada com sucesso!`,
          duration: 5000,
        });

        // Redirecionar para o dashboard após breve delay
        setTimeout(() => {
          navigate('/anunciante/dashboard', { replace: true });
        }, 1500);

        return;
      }

      // Verificar se atingiu limite de tentativas
      if (pollingCountRef.current >= maxPollingAttempts) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        setState(prev => ({ ...prev, isPolling: false }));
        
        toast.info('Verificação de pagamento encerrada', {
          description: 'Se você completou o pagamento, atualize a página ou entre em contato com o suporte.'
        });
      }
    }, 10000); // Verificar a cada 10 segundos
  }, [checkPaymentStatus, navigate]);

  // Parar polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setState(prev => ({ ...prev, isPolling: false }));
  }, []);

  // Verificação manual
  const manualCheck = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    const result = await checkPaymentStatus();
    
    if (result?.hasActiveSubscription) {
      setState({
        isPolling: false,
        hasActiveSubscription: true,
        planName: result.planName,
        loading: false,
      });

      toast.success('🎉 Assinatura Ativa!', {
        description: `Plano ${result.planName} está ativo.`,
      });

      return true;
    } else {
      setState(prev => ({ ...prev, loading: false }));
      
      toast.info('Nenhuma assinatura ativa encontrada', {
        description: 'Complete o pagamento ou aguarde a confirmação.'
      });

      return false;
    }
  }, [checkPaymentStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Real-time subscription para business_subscriptions
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`subscription-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_subscriptions',
          filter: `business_id=eq.${businessId}`
        },
        async (payload) => {
          console.log('[useCaktoPayment] Subscription update:', payload);
          
          const newSub = payload.new as any;
          
          if (newSub?.status === 'active' && newSub?.payment_status === 'active') {
            // Buscar nome do plano
            const { data: plan } = await supabase
              .from('subscription_plans')
              .select('name')
              .eq('id', newSub.plan_id)
              .maybeSingle();

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }

            setState({
              isPolling: false,
              hasActiveSubscription: true,
              planName: plan?.name || 'Plano Ativo',
              loading: false,
            });

            toast.success('🎉 Assinatura Ativada!', {
              description: `Plano ${plan?.name || 'Ativo'} liberado com sucesso!`,
              duration: 5000,
            });

            // Redirecionar
            setTimeout(() => {
              navigate('/anunciante/dashboard', { replace: true });
            }, 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, navigate]);

  return {
    ...state,
    startCheckout,
    stopPolling,
    manualCheck,
    refresh: checkPaymentStatus,
  };
};
