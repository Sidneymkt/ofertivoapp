import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePoints } from './usePoints';

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { awardPoints } = usePoints();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [follows, setFollows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { data: favoritesData, error: favError } = await supabase
        .from('favorites')
        .select(`
          *,
          offers!fk_favorites_offer (
            id,
            title,
            original_price,
            discounted_price,
            image_url,
            views_count,
            businesses (
              id,
              name,
              followers_count
            )
          )
        `)
        .eq('user_id', user.id);

      if (favError) throw favError;
      setFavorites(favoritesData || []);

      const { data: followsData, error: followError } = await supabase
        .from('follows')
        .select(`
          *,
          businesses!follows_business_id_fkey (
            id,
            name,
            description,
            logo_url,
            category,
            followers_count
          )
        `)
        .eq('user_id', user.id);

      if (followError) throw followError;
      setFollows(followsData || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to favorites changes
    const favoritesChannel = supabase
      .channel('favorites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Favorites changed, reloading...');
          loadFavorites();
        }
      )
      .subscribe();

    // Subscribe to follows changes
    const followsChannel = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Follows changed, reloading...');
          loadFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(favoritesChannel);
      supabase.removeChannel(followsChannel);
    };
  }, [user]);

  // Load initial data
  useEffect(() => {
    loadFavorites();
  }, [user]);

  const toggleFavorite = async (offerId: string) => {
    if (!user) return;

    const existingFavorite = favorites.find(f => f.offer_id === offerId);
    
    try {
      if (existingFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('offer_id', offerId);

        if (error) throw error;
        setFavorites(prev => prev.filter(f => f.offer_id !== offerId));
        toast({ title: "Removido dos favoritos" });
      } else {
        // Check if already exists to avoid duplicate key error
        const { data: existing } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('offer_id', offerId)
          .single();

        if (!existing) {
          const { data, error } = await supabase
            .from('favorites')
            .insert([{ user_id: user.id, offer_id: offerId }])
            .select();

          if (error) throw error;
          await loadFavorites(); // Reload to get full data
          toast({ title: "Adicionado aos favoritos" });
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: "Erro ao atualizar favoritos", variant: "destructive" });
    }
  };

  const toggleFollow = async (businessId: string) => {
    if (!user) return;

    const existingFollow = follows.find(f => f.business_id === businessId);
    
    try {
      if (existingFollow) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('id', existingFollow.id);

        if (error) throw error;
        setFollows(prev => prev.filter(f => f.id !== existingFollow.id));
        toast({ title: "Deixou de seguir" });
      } else {
        const { data, error } = await supabase
          .from('follows')
          .insert([{ user_id: user.id, business_id: businessId }])
          .select();

        if (error) throw error;
        
        // Award follow points and trigger automatic raffle participation
        try {
          await awardPoints(
            25, // Points for following a business
            'follow',
            'Seguiu um negócio',
            undefined,
            businessId
          );
          
          toast({ 
            title: "Agora você segue este negócio", 
            description: "Você ganhou 25 pontos por seguir este negócio!" 
          });
        } catch (pointsError) {
          console.warn('Error awarding follow points:', pointsError);
          toast({ title: "Agora você segue este negócio" });
        }
        
        await loadFavorites(); // Reload to get full data
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({ title: "Erro ao atualizar seguimento", variant: "destructive" });
    }
  };

  return {
    favorites,
    follows,
    loading,
    toggleFavorite,
    toggleFollow,
    reload: loadFavorites
  };
};