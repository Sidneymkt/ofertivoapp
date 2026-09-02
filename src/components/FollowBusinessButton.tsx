import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FollowBusinessButtonProps {
  businessId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  className?: string;
}

export const FollowBusinessButton: React.FC<FollowBusinessButtonProps> = ({
  businessId,
  variant = "default",
  size = "default", 
  showText = true,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is following this business
  const { data: isFollowing = false, isLoading } = useQuery({
    queryKey: ['business-follow-status', businessId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user && !!businessId
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', businessId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            user_id: user.id,
            business_id: businessId
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-follow-status', businessId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['public-business-profile', businessId] });
      queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['public-user-profile', user?.id] });
      
      toast({
        title: isFollowing ? "Deixou de seguir" : "Agora você está seguindo!",
        description: isFollowing 
          ? "Você não receberá mais atualizações deste negócio."
          : "Você receberá atualizações sobre ofertas e novidades!",
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
        title: "Faça login para seguir negócios",
        description: "Você precisa estar logado para seguir negócios e receber atualizações.",
        variant: "destructive"
      });
      return;
    }

    followMutation.mutate();
  };

  // Real-time subscription for business follow updates
  React.useEffect(() => {
    if (!user || !businessId) return;

    const channel = supabase
      .channel('business-follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-follow-status', businessId, user.id] });
          queryClient.invalidateQueries({ queryKey: ['public-business-profile', businessId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, businessId, queryClient]);

  if (!user) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={isLoading || followMutation.isPending}
      className={`flex items-center gap-2 ${className || ''}`}
    >
      {isFollowing ? (
        <>
          <Heart className="h-4 w-4 fill-current" />
          {showText && "Seguindo"}
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          {showText && "Seguir"}
        </>
      )}
    </Button>
  );
};