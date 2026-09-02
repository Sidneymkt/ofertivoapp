import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  last_interaction: string;
  interaction_type: 'checkin' | 'favorite' | 'share' | 'view';
  total_interactions: number;
  offers_used: number;
  created_at: string;
  avatar_url?: string;
}

export interface CRMStats {
  totalLeads: number;
  favorites: number;
  checkins: number;
  offersUsed: number;
}

export const useCRMData = (businessId?: string) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<CRMStats>({
    totalLeads: 0,
    favorites: 0,
    checkins: 0,
    offersUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  console.log('[useCRMData] Hook called with businessId:', businessId);

  const fetchLeads = async () => {
    if (!businessId) {
      console.log('[useCRMData] No businessId provided, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('[useCRMData] Starting to fetch leads for business:', businessId);
      setLoading(true);

      // Buscar check-ins de offer_checkins
      const { data: offerCheckins, error: offerCheckinsError } = await supabase
        .from('offer_checkins')
        .select(`
          user_id,
          created_at,
          offer_id,
          offers(title)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (offerCheckinsError) {
        console.error('[useCRMData] Error fetching offer checkins:', offerCheckinsError);
      }

      // Buscar check-ins de checkin_validations
      const { data: validationCheckins, error: validationCheckinsError } = await supabase
        .from('checkin_validations')
        .select(`
          user_id,
          created_at,
          offer_id,
          offers(title)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (validationCheckinsError) {
        console.error('[useCRMData] Error fetching validation checkins:', validationCheckinsError);
      }

      // Combinar ambos os tipos de check-ins
      const checkins = [...(offerCheckins || []), ...(validationCheckins || [])];

      console.log('[useCRMData] Total checkins fetched:', checkins.length, 
        '(offer:', offerCheckins?.length || 0, '+ validation:', validationCheckins?.length || 0, ')');

      // Buscar favoritos (sem profiles)
      const { data: favorites, error: favoritesError } = await supabase
        .from('favorites')
        .select(`
          user_id,
          created_at,
          offer_id,
          offers!inner(business_id, title)
        `)
        .eq('offers.business_id', businessId)
        .order('created_at', { ascending: false });

      if (favoritesError) {
        console.error('[useCRMData] Error fetching favorites:', favoritesError);
      }

      console.log('[useCRMData] Raw favorites data:', favorites);
      console.log('[useCRMData] Favorites fetched for business:', favorites?.length || 0);

      // Buscar visualizações de ofertas (sem profiles)
      const { data: views, error: viewsError } = await supabase
        .from('offer_views')
        .select(`
          user_id,
          created_at,
          offer_id,
          offers!inner(business_id, title)
        `)
        .eq('offers.business_id', businessId)
        .order('created_at', { ascending: false });

      if (viewsError) {
        console.error('[useCRMData] Error fetching views:', viewsError);
      }

      console.log('[useCRMData] Views fetched for business:', views?.length || 0);

      // Coletar todos os user_ids únicos
      const allUserIds = new Set<string>();
      checkins?.forEach(c => allUserIds.add(c.user_id));
      favorites?.forEach(f => allUserIds.add(f.user_id));
      views?.forEach(v => allUserIds.add(v.user_id));

      console.log('[useCRMData] Unique user IDs:', allUserIds.size);

      // Buscar profiles (função segura: apenas dados necessários ao CRM)
      const { data: profiles, error: profilesError } = await (supabase as any).rpc('get_business_customer_profiles', {
        p_business_id: businessId,
        p_user_ids: Array.from(allUserIds),
      });

      if (profilesError) {
        console.error('[useCRMData] Error fetching profiles:', profilesError);
      }


      // Criar mapa de profiles por user_id
      const profilesMap = new Map<string, any>();
      (profiles as any[] | null)?.forEach((p: any) => profilesMap.set(p.user_id, p));

      console.log('[useCRMData] Profiles fetched:', profiles?.length || 0);

      // Criar mapa de usuários únicos com suas interações
      const usersMap = new Map<string, Lead>();

      // Processar check-ins
      checkins?.forEach((checkin: any) => {
        const userId = checkin.user_id;
        const profile = profilesMap.get(userId);
        
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: userId,
            user_id: userId,
            name: profile?.full_name || 'Usuário',
            email: profile?.user_id || '',
            phone: profile?.phone || '',
            location: [profile?.city, profile?.state].filter(Boolean).join(' - ') || 'Localização não informada',
            last_interaction: checkin.created_at,
            interaction_type: 'checkin',
            total_interactions: 1,
            offers_used: 1,
            created_at: checkin.created_at,
            avatar_url: profile?.avatar_url,
          });
        } else {
          const user = usersMap.get(userId)!;
          user.total_interactions++;
          user.offers_used++;
          if (new Date(checkin.created_at) > new Date(user.last_interaction)) {
            user.last_interaction = checkin.created_at;
            user.interaction_type = 'checkin';
          }
        }
      });

      // Processar favoritos
      favorites?.forEach((favorite: any) => {
        const userId = favorite.user_id;
        const profile = profilesMap.get(userId);
        
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: userId,
            user_id: userId,
            name: profile?.full_name || 'Usuário',
            email: profile?.user_id || '',
            phone: profile?.phone || '',
            location: [profile?.city, profile?.state].filter(Boolean).join(' - ') || 'Localização não informada',
            last_interaction: favorite.created_at,
            interaction_type: 'favorite',
            total_interactions: 1,
            offers_used: 0,
            created_at: favorite.created_at,
            avatar_url: profile?.avatar_url,
          });
        } else {
          const user = usersMap.get(userId)!;
          user.total_interactions++;
          if (new Date(favorite.created_at) > new Date(user.last_interaction)) {
            user.last_interaction = favorite.created_at;
            user.interaction_type = 'favorite';
          }
        }
      });

      // Processar visualizações
      views?.forEach((view: any) => {
        const userId = view.user_id;
        const profile = profilesMap.get(userId);
        
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: userId,
            user_id: userId,
            name: profile?.full_name || 'Usuário',
            email: profile?.user_id || '',
            phone: profile?.phone || '',
            location: [profile?.city, profile?.state].filter(Boolean).join(' - ') || 'Localização não informada',
            last_interaction: view.created_at,
            interaction_type: 'view',
            total_interactions: 1,
            offers_used: 0,
            created_at: view.created_at,
            avatar_url: profile?.avatar_url,
          });
        } else {
          const user = usersMap.get(userId)!;
          user.total_interactions++;
          if (new Date(view.created_at) > new Date(user.last_interaction)) {
            user.last_interaction = view.created_at;
            user.interaction_type = 'view';
          }
        }
      });

      // Converter map para array e ordenar por última interação
      const leadsArray = Array.from(usersMap.values()).sort(
        (a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime()
      );

      setLeads(leadsArray);

      console.log('[useCRMData] Total unique leads:', leadsArray.length);

      // Calcular estatísticas
      const totalCheckins = checkins?.length || 0;
      const totalFavorites = favorites?.length || 0;
      const totalOffersUsed = leadsArray.reduce((sum, lead) => sum + lead.offers_used, 0);

      setStats({
        totalLeads: leadsArray.length,
        favorites: totalFavorites,
        checkins: totalCheckins,
        offersUsed: totalOffersUsed,
      });

      setLastUpdate(new Date());

      console.log('[useCRMData] Stats calculated:', {
        totalLeads: leadsArray.length,
        favorites: totalFavorites,
        checkins: totalCheckins,
        offersUsed: totalOffersUsed,
      });

    } catch (error) {
      console.error('[useCRMData] Error fetching CRM data:', error);
    } finally {
      setLoading(false);
      console.log('[useCRMData] Fetch completed');
    }
  };

  useEffect(() => {
    console.log('[useCRMData] useEffect triggered, businessId:', businessId);
    fetchLeads();

    if (!businessId) return;

    // Setup real-time subscriptions with complete coverage
    console.log('[useCRMData] Setting up real-time subscriptions for business:', businessId);
    
    const channel = supabase
      .channel(`crm_realtime_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_checkins',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[CRM Real-time] ✅ New offer check-in detected:', payload);
          fetchLeads();
          queryClient.invalidateQueries({ queryKey: ['crm-data', businessId] });
          queryClient.invalidateQueries({ queryKey: ['recent-checkins', businessId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_validations',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[CRM Real-time] ✅ New validation check-in detected:', payload);
          fetchLeads();
          queryClient.invalidateQueries({ queryKey: ['crm-data', businessId] });
          queryClient.invalidateQueries({ queryKey: ['recent-checkins', businessId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
        },
        (payload) => {
          console.log('[CRM Real-time] ❤️ Favorites changed:', payload);
          fetchLeads();
          queryClient.invalidateQueries({ queryKey: ['crm-data', businessId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_views',
        },
        (payload) => {
          console.log('[CRM Real-time] 👁️ New view detected:', payload);
          fetchLeads();
          queryClient.invalidateQueries({ queryKey: ['crm-data', businessId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_analytics',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[CRM Real-time] 📊 Analytics updated:', payload);
          fetchLeads();
          queryClient.invalidateQueries({ queryKey: ['crm-data', businessId] });
        }
      )
      .subscribe((status) => {
        console.log('[CRM Real-time] Subscription status:', status);
      });

    return () => {
      console.log('[useCRMData] Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  return {
    leads,
    stats,
    loading,
    lastUpdate,
    refresh: fetchLeads,
  };
};
