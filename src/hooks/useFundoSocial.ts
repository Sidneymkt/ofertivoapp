import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface FundoSocial {
  id: string;
  saldo_disponivel: number;
  saldo_reservado: number;
  percentual_receita: number;
  total_arrecadado: number;
  total_liberado: number;
  created_at: string;
  updated_at: string;
}

export interface Movimentacao {
  id: string;
  tipo: string;
  valor: number;
  origem: string | null;
  origem_id: string | null;
  campanha_id: string | null;
  descricao: string | null;
  comprovante_url: string | null;
  created_by: string | null;
  created_at: string;
  campanha?: {
    title: string;
  } | null;
}

export interface Beneficiario {
  id: string;
  tipo: string;
  nome: string;
  documento: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  chave_pix: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  comprovante_documento_url: string | null;
  comprovante_social_url: string | null;
  status: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  notas_admin: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useFundoSocial = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fundo, setFundo] = useState<FundoSocial | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);

  // Carregar dados do fundo social
  const loadFundo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fundo_social')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setFundo(data);
    } catch (error: any) {
      console.error('Erro ao carregar fundo social:', error);
    }
  }, []);

  // Carregar movimentações
  const loadMovimentacoes = useCallback(async (limit: number = 50) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fundo_social_movimentacoes')
        .select(`
          *,
          campanha:crowdfunding_campaigns(title)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar movimentações:', error);
      toast({
        title: 'Erro ao carregar movimentações',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar beneficiários
  const loadBeneficiarios = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('beneficiarios_verificados')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBeneficiarios(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar beneficiários:', error);
      toast({
        title: 'Erro ao carregar beneficiários',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Criar beneficiário
  const createBeneficiario = async (beneficiario: Omit<Beneficiario, 'id' | 'status' | 'aprovado_por' | 'aprovado_em' | 'notas_admin' | 'created_at' | 'updated_at'>): Promise<boolean> => {
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
        .from('beneficiarios_verificados')
        .insert({
          ...beneficiario,
          user_id: user.id,
          status: 'pendente'
        });

      if (error) throw error;

      toast({
        title: '✅ Beneficiário cadastrado!',
        description: 'Aguarde a validação do administrador.',
      });

      await loadBeneficiarios();
      return true;
    } catch (error: any) {
      console.error('Erro ao criar beneficiário:', error);
      toast({
        title: 'Erro ao cadastrar beneficiário',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Aprovar/Rejeitar beneficiário (admin)
  const updateBeneficiarioStatus = async (
    beneficiarioId: string,
    status: 'aprovado' | 'rejeitado',
    notas?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('beneficiarios_verificados')
        .update({
          status,
          notas_admin: notas || null,
          aprovado_por: user?.id,
          aprovado_em: status === 'aprovado' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', beneficiarioId);

      if (error) throw error;

      toast({
        title: status === 'aprovado' ? '✅ Beneficiário aprovado!' : '❌ Beneficiário rejeitado',
        description: status === 'aprovado' 
          ? 'O beneficiário foi verificado e está pronto para receber.' 
          : 'O beneficiário foi rejeitado.',
      });

      await loadBeneficiarios();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar status do beneficiário:', error);
      toast({
        title: 'Erro ao atualizar beneficiário',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar percentual do fundo (admin)
  const updatePercentualReceita = async (percentual: number): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fundo_social')
        .update({
          percentual_receita: percentual,
          updated_at: new Date().toISOString()
        })
        .eq('id', fundo?.id);

      if (error) throw error;

      toast({
        title: '✅ Percentual atualizado!',
        description: `Novo percentual: ${percentual}%`,
      });

      await loadFundo();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar percentual:', error);
      toast({
        title: 'Erro ao atualizar percentual',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Liberar pagamento de campanha (admin)
  const liberarPagamento = async (
    campanhaId: string,
    comprovanteUrl?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('liberar_pagamento_vaquinha', {
        p_campanha_id: campanhaId,
        p_comprovante_url: comprovanteUrl || null
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (result.success) {
        toast({
          title: '✅ Pagamento liberado!',
          description: result.message,
        });
        await loadFundo();
        await loadMovimentacoes();
        return true;
      } else {
        toast({
          title: 'Erro ao liberar pagamento',
          description: result.message,
          variant: 'destructive'
        });
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao liberar pagamento:', error);
      toast({
        title: 'Erro ao liberar pagamento',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas para transparência
  const getEstatisticasTransparencia = useCallback(async () => {
    try {
      // Total de campanhas pagas
      const { count: campanhasPagas } = await supabase
        .from('crowdfunding_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status_pagamento', 'pago');

      // Total de campanhas ativas
      const { count: campanhasAtivas } = await supabase
        .from('crowdfunding_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Total de contribuições
      const { count: totalContribuicoes } = await supabase
        .from('campaign_contributions')
        .select('*', { count: 'exact', head: true });

      return {
        campanhasPagas: campanhasPagas || 0,
        campanhasAtivas: campanhasAtivas || 0,
        totalContribuicoes: totalContribuicoes || 0,
        saldoDisponivel: fundo?.saldo_disponivel || 0,
        totalArrecadado: fundo?.total_arrecadado || 0,
        totalLiberado: fundo?.total_liberado || 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
  }, [fundo]);

  // Converter pontos para reais
  const pontosParaReais = (pontos: number): number => {
    return pontos / 100;
  };

  // Converter reais para pontos
  const reaisParaPontos = (reais: number): number => {
    return reais * 100;
  };

  useEffect(() => {
    loadFundo();
  }, [loadFundo]);

  return {
    fundo,
    movimentacoes,
    beneficiarios,
    loading,
    loadFundo,
    loadMovimentacoes,
    loadBeneficiarios,
    createBeneficiario,
    updateBeneficiarioStatus,
    updatePercentualReceita,
    liberarPagamento,
    getEstatisticasTransparencia,
    pontosParaReais,
    reaisParaPontos
  };
};
