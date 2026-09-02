import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface PixDonation {
  id: string;
  user_id: string;
  user_type: string;
  valor_total: number;
  valor_convertido_pontos: number;
  valor_fundo: number;
  pontos_gerados: number;
  status: string;
  transaction_id_pix: string | null;
  campaign_id: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
  pix_key_snapshot?: PlatformPixKey;
}

export interface PlatformPixKey {
  type: string;
  value: string;
  holder?: string;
}

interface PixKeyConfig {
  setting_value: PlatformPixKey;
}

const PIX_CONVERSION_RATE = 100; // 1 Real = 100 points
const FUND_PERCENTAGE = 0.10; // 10% for platform fund

export const usePixDonation = () => {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: myDonations = [], isLoading: loadingDonations } = useQuery({
    queryKey: ['my-pix-donations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('donations_pix')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PixDonation[];
    },
    enabled: !!user,
  });

  const createDonation = async (valorTotal: number, campaignId?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para doar');
      return null;
    }

    if (valorTotal <= 0) {
      toast.error('Valor inválido');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('create_platform_pix_donation', {
        p_valor_total: valorTotal,
        p_campaign_id: campaignId || null,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['my-pix-donations'] });
      toast.success('Doação registrada! Aguardando confirmação do PIX.');
      return data as PixDonation;
    } catch (error: any) {
      console.error('Erro ao criar doação:', error);
      toast.error('Erro ao registrar doação');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    myDonations,
    loadingDonations,
    loading,
    createDonation,
    PIX_CONVERSION_RATE,
    FUND_PERCENTAGE,
  };
};

// Admin hook for managing donations
export const useAdminPixDonations = () => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: allDonations = [], isLoading: loadingAll } = useQuery({
    queryKey: ['admin-pix-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations_pix')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PixDonation[];
    },
  });

  const { data: pixKeyConfig } = useQuery({
    queryKey: ['pix-key-setting-admin'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('platform_sensitive_settings')
        .select('*')
        .eq('setting_key', 'pix_key')
        .eq('is_active', true)
        .maybeSingle();
      return data as PixKeyConfig | null;
    },
  });

  const savePixKey = async (keyType: string, keyValue: string, holderName: string) => {
    setLoading(true);
    try {
      const settingValue = { type: keyType, value: keyValue, holder: holderName };

      const { data: existing } = await (supabase as any)
        .from('platform_sensitive_settings')
        .select('id')
        .eq('setting_key', 'pix_key')
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('platform_sensitive_settings')
          .update({
            setting_value: settingValue as any,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'pix_key');
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('platform_sensitive_settings')
          .insert({
            setting_key: 'pix_key',
            setting_value: settingValue as any,
            is_active: true,
          });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['pix-key-setting'] });
      queryClient.invalidateQueries({ queryKey: ['pix-key-setting-admin'] });
      toast.success('Chave PIX salva com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar chave PIX:', error);
      toast.error('Erro ao salvar chave PIX');
    } finally {
      setLoading(false);
    }
  };

  const confirmDonation = async (donationId: string, userId: string) => {
    setLoading(true);
    try {
      // Get donation details
      const donation = allDonations.find(d => d.id === donationId);
      if (!donation) throw new Error('Doação não encontrada');
      if (donation.status === 'confirmed') {
        toast.error('Esta doação já foi confirmada');
        return false;
      }

      // Update donation status
      const { error: updateError } = await supabase
        .from('donations_pix')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: userId,
        })
        .eq('id', donationId);
      if (updateError) throw updateError;

      // Credit points to user
      if (donation.user_type === 'consumidor') {
        await supabase.from('user_points').insert({
          user_id: donation.user_id,
          points_earned: donation.pontos_gerados,
          action_type: 'donation_pix',
          description: `Doação PIX de R$ ${donation.valor_total.toFixed(2)}`,
        });
        // Update profile total_points
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', donation.user_id)
          .single();
        if (profile) {
          await supabase
            .from('profiles')
            .update({ total_points: (profile.total_points || 0) + donation.pontos_gerados })
            .eq('user_id', donation.user_id);
        }
      }

      // Register fund contribution
      await supabase.from('fundo_social_movimentacoes').insert({
        tipo: 'entrada',
        valor: donation.valor_fundo,
        descricao: `10% doação PIX - ${donation.transaction_id_pix}`,
        origem: 'donation_pix',
        origem_id: donation.id,
        created_by: userId,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-pix-donations'] });
      queryClient.invalidateQueries({ queryKey: ['my-pix-donations'] });
      toast.success('Doação confirmada e pontos creditados!');
      return true;
    } catch (error: any) {
      console.error('Erro ao confirmar doação:', error);
      toast.error('Erro ao confirmar doação');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelDonation = async (donationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('donations_pix')
        .update({ status: 'cancelled' })
        .eq('id', donationId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-pix-donations'] });
      toast.success('Doação cancelada');
      return true;
    } catch (error: any) {
      console.error('Erro ao cancelar doação:', error);
      toast.error('Erro ao cancelar doação');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const totalArrecadado = allDonations
    .filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + Number(d.valor_total), 0);

  const totalFundo = allDonations
    .filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + Number(d.valor_fundo), 0);

  const totalPontos = allDonations
    .filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + d.pontos_gerados, 0);

  return {
    allDonations,
    loadingAll,
    loading,
    pixKeyConfig,
    savePixKey,
    confirmDonation,
    cancelDonation,
    totalArrecadado,
    totalFundo,
    totalPontos,
  };
};
