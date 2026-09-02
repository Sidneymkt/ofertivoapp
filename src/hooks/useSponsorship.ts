import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';
import { useBusiness } from './useBusiness';

export interface Sponsorship {
  id: string;
  campanha_id: string;
  business_id: string;
  tipo: 'dobrar_pontos' | 'valor_fixo' | 'destaque';
  valor_maximo: number | null;
  multiplicador: number;
  valor_patrocinado: number;
  is_active: boolean;
  created_at: string;
  campaign?: {
    id: string;
    title: string;
    description: string;
    goal_points: number;
    current_points: number;
    image_url: string | null;
    category: string;
    end_date: string;
  };
}

export interface AvailableCampaign {
  id: string;
  title: string;
  description: string;
  goal_points: number;
  current_points: number;
  image_url: string | null;
  category: string;
  end_date: string;
  is_verified: boolean;
  creator?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const useSponsorship = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<AvailableCampaign[]>([]);

  // Converter pontos para reais (100 pontos = R$1)
  const pontosParaReais = (pontos: number): string => {
    return (pontos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Carregar patrocínios do anunciante
  const loadSponsorships = async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patrocinios_vaquinha')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar informações das campanhas
      const sponsorshipsWithCampaigns = await Promise.all(
        (data || []).map(async (sponsorship) => {
          const { data: campaign } = await supabase
            .from('crowdfunding_campaigns')
            .select('id, title, description, goal_points, current_points, image_url, category, end_date')
            .eq('id', sponsorship.campanha_id)
            .single();

          return { ...sponsorship, campaign } as Sponsorship;
        })
      );

      setSponsorships(sponsorshipsWithCampaigns);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error loading sponsorships:', error);
      toast({
        title: 'Erro ao carregar patrocínios',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar campanhas disponíveis para patrocínio
  const loadAvailableCampaigns = async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      // Buscar campanhas ativas que ainda não estão patrocinadas por este negócio
      const { data: existingIds } = await supabase
        .from('patrocinios_vaquinha')
        .select('campanha_id')
        .eq('business_id', business.id)
        .eq('is_active', true);

      const excludeIds = existingIds?.map(s => s.campanha_id) || [];

      let query = supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('current_points', { ascending: false });

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar criadores
      const campaignsWithCreators = await Promise.all(
        (data || []).map(async (campaign) => {
          const { data: creator } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', campaign.creator_id)
            .single();

          return { ...campaign, creator } as AvailableCampaign;
        })
      );

      setAvailableCampaigns(campaignsWithCreators);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error loading available campaigns:', error);
      toast({
        title: 'Erro ao carregar campanhas',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar novo patrocínio
  const createSponsorship = async (
    campaignId: string,
    tipo: 'dobrar_pontos' | 'valor_fixo' | 'destaque',
    valorMaximo?: number,
    multiplicador: number = 2
  ): Promise<boolean> => {
    if (!business?.id) {
      toast({
        title: 'Erro',
        description: 'Negócio não encontrado',
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);
    try {
      // Definir multiplicador baseado no tipo
      const finalMultiplicador = tipo === 'dobrar_pontos' ? multiplicador : 1;

      // Criar patrocínio
      const { error: sponsorshipError } = await supabase
        .from('patrocinios_vaquinha')
        .insert({
          campanha_id: campaignId,
          business_id: business.id,
          tipo,
          valor_maximo: valorMaximo || null,
          multiplicador: finalMultiplicador,
          is_active: true
        });

      if (sponsorshipError) {
        console.error('Error inserting sponsorship:', sponsorshipError);
        throw sponsorshipError;
      }

      // Usar função segura para vincular patrocinador à campanha (bypassa RLS)
      console.log('Vinculando patrocinador via função segura:', { campaignId, businessId: business.id, finalMultiplicador });
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('vincular_patrocinador_campanha', {
        p_campanha_id: campaignId,
        p_business_id: business.id,
        p_multiplicador: finalMultiplicador
      });

      if (rpcError) {
        console.error('Error calling vincular_patrocinador_campanha:', rpcError);
        toast({
          title: 'Patrocínio criado! ✨',
          description: 'Seu patrocínio foi registrado. A marca será vinculada em breve.',
        });
      } else if (rpcResult && typeof rpcResult === 'object' && 'success' in rpcResult) {
        const result = rpcResult as { success: boolean; message: string };
        if (result.success) {
          console.log('Patrocinador vinculado com sucesso:', result);
          toast({
            title: '🎉 Patrocínio criado!',
            description: 'Você agora está patrocinando esta vaquinha e sua marca ficará visível!',
          });
        } else {
          console.warn('Falha ao vincular patrocinador:', result.message);
          toast({
            title: 'Patrocínio criado',
            description: result.message,
          });
        }
      } else {
        toast({
          title: '🎉 Patrocínio criado!',
          description: 'Você agora está patrocinando esta vaquinha!',
        });
      }

      await loadSponsorships();
      await loadAvailableCampaigns();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error creating sponsorship:', error);
      toast({
        title: 'Erro ao criar patrocínio',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cancelar patrocínio
  const cancelSponsorship = async (sponsorshipId: string): Promise<boolean> => {
    if (!business?.id) return false;

    setLoading(true);
    try {
      // Buscar patrocínio
      const { data: sponsorship, error: fetchError } = await supabase
        .from('patrocinios_vaquinha')
        .select('campanha_id')
        .eq('id', sponsorshipId)
        .single();

      if (fetchError) throw fetchError;

      // Desativar patrocínio
      const { error } = await supabase
        .from('patrocinios_vaquinha')
        .update({ is_active: false })
        .eq('id', sponsorshipId);

      if (error) throw error;

      // Usar função segura para remover patrocinador da campanha
      if (sponsorship) {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('remover_patrocinador_campanha', {
          p_campanha_id: sponsorship.campanha_id,
          p_business_id: business.id
        });

        if (rpcError) {
          console.error('Error calling remover_patrocinador_campanha:', rpcError);
        } else {
          console.log('Patrocinador removido:', rpcResult);
        }
      }

      toast({
        title: 'Patrocínio cancelado',
        description: 'O patrocínio foi desativado com sucesso',
      });

      await loadSponsorships();
      await loadAvailableCampaigns();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error canceling sponsorship:', error);
      toast({
        title: 'Erro ao cancelar patrocínio',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id) {
      loadSponsorships();
      loadAvailableCampaigns();
    }
  }, [business?.id]);

  return {
    sponsorships,
    availableCampaigns,
    loading,
    loadSponsorships,
    loadAvailableCampaigns,
    createSponsorship,
    cancelSponsorship,
    pontosParaReais
  };
};
