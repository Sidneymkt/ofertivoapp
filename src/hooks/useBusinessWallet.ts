import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';

export interface WalletBalance {
  balance: number;
  monthly_allocation: number;
  total_consumed: number;
  next_reset_at: string;
  percentage_used: number;
}

export interface WalletTransaction {
  id: string;
  business_id: string;
  offer_id: string | null;
  user_id: string | null;
  transaction_type: 'debit' | 'credit' | 'reset' | 'allocation';
  amount: number;
  balance_after: number;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const useBusinessWallet = () => {
  const { businessId, loading: businessLoading } = useBusiness();
  const queryClient = useQueryClient();

  // Buscar saldo da carteira
  const { data: wallet, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useQuery({
    queryKey: ['business-wallet', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const { data, error } = await supabase.rpc('get_business_wallet_balance', {
        p_business_id: businessId
      });

      if (error) {
        console.error('[useBusinessWallet] Error fetching wallet:', error);
        throw error;
      }

      // Parse the JSONB result properly
      const walletData = data as unknown as WalletBalance;
      return walletData;
    },
    enabled: !!businessId && !businessLoading,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 10000
  });

  // Buscar histórico de transações
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['business-wallet-transactions', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('business_points_transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useBusinessWallet] Error fetching transactions:', error);
        throw error;
      }

      return data as WalletTransaction[];
    },
    enabled: !!businessId && !businessLoading,
  });

  // Buscar consumo por oferta
  const { data: offerConsumption } = useQuery({
    queryKey: ['business-wallet-by-offer', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('offers')
        .select('id, title, points_per_action, max_actions, current_actions, total_points_consumed, is_active, is_paused_no_balance')
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order('total_points_consumed', { ascending: false });

      if (error) {
        console.error('[useBusinessWallet] Error fetching offer consumption:', error);
        throw error;
      }

      return data;
    },
    enabled: !!businessId && !businessLoading,
  });

  // Realtime subscription para atualização imediata após check-ins
  useEffect(() => {
    if (!businessId) return;

    // Subscribe a novas transações (check-ins debitados)
    const transactionsChannel = supabase
      .channel(`wallet-transactions-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'business_points_transactions',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          console.log('[useBusinessWallet] New transaction detected, refreshing wallet...');
          queryClient.invalidateQueries({ queryKey: ['business-wallet', businessId] });
          queryClient.invalidateQueries({ queryKey: ['business-wallet-transactions', businessId] });
          queryClient.invalidateQueries({ queryKey: ['business-wallet-by-offer', businessId] });
        }
      )
      .subscribe();

    // Subscribe a mudanças na carteira
    const walletChannel = supabase
      .channel(`wallet-balance-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_points_wallet',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          console.log('[useBusinessWallet] Wallet updated, refreshing...');
          queryClient.invalidateQueries({ queryKey: ['business-wallet', businessId] });
        }
      )
      .subscribe();

    // Listener para evento customizado de check-in validado
    const handleCheckinValidated = () => {
      console.log('[useBusinessWallet] Checkin validated event received');
      queryClient.invalidateQueries({ queryKey: ['business-wallet', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business-wallet-transactions', businessId] });
    };
    
    window.addEventListener('checkinValidated', handleCheckinValidated);

    return () => {
      transactionsChannel.unsubscribe();
      walletChannel.unsubscribe();
      window.removeEventListener('checkinValidated', handleCheckinValidated);
    };
  }, [businessId, queryClient]);

  // Mutation para inicializar carteira
  const initializeWallet = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('Business ID required');

      const { data, error } = await supabase.rpc('initialize_business_wallet', {
        p_business_id: businessId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-wallet', businessId] });
    }
  });

  // Calcular simulação de pontos para criação de oferta
  const simulateOfferCost = (pointsPerAction: number, maxActions: number | null) => {
    if (!wallet) return null;

    const totalCost = maxActions ? pointsPerAction * maxActions : null;
    const canAfford = totalCost === null || wallet.balance >= totalCost;
    const remainingBalance = totalCost !== null ? wallet.balance - totalCost : null;
    const estimatedActions = totalCost === null 
      ? Math.floor(wallet.balance / pointsPerAction) 
      : maxActions;

    return {
      pointsPerAction,
      maxActions,
      totalCost,
      canAfford,
      remainingBalance,
      currentBalance: wallet.balance,
      estimatedActions,
      percentageOfWallet: totalCost !== null 
        ? Math.round((totalCost / wallet.monthly_allocation) * 100) 
        : null
    };
  };

  return {
    // Dados da carteira
    wallet,
    balance: wallet?.balance ?? 0,
    monthlyAllocation: wallet?.monthly_allocation ?? 0,
    totalConsumed: wallet?.total_consumed ?? 0,
    percentageUsed: wallet?.percentage_used ?? 0,
    nextResetAt: wallet?.next_reset_at,

    // Transações
    transactions: transactions ?? [],
    offerConsumption: offerConsumption ?? [],

    // Estados
    isLoading: businessLoading || walletLoading,
    isTransactionsLoading: transactionsLoading,
    error: walletError,

    // Ações
    refetchWallet,
    initializeWallet: initializeWallet.mutate,
    simulateOfferCost,

    // Helpers
    hasBalance: (wallet?.balance ?? 0) > 0,
    isLowBalance: (wallet?.balance ?? 0) < (wallet?.monthly_allocation ?? 0) * 0.1,
    businessId
  };
};
