import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ReferralTrackingData {
  id: string;
  referrer_id: string | null;
  referred_user_id: string;
  referral_code_used: string | null;
  referrer_points_awarded: number;
  referred_points_awarded: number;
  referred_user_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  failed_referrals: number;
  total_points_earned: number;
  user_referrals: number;
  business_referrals: number;
}

export function useReferralTracking() {
  const { user } = useAuth();
  const [trackingData, setTrackingData] = useState<ReferralTrackingData[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferralTracking = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Buscar tracking detalhado
      const { data: tracking, error: trackingError } = await supabase
        .from('referral_tracking')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (trackingError) throw trackingError;

      setTrackingData(tracking || []);

      // Calcular estatísticas
      if (tracking && tracking.length > 0) {
        const stats: ReferralStats = {
          total_referrals: tracking.length,
          successful_referrals: tracking.filter(t => t.status === 'completed').length,
          failed_referrals: tracking.filter(t => t.status === 'failed').length,
          total_points_earned: tracking.reduce((sum, t) => sum + t.referrer_points_awarded, 0),
          user_referrals: tracking.filter(t => t.referred_user_type === 'consumer').length,
          business_referrals: tracking.filter(t => t.referred_user_type === 'business').length,
        };
        setStats(stats);
      } else {
        setStats({
          total_referrals: 0,
          successful_referrals: 0,
          failed_referrals: 0,
          total_points_earned: 0,
          user_referrals: 0,
          business_referrals: 0,
        });
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar tracking de indicações:', err);
      toast.error('Erro ao carregar dados de indicações');
    } finally {
      setLoading(false);
    }
  };

  const validateReferralCode = async (code: string): Promise<{
    valid: boolean;
    message: string;
    referrer_name?: string;
    bonus_points?: number;
  }> => {
    try {
      const { data, error } = await supabase.rpc('validate_referral_code', {
        p_code: code
      });

      if (error) throw error;

      return data as any;
    } catch (err: any) {
      console.error('Erro ao validar código:', err);
      return {
        valid: false,
        message: 'Erro ao validar código de indicação'
      };
    }
  };

  // Setup realtime subscription for tracking
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('referral-tracking-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_tracking',
          filter: `referrer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New referral tracked:', payload);
          toast.success('Nova indicação registrada! 🎉');
          fetchReferralTracking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReferralTracking();
    }
  }, [user]);

  return {
    trackingData,
    stats,
    loading,
    error,
    fetchReferralTracking,
    validateReferralCode,
  };
}
