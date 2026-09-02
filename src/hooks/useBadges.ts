import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria_type: string;
  criteria_value?: number;
  rarity: string;
  is_active: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  progress: number;
  is_unlocked: boolean;
  badge: Badge;
}

export const useBadges = () => {
  const { user } = useAuth();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserBadges = async (userId?: string) => {
    if (!userId && !user) return;
    
    const targetUserId = userId || user!.id;
    
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', targetUserId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setUserBadges(data || []);
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };

  const fetchAvailableBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: false });

      if (error) throw error;
      setAvailableBadges(data || []);
    } catch (error) {
      console.error('Error fetching available badges:', error);
    }
  };

  const triggerBadgeCheck = async () => {
    if (!user) return;

    try {
      // Call the function to check and award badges
      const { error } = await supabase.rpc('check_and_award_badges', {
        user_id_param: user.id
      });

      if (error) throw error;
      
      // Refresh user badges after check
      await fetchUserBadges();
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  };

  const getUnlockedBadges = () => {
    return userBadges.filter(badge => badge.is_unlocked);
  };

  const getProgressBadges = () => {
    return userBadges.filter(badge => !badge.is_unlocked && badge.progress > 0);
  };

  const getBadgeProgress = (badge: UserBadge) => {
    if (!badge.badge.criteria_value) return 100;
    return Math.min((badge.progress / badge.badge.criteria_value) * 100, 100);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#10B981';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Comum';
      case 'rare': return 'Raro';
      case 'epic': return 'Épico';
      case 'legendary': return 'Lendário';
      default: return 'Comum';
    }
  };

  useEffect(() => {
    const loadBadges = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserBadges(),
        fetchAvailableBadges()
      ]);
      setLoading(false);
    };

    loadBadges();
  }, [user]);

  // Real-time subscription for user badges
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_badges_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Badge change detected:', payload);
          // Refresh user badges when changes occur
          fetchUserBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    userBadges,
    availableBadges,
    loading,
    fetchUserBadges,
    fetchAvailableBadges,
    triggerBadgeCheck,
    getUnlockedBadges,
    getProgressBadges,
    getBadgeProgress,
    getRarityColor,
    getRarityLabel
  };
};