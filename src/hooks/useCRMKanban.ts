import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LeadStatus = 'novo' | 'interessado' | 'cliente' | 'perdido';
export type LeadOrigem = 'checkin' | 'comentario' | 'favorito' | 'sorteio' | 'mensagem' | 'follow';

export interface CRMKanbanLead {
  id: string;
  business_id: string;
  user_id: string;
  status: LeadStatus;
  origem: LeadOrigem;
  ultima_interacao: string;
  score_engajamento: number;
  recorrente: boolean;
  inativo: boolean;
  created_at: string;
  updated_at: string;
  observacoes: string | null;
  etiquetas: string[];
  name: string;
  avatar_url?: string;
  phone?: string;
  total_interactions: number;
  total_points: number;
}

export interface KanbanStats {
  totalLeads: number;
  novos: number;
  interessados: number;
  clientes: number;
  perdidos: number;
  recorrentes: number;
  inativos: number;
  taxaConversao: string;
}

interface CRMAlerta {
  id: string;
  business_id: string;
  lead_id: string;
  tipo_alerta: string;
  visualizado: boolean;
  created_at: string;
}

export const useCRMKanban = (businessId?: string, isPro: boolean = false) => {
  const [leads, setLeads] = useState<CRMKanbanLead[]>([]);
  const [alertas, setAlertas] = useState<CRMAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KanbanStats>({
    totalLeads: 0, novos: 0, interessados: 0, clientes: 0, perdidos: 0,
    recorrentes: 0, inativos: 0, taxaConversao: '0.0',
  });

  const FREE_LEAD_LIMIT = 100;

  const fetchLeads = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }

    try {
      setLoading(true);

      const { data: crmLeads, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('business_id', businessId)
        .order('ultima_interacao', { ascending: false });

      if (error) throw error;

      if (!crmLeads || crmLeads.length === 0) {
        setLeads([]);
        setStats({ totalLeads: 0, novos: 0, interessados: 0, clientes: 0, perdidos: 0, recorrentes: 0, inativos: 0, taxaConversao: '0.0' });
        setLoading(false);
        return;
      }

      const userIds = [...new Set(crmLeads.map(l => l.user_id))];
      const { data: profiles } = await (supabase as any).rpc('get_business_customer_profiles', {
        p_business_id: businessId,
        p_user_ids: userIds,
      });


      const profileMap = new Map<string, any>((profiles as any[] | null)?.map((p: any) => [p.user_id, p]) || []);

      const { data: checkins } = await supabase
        .from('offer_checkins')
        .select('user_id')
        .eq('business_id', businessId)
        .in('user_id', userIds);

      const interactionCounts = new Map<string, number>();
      checkins?.forEach(c => {
        interactionCounts.set(c.user_id, (interactionCounts.get(c.user_id) || 0) + 1);
      });

      const enrichedLeads: CRMKanbanLead[] = crmLeads.map(lead => {
        const profile = profileMap.get(lead.user_id);
        return {
          ...lead,
          status: lead.status as LeadStatus,
          origem: lead.origem as LeadOrigem,
          observacoes: (lead as any).observacoes || null,
          etiquetas: (lead as any).etiquetas || [],
          name: profile?.full_name || 'Usuário',
          avatar_url: profile?.avatar_url || undefined,
          phone: profile?.phone || undefined,
          total_interactions: interactionCounts.get(lead.user_id) || 0,
          total_points: 0,
        };
      });

      setLeads(enrichedLeads);

      const novos = enrichedLeads.filter(l => l.status === 'novo').length;
      const interessados = enrichedLeads.filter(l => l.status === 'interessado').length;
      const clientes = enrichedLeads.filter(l => l.status === 'cliente').length;
      const perdidos = enrichedLeads.filter(l => l.status === 'perdido').length;
      const recorrentes = enrichedLeads.filter(l => l.recorrente).length;
      const inativos = enrichedLeads.filter(l => l.inativo).length;
      const total = enrichedLeads.length;
      const taxa = total > 0 ? ((clientes / total) * 100).toFixed(1) : '0.0';

      setStats({ totalLeads: total, novos, interessados, clientes, perdidos, recorrentes, inativos, taxaConversao: taxa });

    } catch (err) {
      console.error('[useCRMKanban] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const fetchAlertas = useCallback(async () => {
    if (!businessId || !isPro) return;
    const { data } = await supabase
      .from('crm_alertas')
      .select('*')
      .eq('business_id', businessId)
      .eq('visualizado', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setAlertas(data || []);
  }, [businessId, isPro]);

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: LeadStatus) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      toast.success('Status atualizado!');
    } catch (err) {
      console.error('[useCRMKanban] Error updating status:', err);
      toast.error('Erro ao atualizar status');
    }
  }, []);

  const updateLeadDetails = useCallback(async (leadId: string, data: { observacoes?: string; etiquetas?: string[] }) => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
      if (data.etiquetas !== undefined) updateData.etiquetas = data.etiquetas;

      const { error } = await supabase
        .from('crm_leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...data } : l));
      toast.success('Lead atualizado!');
    } catch (err) {
      console.error('[useCRMKanban] Error updating lead:', err);
      toast.error('Erro ao atualizar lead');
    }
  }, []);

  const deleteLead = useCallback(async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast.success('Lead excluído!');
    } catch (err) {
      console.error('[useCRMKanban] Error deleting lead:', err);
      toast.error('Erro ao excluir lead');
    }
  }, []);

  const syncLeadsFromInteractions = useCallback(async () => {
    if (!businessId) return;

    try {
      const { data: existingLeads } = await supabase
        .from('crm_leads')
        .select('user_id')
        .eq('business_id', businessId);

      const existingUserIds = new Set(existingLeads?.map(l => l.user_id) || []);

      if (!isPro && existingUserIds.size >= FREE_LEAD_LIMIT) {
        toast.warning(`Limite de ${FREE_LEAD_LIMIT} leads atingido. Faça upgrade para o plano Pro!`);
        return;
      }

      const newUserIds = new Map<string, LeadOrigem>();

      const { data: checkins } = await supabase
        .from('offer_checkins')
        .select('user_id')
        .eq('business_id', businessId);
      checkins?.forEach(c => { if (!existingUserIds.has(c.user_id)) newUserIds.set(c.user_id, 'checkin'); });

      const { data: offers } = await supabase
        .from('offers')
        .select('id')
        .eq('business_id', businessId);
      const offerIds = offers?.map(o => o.id) || [];

      if (offerIds.length > 0) {
        const { data: favorites } = await supabase
          .from('favorites')
          .select('user_id')
          .in('offer_id', offerIds);
        favorites?.forEach(f => { if (!existingUserIds.has(f.user_id) && !newUserIds.has(f.user_id)) newUserIds.set(f.user_id, 'favorito'); });
      }

      const { data: follows } = await supabase
        .from('follows')
        .select('user_id')
        .eq('business_id', businessId);
      follows?.forEach(f => { if (!existingUserIds.has(f.user_id) && !newUserIds.has(f.user_id)) newUserIds.set(f.user_id, 'follow'); });

      if (newUserIds.size === 0) {
        toast.info('Todos os leads já estão sincronizados!');
        return;
      }

      const maxNew = isPro ? newUserIds.size : Math.max(0, FREE_LEAD_LIMIT - existingUserIds.size);
      const entries = Array.from(newUserIds.entries()).slice(0, maxNew);

      const inserts = entries.map(([userId, origem]) => ({
        business_id: businessId,
        user_id: userId,
        status: 'novo' as const,
        origem,
      }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from('crm_leads')
          .upsert(inserts, { onConflict: 'business_id,user_id', ignoreDuplicates: true });

        if (error) throw error;
        toast.success(`${inserts.length} novo(s) lead(s) sincronizado(s)!`);
        await fetchLeads();
      }
    } catch (err) {
      console.error('[useCRMKanban] Sync error:', err);
      toast.error('Erro ao sincronizar leads');
    }
  }, [businessId, isPro, fetchLeads]);

  const dismissAlerta = useCallback(async (alertaId: string) => {
    await supabase.from('crm_alertas').update({ visualizado: true }).eq('id', alertaId);
    setAlertas(prev => prev.filter(a => a.id !== alertaId));
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchAlertas();
  }, [fetchLeads, fetchAlertas]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`crm_kanban_${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `business_id=eq.${businessId}` }, () => fetchLeads())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_alertas', filter: `business_id=eq.${businessId}` }, () => fetchAlertas())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, fetchLeads, fetchAlertas]);

  const getLeadsByStatus = useCallback((status: LeadStatus) => {
    return leads.filter(l => l.status === status);
  }, [leads]);

  const isAtLimit = !isPro && leads.length >= FREE_LEAD_LIMIT;

  return {
    leads,
    alertas,
    stats,
    loading,
    getLeadsByStatus,
    updateLeadStatus,
    updateLeadDetails,
    deleteLead,
    syncLeadsFromInteractions,
    dismissAlerta,
    refresh: fetchLeads,
    isAtLimit,
    FREE_LEAD_LIMIT,
  };
};
