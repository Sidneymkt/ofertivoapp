import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getAppBaseUrl } from '@/lib/config';

export interface ReferralStats {
  id: string;
  user_id: string;
  total_referrals: number;
  active_referrals: number;
  total_commissions_earned: number;
  total_commissions_paid: number;
  total_commissions_pending: number;
  last_commission_date: string | null;
}

export interface ReferralCommission {
  id: string;
  referrer_id: string;
  business_id: string;
  subscription_id: string | null;
  commission_amount: number;
  commission_percentage: number;
  subscription_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
  business?: {
    name: string;
    category: string;
  };
}

export interface ReferralSettings {
  id: string;
  subscription_plan_id: string;
  commission_percentage: number;
  is_active: boolean;
  plan?: {
    name: string;
  };
}

export function useReferrals() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [settings, setSettings] = useState<ReferralSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferralStats = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setStats(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar estatísticas de indicação:', err);
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime subscription for stats
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('referral-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_stats',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Referral stats updated:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setStats(payload.new as ReferralStats);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchReferralCommissions = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('referral_commissions')
        .select(`
          id,
          referrer_id,
          business_id,
          subscription_id,
          commission_amount,
          commission_percentage,
          subscription_amount,
          status,
          payment_date,
          period_start,
          period_end,
          created_at,
          business:businesses(name, category)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions((data as unknown as ReferralCommission[]) || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar comissões:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select(`
          *,
          plan:subscription_plans(name)
        `)
        .eq('is_active', true);

      if (error) throw error;
      setSettings(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar configurações de comissão:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionStatus = async (
    commissionId: string,
    status: 'pending' | 'approved' | 'paid' | 'cancelled'
  ) => {
    try {
      const updates: any = { status };
      if (status === 'paid') {
        updates.payment_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('referral_commissions')
        .update(updates)
        .eq('id', commissionId);

      if (error) throw error;

      // Update local state
      setCommissions(prev =>
        prev.map(commission =>
          commission.id === commissionId
            ? { ...commission, status, payment_date: updates.payment_date || commission.payment_date }
            : commission
        )
      );

      // Update stats if payment was made
      if (status === 'paid' && stats) {
        const commission = commissions.find(c => c.id === commissionId);
        if (commission) {
          setStats(prev => prev ? {
            ...prev,
            total_commissions_paid: prev.total_commissions_paid + commission.commission_amount,
            total_commissions_pending: prev.total_commissions_pending - commission.commission_amount
          } : null);
        }
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao atualizar status da comissão:', err);
      return false;
    }
  };

  const updateCommissionSettings = async (
    planId: string,
    commissionPercentage: number
  ) => {
    try {
      const { error } = await supabase
        .from('referral_settings')
        .update({ commission_percentage: commissionPercentage })
        .eq('subscription_plan_id', planId);

      if (error) throw error;

      // Update local state
      setSettings(prev =>
        prev.map(setting =>
          setting.subscription_plan_id === planId
            ? { ...setting, commission_percentage: commissionPercentage }
            : setting
        )
      );

      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao atualizar configuração de comissão:', err);
      return false;
    }
  };

  const generateReferralCode = () => {
    return user?.id ? user.id.substring(0, 8).toUpperCase() : '';
  };

  const getReferralLink = (type: 'user' | 'business' = 'user') => {
    const referralCode = generateReferralCode();
    const baseUrl = getAppBaseUrl();
    const endpoint = type === 'business' ? '/anunciante/cadastro' : '/cadastro';
    return `${baseUrl}${endpoint}?ref=${referralCode}`;
  };

  // Setup realtime subscription for commissions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('referral-commissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_commissions',
          filter: `referrer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Referral commission updated:', payload);
          fetchReferralCommissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReferralStats();
      fetchReferralCommissions();
    }
  }, [user]);

  return {
    stats,
    commissions,
    settings,
    loading,
    error,
    fetchReferralStats,
    fetchReferralCommissions,
    fetchReferralSettings,
    updateCommissionStatus,
    updateCommissionSettings,
    generateReferralCode,
    getReferralLink
  };
}