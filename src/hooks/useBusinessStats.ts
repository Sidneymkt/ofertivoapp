import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface BusinessStats {
  totalAchievements: number;
  unlockedAchievements: number;
  currentLevel: string;
  checkinsReceived: number;
  followersCount: number;
  offersCreated: number;
  activeOffers: number;
  rafflesCompleted: number;
}

interface RecentActivity {
  type: 'checkin' | 'follower' | 'offer' | 'raffle';
  description: string;
  timestamp: string;
  points: number;
}

export const useBusinessStats = (businessId?: string) => {
  const [stats, setStats] = useState<BusinessStats>({
    totalAchievements: 0,
    unlockedAchievements: 0,
    currentLevel: 'Iniciante',
    checkinsReceived: 0,
    followersCount: 0,
    offersCreated: 0,
    activeOffers: 0,
    rafflesCompleted: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchStats = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar dados do negócio
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('followers_count')
        .eq('id', businessId)
        .single();

      if (businessError) throw businessError;

      // Buscar conquistas
      const { data: achievements, error: achievementsError } = await supabase
        .from('business_achievements')
        .select('*')
        .eq('business_id', businessId);

      if (achievementsError) throw achievementsError;

      const unlockedCount = achievements?.filter(a => a.is_unlocked).length || 0;

      // Buscar check-ins recebidos
      const { count: checkinsCount, error: checkinsError } = await supabase
        .from('offer_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if (checkinsError) throw checkinsError;

      // Buscar ofertas criadas
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, is_active')
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .is('archived_at', null);

      if (offersError) throw offersError;

      const activeOffersCount = offers?.filter(o => o.is_active).length || 0;

      // Buscar sorteios finalizados
      const { count: rafflesCount, error: rafflesError } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .not('winner_id', 'is', null);

      if (rafflesError) throw rafflesError;

      // Determinar nível baseado em check-ins
      let level = 'Iniciante';
      const checkins = checkinsCount || 0;
      if (checkins >= 1000) level = 'Diamante';
      else if (checkins >= 500) level = 'Platina';
      else if (checkins >= 200) level = 'Ouro';
      else if (checkins >= 50) level = 'Prata';
      else if (checkins >= 10) level = 'Bronze';

      setStats({
        totalAchievements: achievements?.length || 0,
        unlockedAchievements: unlockedCount,
        currentLevel: level,
        checkinsReceived: checkins,
        followersCount: business?.followers_count || 0,
        offersCreated: offers?.length || 0,
        activeOffers: activeOffersCount,
        rafflesCompleted: rafflesCount || 0,
      });

      // Buscar atividades recentes
      await fetchRecentActivities(businessId);

    } catch (error) {
      console.error('Error fetching business stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async (businessId: string) => {
    try {
      const activities: RecentActivity[] = [];

      // Últimos check-ins (últimos 5)
      const { data: recentCheckins } = await supabase
        .from('offer_checkins')
        .select('created_at, offer_id, offers(title)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(3);

      recentCheckins?.forEach(checkin => {
        const offer = checkin.offers as any;
        activities.push({
          type: 'checkin',
          description: `Check-in realizado em "${offer?.title || 'oferta'}"`,
          timestamp: checkin.created_at,
          points: 5,
        });
      });

      // Novos seguidores (simulado por agrupamento)
      const { data: recentFollows } = await supabase
        .from('follows')
        .select('created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentFollows && recentFollows.length > 0) {
        activities.push({
          type: 'follower',
          description: `${Math.min(10, recentFollows.length)} novos seguidores conquistados`,
          timestamp: recentFollows[0].created_at,
          points: 10,
        });
      }

      // Sorteios finalizados recentemente
      const { data: recentRaffles } = await supabase
        .from('raffles')
        .select('created_at, title')
        .eq('business_id', businessId)
        .not('winner_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2);

      recentRaffles?.forEach(raffle => {
        activities.push({
          type: 'raffle',
          description: `Sorteio "${raffle.title}" finalizado com sucesso`,
          timestamp: raffle.created_at,
          points: 20,
        });
      });

      // Ordenar por timestamp mais recente
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  useEffect(() => {
    fetchStats();

    if (!businessId) return;

    // Setup real-time subscriptions
    const channel = supabase
      .channel(`business_stats_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_achievements',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchStats();
          queryClient.invalidateQueries({ queryKey: ['business-achievements', businessId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_checkins',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${businessId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  return {
    stats,
    recentActivities,
    loading,
    refresh: fetchStats,
  };
};
