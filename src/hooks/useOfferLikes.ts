import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export const useOfferLikes = (offerId: string) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (!offerId) return;
    
    loadLikeStatus();
    loadLikesCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`offer-likes-${offerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_likes',
          filter: `offer_id=eq.${offerId}`
        },
        () => {
          loadLikesCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerId, user]);

  const loadLikeStatus = async () => {
    if (!user || !offerId) return;

    try {
      const { data, error } = await supabase
        .from('offer_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('offer_id', offerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Erro ao carregar status de curtida:', error);
    }
  };

  const loadLikesCount = async () => {
    if (!offerId) return;

    try {
      const { count, error } = await supabase
        .from('offer_likes')
        .select('*', { count: 'exact', head: true })
        .eq('offer_id', offerId);

      if (error) throw error;
      setLikesCount(count || 0);
    } catch (error) {
      console.error('Erro ao carregar contagem de curtidas:', error);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para curtir ofertas",
        variant: "destructive"
      });
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('offer_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('offer_id', offerId);

        if (error) throw error;

        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Add like
        const { error } = await supabase
          .from('offer_likes')
          .insert({
            user_id: user.id,
            offer_id: offerId
          });

        if (error) throw error;

        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        // Award points for liking (apenas consumidores)
        if (userProfile?.user_type !== 'business') {
          await supabase.from('user_points').insert({
            user_id: user.id,
            points_earned: 5,
            action_type: 'like',
            offer_id: offerId,
            description: 'Curtiu uma oferta'
          });

          await supabase.rpc('update_user_points', {
            user_id: user.id,
            points_to_add: 5
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao alternar curtida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua curtida",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isLiked,
    likesCount,
    loading,
    toggleLike
  };
};
