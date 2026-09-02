import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AchievementCredits {
  id: string;
  business_id: string;
  total_credits: number;
  used_credits: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  business_id: string;
  badge_id: string | null;
  transaction_type: 'earn' | 'redeem';
  amount: number;
  balance_after: number;
  advantage_type: string | null;
  advantage_expires_at: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActiveAdvantage {
  id: string;
  business_id: string;
  advantage_type: string;
  offer_id: string | null;
  activated_at: string;
  expires_at: string;
  is_active: boolean;
  credits_spent: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdvantageConfig {
  type: string;
  name: string;
  description: string;
  cost: number;
  duration_days: number;
  icon: string;
  requires_offer?: boolean;
}

// Definição das vantagens disponíveis
export const AVAILABLE_ADVANTAGES: AdvantageConfig[] = [
  {
    type: 'featured_offer',
    name: 'Destaque na Home',
    description: 'Sua oferta aparece no carrossel de destaques por 7 dias',
    cost: 500,
    duration_days: 7,
    icon: '⭐',
    requires_offer: true
  },
  {
    type: 'verified_badge',
    name: 'Selo Verificado Premium',
    description: 'Badge especial "Verificado" no perfil do seu negócio por 30 dias',
    cost: 1000,
    duration_days: 30,
    icon: '✅'
  },
  {
    type: 'map_priority',
    name: 'Prioridade no Mapa',
    description: 'Pin destacado no mapa interativo por 7 dias',
    cost: 300,
    duration_days: 7,
    icon: '📍'
  },
  {
    type: 'push_notification',
    name: 'Notificação Push em Massa',
    description: 'Envie uma notificação para todos os seus seguidores',
    cost: 750,
    duration_days: 0, // Uso único
    icon: '🔔'
  },
  {
    type: 'advanced_analytics',
    name: 'Análise Avançada Premium',
    description: 'Acesso a relatórios detalhados de performance por 30 dias',
    cost: 200,
    duration_days: 30,
    icon: '📊'
  },
  {
    type: 'community_highlight',
    name: 'Destaque na Comunidade',
    description: 'Seu post fixado no topo do feed da comunidade por 7 dias',
    cost: 250,
    duration_days: 7,
    icon: '💬'
  }
];

export function useAchievementCredits(businessId: string | undefined) {
  const [credits, setCredits] = useState<AchievementCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [activeAdvantages, setActiveAdvantages] = useState<ActiveAdvantage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Saldo disponível
  const availableBalance = credits ? credits.total_credits - credits.used_credits : 0;

  // Sincronizar créditos com conquistas desbloqueadas
  const syncCredits = useCallback(async () => {
    if (!businessId || syncing) return;

    setSyncing(true);
    try {
      const { data, error: syncError } = await supabase.rpc('sync_achievement_credits', {
        p_business_id: businessId
      });

      if (syncError) throw syncError;
      
      const result = data as { success: boolean; total_credits?: number; synced_amount?: number; error?: string };
      
      if (result.success && result.synced_amount && result.synced_amount > 0) {
        toast({
          title: 'Créditos Sincronizados! 🎉',
          description: `+${result.synced_amount} créditos foram adicionados das suas conquistas!`,
        });
      }
      
      return result;
    } catch (err) {
      console.error('Erro ao sincronizar créditos:', err);
      return { success: false, error: 'Erro ao sincronizar' };
    } finally {
      setSyncing(false);
    }
  }, [businessId, syncing]);

  // Carregar créditos
  const loadCredits = useCallback(async () => {
    if (!businessId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('business_achievement_credits')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      // Se não existir registro, sincronizar automaticamente
      if (!data) {
        await syncCredits();
        // Recarregar após sincronização
        const { data: newData } = await supabase
          .from('business_achievement_credits')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle();
        setCredits(newData);
      } else {
        setCredits(data);
      }
    } catch (err) {
      console.error('Erro ao carregar créditos:', err);
      setError('Erro ao carregar créditos por conquistas');
    }
  }, [businessId, syncCredits]);

  // Carregar transações
  const loadTransactions = useCallback(async () => {
    if (!businessId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('achievement_credit_transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setTransactions((data || []) as CreditTransaction[]);
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
    }
  }, [businessId]);

  // Carregar vantagens ativas
  const loadActiveAdvantages = useCallback(async () => {
    if (!businessId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('business_active_advantages')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setActiveAdvantages((data || []) as ActiveAdvantage[]);
    } catch (err) {
      console.error('Erro ao carregar vantagens:', err);
    }
  }, [businessId]);

  // Carregar tudo
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadCredits(), loadTransactions(), loadActiveAdvantages()]);
    setLoading(false);
  }, [loadCredits, loadTransactions, loadActiveAdvantages]);

  // Resgatar vantagem
  const redeemAdvantage = async (
    advantageType: string,
    offerId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!businessId) {
      return { success: false, error: 'Negócio não encontrado' };
    }

    const advantage = AVAILABLE_ADVANTAGES.find(a => a.type === advantageType);
    if (!advantage) {
      return { success: false, error: 'Vantagem não encontrada' };
    }

    if (availableBalance < advantage.cost) {
      return { success: false, error: 'Saldo insuficiente de créditos por conquistas' };
    }

    if (advantage.requires_offer && !offerId) {
      return { success: false, error: 'É necessário selecionar uma oferta' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('redeem_advantage', {
        p_business_id: businessId,
        p_advantage_type: advantageType,
        p_credits_cost: advantage.cost,
        p_duration_days: advantage.duration_days || 1,
        p_offer_id: offerId || null,
        p_metadata: {}
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; error?: string; expires_at?: string };

      if (!result.success) {
        return { success: false, error: result.error || 'Erro ao resgatar vantagem' };
      }

      toast({
        title: 'Vantagem Ativada! 🎉',
        description: `${advantage.name} foi ativada com sucesso!`,
      });

      // Recarregar dados
      await loadAll();

      return { success: true };
    } catch (err) {
      console.error('Erro ao resgatar vantagem:', err);
      return { success: false, error: 'Erro ao processar resgate' };
    }
  };

  // Verificar se uma vantagem está ativa
  const hasActiveAdvantage = (advantageType: string): boolean => {
    return activeAdvantages.some(
      a => a.advantage_type === advantageType && 
           a.is_active && 
           new Date(a.expires_at) > new Date()
    );
  };

  // Obter vantagem ativa de um tipo
  const getActiveAdvantage = (advantageType: string): ActiveAdvantage | undefined => {
    return activeAdvantages.find(
      a => a.advantage_type === advantageType && 
           a.is_active && 
           new Date(a.expires_at) > new Date()
    );
  };

  // Efeito inicial
  useEffect(() => {
    if (businessId) {
      loadAll();
    }
  }, [businessId, loadAll]);

  // Realtime subscription
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`achievement-credits-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_achievement_credits',
          filter: `business_id=eq.${businessId}`
        },
        () => loadCredits()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'achievement_credit_transactions',
          filter: `business_id=eq.${businessId}`
        },
        () => loadTransactions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_active_advantages',
          filter: `business_id=eq.${businessId}`
        },
        () => loadActiveAdvantages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, loadCredits, loadTransactions, loadActiveAdvantages]);

  return {
    credits,
    availableBalance,
    transactions,
    activeAdvantages,
    loading,
    syncing,
    error,
    redeemAdvantage,
    hasActiveAdvantage,
    getActiveAdvantage,
    syncCredits,
    refresh: loadAll,
    AVAILABLE_ADVANTAGES
  };
}
