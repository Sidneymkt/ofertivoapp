import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface BusinessReview {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface NewReview {
  rating: number;
  comment?: string;
}

export const useBusinessReviews = (businessId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [userReview, setUserReview] = useState<BusinessReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    try {
      const { data: reviewsData, error } = await supabase
        .from('business_reviews')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for review users
      if (reviewsData && reviewsData.length > 0) {
        const userIds = reviewsData.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        // Combine reviews with profile data
        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          profiles: profiles?.find(p => p.user_id === review.user_id)
        }));

        setReviews(reviewsWithProfiles as BusinessReview[]);

        // Find user's review if exists
        const currentUserReview = reviewsWithProfiles?.find(r => r.user_id === user?.id);
        setUserReview(currentUserReview as BusinessReview || null);
      } else {
        setReviews([]);
        setUserReview(null);
      }

    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: "Erro ao carregar avaliações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [businessId, user?.id, toast]);

  const submitReview = async (reviewData: NewReview) => {
    if (!user || !businessId) {
      toast({
        title: "Faça login para avaliar",
        variant: "destructive"
      });
      return false;
    }

    setSubmitting(true);
    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('business_reviews')
          .update({
            rating: reviewData.rating,
            comment: reviewData.comment || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userReview.id);

        if (error) throw error;
        toast({ title: "Avaliação atualizada com sucesso!" });
      } else {
        // Create new review
        const { error: insertError } = await supabase
          .from('business_reviews')
          .insert({
            business_id: businessId,
            user_id: user.id,
            rating: reviewData.rating,
            comment: reviewData.comment || null
          });

        if (insertError) throw insertError;

        // Award points for new review (apenas consumidores)
        try {
          const { data: reviewerProfile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('user_id', user.id)
            .single();

          if (reviewerProfile?.user_type !== 'business') {
            await supabase.from('user_points').insert({
              user_id: user.id,
              points_earned: 25,
              action_type: 'review',
              business_id: businessId,
              description: 'Avaliou um negócio'
            });

            await supabase.rpc('update_user_points', {
              user_id: user.id,
              points_to_add: 25
            });

            toast({ 
              title: "Avaliação enviada com sucesso!",
              description: "+25 pontos ganhos por avaliar"
            });
          } else {
            toast({ title: "Avaliação enviada com sucesso!" });
          }
        } catch (pointsError) {
          console.warn('Error awarding review points:', pointsError);
          toast({ title: "Avaliação enviada com sucesso!" });
        }
      }

      // Reload reviews to show updated data
      await loadReviews();
      return true;

    } catch (error: any) {
      console.error('Error submitting review:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Você já avaliou este negócio",
          description: "Edite sua avaliação existente",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao enviar avaliação",
          description: "Tente novamente mais tarde",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async () => {
    if (!userReview) return false;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('business_reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      toast({ title: "Avaliação removida com sucesso!" });
      await loadReviews();
      return true;

    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Erro ao remover avaliação",
        variant: "destructive"
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  // Load reviews on mount and when businessId/user changes
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Real-time subscription for reviews
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`business-reviews-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_reviews',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          // Reload reviews when any change happens
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, loadReviews]);

  return {
    reviews,
    userReview,
    loading,
    submitting,
    submitReview,
    deleteReview,
    getAverageRating,
    getRatingDistribution,
    reload: loadReviews
  };
};