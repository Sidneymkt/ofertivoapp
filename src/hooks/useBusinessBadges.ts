import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BusinessBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria_type: string;
  criteria_value: number;
  rarity: string;
  is_active: boolean;
}

interface BusinessAchievement {
  id: string;
  business_id: string;
  badge_id: string;
  progress: number;
  is_unlocked: boolean;
  earned_at: string | null;
  business_badges: BusinessBadge;
}

export const useBusinessBadges = (businessId?: string) => {
  const [achievements, setAchievements] = useState<BusinessAchievement[]>([]);
  const [allBadges, setAllBadges] = useState<BusinessBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadBusinessBadges = async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);

      // Buscar todas as conquistas do negócio (desbloqueadas e em progresso)
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('business_achievements')
        .select(`
          *,
          business_badges (*)
        `)
        .eq('business_id', businessId);

      if (achievementsError) throw achievementsError;

      // Buscar todos os badges disponíveis
      const { data: badgesData, error: badgesError } = await supabase
        .from('business_badges')
        .select('*')
        .eq('is_active', true)
        .order('criteria_value', { ascending: true });

      if (badgesError) throw badgesError;

      setAchievements(achievementsData || []);
      setAllBadges(badgesData || []);
    } catch (error) {
      console.error('Error loading business badges:', error);
      toast({
        title: "Erro ao carregar conquistas",
        description: "Não foi possível carregar as conquistas do negócio.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshBadges = async () => {
    if (!businessId) return;
    
    try {
      // Chamar a função para verificar e conceder novos badges
      const { error } = await supabase.rpc('check_and_award_business_badges', {
        business_id_param: businessId
      });

      if (error) throw error;
      
      // Recarregar dados
      await loadBusinessBadges();
    } catch (error) {
      console.error('Error refreshing badges:', error);
    }
  };

  const getUnlockedBadges = () => {
    return achievements.filter(achievement => achievement.is_unlocked);
  };

  const getInProgressBadges = () => {
    return achievements.filter(achievement => !achievement.is_unlocked);
  };

  const getBadgesByRarity = (rarity: string) => {
    return achievements.filter(achievement => 
      achievement.business_badges?.rarity === rarity
    );
  };

  const getCompletionStats = () => {
    const total = allBadges.length;
    const unlocked = getUnlockedBadges().length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    
    return {
      total,
      unlocked,
      inProgress: achievements.length - unlocked,
      percentage
    };
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel('business-achievements-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_achievements',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          console.log('Business achievements updated, reloading...');
          loadBusinessBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  useEffect(() => {
    loadBusinessBadges();
  }, [businessId]);

  return {
    achievements,
    allBadges,
    loading,
    refreshBadges,
    getUnlockedBadges,
    getInProgressBadges,
    getBadgesByRarity,
    getCompletionStats,
    reload: loadBusinessBadges
  };
};