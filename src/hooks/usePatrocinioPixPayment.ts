import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useBusiness } from './useBusiness';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface PatrocinioPix {
  id: string;
  advertiser_id: string;
  business_id: string;
  campaign_id: string | null;
  valor_total: number;
  valor_fundo: number;
  valor_beneficio: number;
  pontos_gerados: number;
  status: string;
  transaction_id_pix: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  pix_key_snapshot?: PlatformPixKey;
  campaign?: {
    id: string;
    title: string;
    image_url: string | null;
    goal_points: number;
    current_points: number;
    end_date: string;
  };
}

export interface PlatformPixKey {
  type: string;
  value: string;
  holder?: string;
}

const PIX_CONVERSION_RATE = 100; // 1 Real = 100 pontos internos
const FUND_PERCENTAGE = 0.10; // 10% para o fundo da plataforma
const BENEFIT_PERCENTAGE = 0.90; // 90% gera benefícios

export const usePatrocinioPixPayment = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Fetch my sponsorship payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['patrocinio-pix', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('patrocinio_pix')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with campaign data
      const enriched = await Promise.all(
        (data || []).map(async (p: any) => {
          if (p.campaign_id) {
            const { data: campaign } = await supabase
              .from('crowdfunding_campaigns')
              .select('id, title, image_url, goal_points, current_points, end_date')
              .eq('id', p.campaign_id)
              .single();
            return { ...p, campaign } as PatrocinioPix;
          }
          return p as PatrocinioPix;
        })
      );
      return enriched;
    },
    enabled: !!business?.id,
  });

  const createPatrocinioPix = async (valorTotal: number, campaignId?: string) => {
    if (!user || !business?.id) {
      toast.error('Você precisa estar logado como anunciante');
      return null;
    }

    if (valorTotal < 10) {
      toast.error('Valor mínimo de R$ 10,00');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('create_platform_pix_sponsorship', {
        p_business_id: business.id,
        p_valor_total: valorTotal,
        p_campaign_id: campaignId || null,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['patrocinio-pix'] });
      toast.success('Patrocínio registrado! Pague via PIX para ativar.');
      return data as PatrocinioPix;
    } catch (error: any) {
      console.error('Erro ao criar patrocínio PIX:', error);
      toast.error('Erro ao registrar patrocínio');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const calcBenefits = (valor: number) => {
    const valorFundo = Math.round(valor * FUND_PERCENTAGE * 100) / 100;
    const valorBeneficio = Math.round(valor * BENEFIT_PERCENTAGE * 100) / 100;
    const pontosGerados = Math.round(valorBeneficio * PIX_CONVERSION_RATE);
    return { valorFundo, valorBeneficio, pontosGerados };
  };

  const confirmedPayments = payments.filter(p => p.status === 'confirmado');
  const pendingPayments = payments.filter(p => p.status === 'pendente');
  const totalInvestido = confirmedPayments.reduce((acc, p) => acc + Number(p.valor_total), 0);
  const totalPontos = confirmedPayments.reduce((acc, p) => acc + p.pontos_gerados, 0);

  return {
    payments,
    confirmedPayments,
    pendingPayments,
    totalInvestido,
    totalPontos,
    loadingPayments,
    loading,
    createPatrocinioPix,
    calcBenefits,
    PIX_CONVERSION_RATE,
    FUND_PERCENTAGE,
    BENEFIT_PERCENTAGE,
  };
};
