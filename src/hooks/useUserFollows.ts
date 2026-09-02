import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useUserFollows = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user follows (who current user is following)
  const { data: userFollows = [], isLoading: loading } = useQuery({
    queryKey: ['user-follows', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          *,
          profiles!user_follows_following_id_fkey (
            user_id,
            full_name,
            avatar_url,
            bio,
            city,
            state
          )
        `)
        .eq('follower_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Toggle follow mutation
  const toggleFollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Check if already following
      const { data: existingFollow } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
        return { action: 'unfollow' };
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });

        if (error) throw error;
        return { action: 'follow' };
      }
    },
    onSuccess: (result, targetUserId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-follow-status', targetUserId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['public-user-profile', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['public-user-profile', user?.id] });

      toast({
        title: result.action === 'follow' ? "Agora você está seguindo!" : "Deixou de seguir",
        description: result.action === 'follow' 
          ? "Você receberá atualizações sobre as atividades deste usuário!"
          : "Você não receberá mais atualizações deste usuário.",
      });
    },
    onError: (error) => {
      console.error('Error toggling user follow:', error);
      toast({
        title: "Erro ao atualizar seguimento",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  });

  // Check if following specific user
  const checkIfFollowing = async (targetUserId: string): Promise<boolean> => {
    if (!user || user.id === targetUserId) return false;
    
    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    return !!data;
  };

  // Get user followers
  const getUserFollowers = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        *,
        profiles!user_follows_follower_id_fkey (
          user_id,
          full_name,
          avatar_url,
          bio,
          city,
          state
        )
      `)
      .eq('following_id', userId);

    if (error) throw error;
    return data || [];
  };

  // Get user following
  const getUserFollowing = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        *,
        profiles!user_follows_following_id_fkey (
          user_id,
          full_name,
          avatar_url,
          bio,
          city,
          state
        )
      `)
      .eq('follower_id', userId);

    if (error) throw error;
    return data || [];
  };

  // Toggle user follow
  const toggleUserFollow = async (targetUserId: string) => {
    if (!user) {
      toast({
        title: "Faça login para seguir usuários",
        variant: "destructive"
      });
      return;
    }

    if (user.id === targetUserId) return;

    toggleFollowMutation.mutate(targetUserId);
  };

  // Real-time subscription for follow updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `follower_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-follows', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `following_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['public-user-profile', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    userFollows,
    loading,
    toggleUserFollow,
    checkIfFollowing,
    getUserFollowers,
    getUserFollowing,
    reload: () => queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] })
  };
};