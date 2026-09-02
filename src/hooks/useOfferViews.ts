import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OfferView {
  id: string;
  offer_id: string;
  user_id: string;
  viewed_at: string;
  created_at: string;
  offers?: {
    id: string;
    title: string;
    image_url: string | null;
    businesses: {
      name: string;
    };
  };
}

export const useOfferViews = () => {
  const { user } = useAuth();
  const [views, setViews] = useState<OfferView[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOfferViews = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('offer_views')
        .select(`
          id,
          offer_id,
          user_id,
          viewed_at,
          created_at,
          offers (
            id,
            title,
            image_url,
            businesses (name)
          )
        `)
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setViews(data || []);
    } catch (error) {
      console.error('Error loading offer views:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordOfferView = async (offerId: string) => {
    if (!user) return;

    try {
      // Use upsert to handle duplicates gracefully - only insert if not exists
      const { data, error } = await supabase
        .from('offer_views')
        .upsert(
          {
            user_id: user.id,
            offer_id: offerId,
            viewed_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,offer_id',
            ignoreDuplicates: true
          }
        )
        .select()
        .maybeSingle();

      // views_count is now automatically updated by trigger
      if (data) {
        // Add to local state for immediate UI update
        setViews(prev => {
          // Avoid duplicates in local state
          if (prev.some(v => v.offer_id === offerId)) return prev;
          return [data as OfferView, ...prev];
        });
      }
      
      return data;
    } catch (error: any) {
      // Ignore duplicate/conflict errors - user already viewed this offer
      if (error?.code !== '23505' && error?.code !== 'PGRST116') {
        console.error('Error recording offer view:', error);
      }
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('offer-views-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_views',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New offer view recorded:', payload);
          // Reload to get complete data with joins
          loadOfferViews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    loadOfferViews();
  }, [user]);

  return {
    views,
    loading,
    recordOfferView,
    reload: loadOfferViews
  };
};