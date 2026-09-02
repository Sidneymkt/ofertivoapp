import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRealtimeSubscription = (config: {
  table: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  queryKeys: (string | (string | undefined)[])[];
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { table, event = '*', filter, queryKeys } = config;

  useEffect(() => {
    if (!user) return;

    const channelName = `realtime-${table}-${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        (payload) => {
          console.log(`[Realtime] ${table} change:`, payload);
          
          // Invalidate all specified query keys
          queryKeys.forEach(queryKey => {
            if (Array.isArray(queryKey)) {
              queryClient.invalidateQueries({ queryKey: queryKey.filter(Boolean) });
            } else {
              queryClient.invalidateQueries({ queryKey: [queryKey] });
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, table, event, filter, queryKeys, queryClient]);
};

// Specific hooks for common use cases
export const useProfileRealtimeSubscription = (profileUserId?: string) => {
  const { user } = useAuth();
  
  useRealtimeSubscription({
    table: 'profiles',
    filter: profileUserId ? `user_id=eq.${profileUserId}` : `user_id=eq.${user?.id}`,
    queryKeys: [
      ['public-user-profile', profileUserId || user?.id],
      ['user-follows', user?.id]
    ]
  });
};

export const useBusinessRealtimeSubscription = (businessId?: string) => {
  const { user } = useAuth();
  
  useRealtimeSubscription({
    table: 'businesses',
    filter: businessId ? `id=eq.${businessId}` : undefined,
    queryKeys: [
      ['active-advertisers-bar'],
      ['map-offers'],
      ['public-business-profile', businessId],
      ['business', businessId],
      ['business-public', businessId],
      ['business-offers', businessId],
      ['business-dashboard'],
      ['business-follow-status', businessId, user?.id],
      ['business-status', businessId]
    ]
  });
};

// Business status subscription for owner (real-time activation/deactivation)
export const useBusinessStatusRealtimeSubscription = (ownerId?: string) => {
  useRealtimeSubscription({
    table: 'businesses',
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    queryKeys: [
      ['business-status', ownerId],
      ['owner-business', ownerId]
    ]
  });
};

export const useFollowsRealtimeSubscription = () => {
  const { user } = useAuth();
  
  // Business follows subscription
  useRealtimeSubscription({
    table: 'follows',
    queryKeys: [
      ['user-follows', user?.id],
      ['public-user-profile', user?.id]
    ]
  });

  // User follows subscription
  useRealtimeSubscription({
    table: 'user_follows',
    queryKeys: [
      ['user-follows', user?.id],
      ['public-user-profile', user?.id]
    ]
  });
};

// User points realtime subscription
export const useUserPointsRealtimeSubscription = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  useRealtimeSubscription({
    table: 'user_points',
    filter: targetUserId ? `user_id=eq.${targetUserId}` : undefined,
    queryKeys: [
      ['user-points', targetUserId],
      ['public-user-profile', targetUserId],
      ['user-profile-stats', targetUserId]
    ]
  });
};

// Offer checkins realtime subscription
export const useOfferCheckinsRealtimeSubscription = (businessId?: string) => {
  useRealtimeSubscription({
    table: 'offer_checkins',
    filter: businessId ? `business_id=eq.${businessId}` : undefined,
    queryKeys: [
      ['business-dashboard', businessId],
      ['recent-checkins', businessId],
      ['business-stats', businessId]
    ]
  });
};

// Checkin validations realtime subscription
export const useCheckinValidationsRealtimeSubscription = (businessId?: string) => {
  useRealtimeSubscription({
    table: 'checkin_validations',
    filter: businessId ? `business_id=eq.${businessId}` : undefined,
    queryKeys: [
      ['business-dashboard', businessId],
      ['recent-checkins', businessId],
      ['business-stats', businessId]
    ]
  });
};

// Business achievements realtime subscription
export const useBusinessAchievementsRealtimeSubscription = (businessId?: string) => {
  useRealtimeSubscription({
    table: 'business_achievements',
    filter: businessId ? `business_id=eq.${businessId}` : undefined,
    queryKeys: [
      ['business-badges', businessId],
      ['business-stats', businessId]
    ]
  });
};

// Raffle entries realtime subscription
export const useRaffleEntriesRealtimeSubscription = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  useRealtimeSubscription({
    table: 'raffle_entries',
    filter: targetUserId ? `user_id=eq.${targetUserId}` : undefined,
    queryKeys: [
      ['user-raffle-entries', targetUserId],
      ['public-user-profile', targetUserId]
    ]
  });
};

// Comprehensive user profile subscription (all related tables)
export const useUserProfileRealtimeSync = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  useProfileRealtimeSubscription(targetUserId);
  useUserPointsRealtimeSubscription(targetUserId);
  useRaffleEntriesRealtimeSubscription(targetUserId);
  useFollowsRealtimeSubscription();
};

// Comprehensive business dashboard subscription (all related tables)
export const useBusinessDashboardRealtimeSync = (businessId?: string) => {
  useBusinessRealtimeSubscription(businessId);
  useOfferCheckinsRealtimeSubscription(businessId);
  useCheckinValidationsRealtimeSubscription(businessId);
  useBusinessAchievementsRealtimeSubscription(businessId);
};