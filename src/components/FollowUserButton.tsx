import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FollowUserButtonProps {
  userId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg";
  showText?: boolean;
}

export const FollowUserButton: React.FC<FollowUserButtonProps> = ({
  userId,
  variant = "outline",
  size = "default",
  showText = true
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isCurrentUser = user?.id === userId;

  // Check if user is following this user
  const { data: isFollowing = false, isLoading } = useQuery({
    queryKey: ['user-follow-status', userId, user?.id],
    queryFn: async () => {
      if (!user || isCurrentUser) return false;
      
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user && !!userId && !isCurrentUser
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-follow-status', userId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['public-user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['public-user-profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] });
      
      toast({
        title: isFollowing ? "Deixou de seguir" : "Agora você está seguindo!",
        description: isFollowing 
          ? "Você não receberá mais atualizações deste usuário."
          : "Você receberá atualizações sobre as atividades deste usuário!",
      });
    },
    onError: (error) => {
      console.error('Error toggling follow:', error);
      toast({
        title: "Erro ao atualizar seguimento",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  });

  const handleToggleFollow = () => {
    if (!user) {
      toast({
        title: "Faça login para seguir usuários",
        description: "Você precisa estar logado para seguir usuários.",
        variant: "destructive"
      });
      return;
    }

    if (isCurrentUser) return;

    followMutation.mutate();
  };

  // Real-time subscription for user follow updates
  React.useEffect(() => {
    if (!user || !userId) return;

    const channel = supabase
      .channel('user-follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `following_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-follow-status', userId, user.id] });
          queryClient.invalidateQueries({ queryKey: ['public-user-profile', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, queryClient]);

  if (isCurrentUser || !user) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={isLoading || followMutation.isPending}
      className="flex items-center gap-2"
    >
      {isFollowing ? (
        <>
          <UserCheck className="h-4 w-4" />
          {showText && "Seguindo"}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {showText && "Seguir"}
        </>
      )}
    </Button>
  );
};