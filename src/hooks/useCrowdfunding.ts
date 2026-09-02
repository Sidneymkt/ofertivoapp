import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface CampaignSponsor {
  id: string;
  business_id: string;
  name: string;
  logo_url: string | null;
  tipo: 'dobrar_pontos' | 'valor_fixo' | 'destaque';
  multiplicador: number;
}

export interface Campaign {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  goal_points: number;
  current_points: number;
  image_url: string | null;
  video_url: string | null;
  category: 'community' | 'business' | 'charity' | 'event' | 'other';
  is_verified: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  // Novos campos do Fundo Social
  beneficiario_id?: string | null;
  tipo_beneficiario?: 'pessoa_fisica' | 'instituicao' | 'projeto_interno' | null;
  status_pagamento?: 'pendente' | 'meta_atingida' | 'validando' | 'aprovado' | 'pago' | 'cancelado';
  valor_liberado?: number;
  data_liberacao?: string | null;
  comprovante_pagamento_url?: string | null;
  patrocinador_id?: string | null;
  multiplicador_patrocinio?: number;
  creator?: {
    full_name: string;
    avatar_url: string | null;
  };
  // Múltiplos patrocinadores (até 10)
  patrocinadores?: CampaignSponsor[];
  // Mantido para compatibilidade
  patrocinador?: {
    name: string;
    logo_url: string | null;
  };
}

export interface Contribution {
  id: string;
  campaign_id: string;
  contributor_id: string;
  amount: number;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
  contributor?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const useCrowdfunding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  // Buscar campanhas ativas
  const loadCampaigns = async (category?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar informações dos criadores e patrocinadores
      const campaignsWithCreators = await Promise.all(
        (data || []).map(async (campaign) => {
          const { data: creator } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', campaign.creator_id)
            .single();

          // Buscar todos os patrocinadores ativos (até 10)
          const { data: sponsorships } = await supabase
            .from('patrocinios_vaquinha')
            .select('id, business_id, tipo, multiplicador')
            .eq('campanha_id', campaign.id)
            .eq('is_active', true)
            .limit(10);

          let patrocinadores: CampaignSponsor[] = [];
          if (sponsorships && sponsorships.length > 0) {
            const businessIds = sponsorships.map(s => s.business_id);
            const { data: businesses } = await supabase
              .from('businesses')
              .select('id, name, logo_url')
              .in('id', businessIds);

            if (businesses) {
              patrocinadores = sponsorships.map(s => {
                const biz = businesses.find(b => b.id === s.business_id);
                return {
                  id: s.id,
                  business_id: s.business_id,
                  name: biz?.name || 'Patrocinador',
                  logo_url: biz?.logo_url || null,
                  tipo: s.tipo as 'dobrar_pontos' | 'valor_fixo' | 'destaque',
                  multiplicador: s.multiplicador
                };
              });
            }
          }

          // Manter compatibilidade com patrocinador único (primeiro da lista)
          let patrocinador = null;
          if (patrocinadores.length > 0) {
            patrocinador = {
              name: patrocinadores[0].name,
              logo_url: patrocinadores[0].logo_url
            };
          } else if (campaign.patrocinador_id) {
            const { data: sponsor } = await supabase
              .from('businesses')
              .select('name, logo_url')
              .eq('id', campaign.patrocinador_id)
              .single();
            patrocinador = sponsor;
          }

          return { ...campaign, creator, patrocinadores, patrocinador } as Campaign;
        })
      );

      setCampaigns(campaignsWithCreators);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      toast({
        title: 'Erro ao carregar campanhas',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Contribuir para uma campanha
  const contribute = async (
    campaignId: string,
    amount: number,
    message?: string,
    isAnonymous: boolean = false
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado',
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('contribute_to_campaign', {
        p_campaign_id: campaignId,
        p_contributor_id: user.id,
        p_amount: amount,
        p_message: message || null,
        p_is_anonymous: isAnonymous
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (result.success) {
        toast({
          title: '🎉 Contribuição realizada!',
          description: `Você contribuiu com ${amount} pontos!`,
        });
        // Recarregar campanhas para atualizar progresso
        await loadCampaigns();
        return true;
      } else {
        toast({
          title: 'Erro na contribuição',
          description: result.message,
          variant: 'destructive'
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error contributing:', error);
      toast({
        title: 'Erro ao contribuir',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Buscar contribuições de uma campanha
  const loadContributions = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_contributions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar informações dos contribuidores
      const contributionsWithContributors = await Promise.all(
        (data || []).map(async (contribution) => {
          if (contribution.is_anonymous) {
            return {
              ...contribution,
              contributor: { full_name: 'Anônimo', avatar_url: null }
            };
          }

          const { data: contributor } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', contribution.contributor_id)
            .single();

          return { ...contribution, contributor };
        })
      );

      setContributions(contributionsWithContributors);
    } catch (error: any) {
      console.error('Error loading contributions:', error);
      toast({
        title: 'Erro ao carregar contribuições',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar nova campanha
  const createCampaign = async (campaignData: {
    title: string;
    description: string;
    goal_points: number;
    category: string;
    end_date: string;
    image_url?: string;
    video_url?: string;
  }): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado',
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crowdfunding_campaigns')
        .insert({
          creator_id: user.id,
          ...campaignData
        });

      if (error) throw error;

      toast({
        title: '✅ Campanha criada!',
        description: 'Sua vaquinha foi criada com sucesso',
      });

      await loadCampaigns();
      return true;
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Erro ao criar campanha',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Editar campanha
  const updateCampaign = async (
    campaignId: string,
    campaignData: {
      title: string;
      description: string;
      goal_points: number;
      category: string;
      end_date: string;
      image_url?: string;
    }
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado',
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crowdfunding_campaigns')
        .update(campaignData)
        .eq('id', campaignId)
        .eq('creator_id', user.id);

      if (error) throw error;

      toast({
        title: '✅ Campanha atualizada!',
        description: 'Sua vaquinha foi atualizada com sucesso',
      });

      await loadCampaigns();
      return true;
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Erro ao atualizar campanha',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Excluir campanha
  const deleteCampaign = async (campaignId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado',
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crowdfunding_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('creator_id', user.id);

      if (error) throw error;

      toast({
        title: '✅ Campanha excluída!',
        description: 'Sua vaquinha foi excluída com sucesso',
      });

      await loadCampaigns();
      return true;
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast({
        title: 'Erro ao excluir campanha',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return {
    campaigns,
    contributions,
    loading,
    loadCampaigns,
    loadContributions,
    contribute,
    createCampaign,
    updateCampaign,
    deleteCampaign
  };
};
