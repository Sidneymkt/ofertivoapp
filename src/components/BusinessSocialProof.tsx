import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Users, ShoppingBag, TrendingUp, Award, CheckCircle, Eye } from 'lucide-react';

interface BusinessSocialProofProps {
  businessId: string;
}

export const BusinessSocialProof = ({ businessId }: BusinessSocialProofProps) => {
  const { data: stats } = useQuery({
    queryKey: ['business-social-proof', businessId],
    queryFn: async () => {
      // Get checkin count
      const { count: totalCheckins } = await supabase
        .from('offer_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      // Get unique users who used offers
      const { data: uniqueUsers } = await supabase
        .from('offer_checkins')
        .select('user_id')
        .eq('business_id', businessId);

      const uniqueUserCount = new Set((uniqueUsers || []).map(u => u.user_id)).size;

      // Get total views across offers
      const { data: offers } = await supabase
        .from('offers')
        .select('views_count, likes_count')
        .eq('business_id', businessId);

      const totalViews = (offers || []).reduce((s, o) => s + (o.views_count || 0), 0);
      const totalLikes = (offers || []).reduce((s, o) => s + (o.likes_count || 0), 0);

      // Get recent reviewers with avatars (last 5)
      const { data: recentReviewers } = await supabase
        .from('business_reviews')
        .select('user_id, rating, profiles!business_reviews_user_id_fkey(avatar_url, full_name)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get business info
      const { data: business } = await supabase
        .from('businesses')
        .select('average_rating, total_reviews, followers_count')
        .eq('id', businessId)
        .single();

      // Get business ranking position (by followers)
      const { data: allBusinesses } = await supabase
        .from('businesses')
        .select('id, followers_count')
        .eq('is_active', true)
        .order('followers_count', { ascending: false });

      const rankPosition = (allBusinesses || []).findIndex(b => b.id === businessId) + 1;
      const totalBusinesses = (allBusinesses || []).length;

      return {
        totalCheckins: totalCheckins || 0,
        uniqueUsers: uniqueUserCount,
        totalViews,
        totalLikes,
        avgRating: business?.average_rating || 0,
        totalReviews: business?.total_reviews || 0,
        followers: business?.followers_count || 0,
        rankPosition,
        totalBusinesses,
        recentReviewers: (recentReviewers || []).map((r: any) => ({
          avatar: r.profiles?.avatar_url,
          name: r.profiles?.full_name || 'Usuário',
          rating: r.rating,
        })),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!stats) return null;

  const rankPercentile = stats.totalBusinesses > 0
    ? Math.round(((stats.totalBusinesses - stats.rankPosition) / stats.totalBusinesses) * 100)
    : 0;

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Header Stats */}
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-base">Prova Social</h3>
        </div>

        {/* Usage Counter */}
        {stats.totalCheckins > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {stats.totalCheckins.toLocaleString()} pessoas já usaram ofertas deste negócio
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.uniqueUsers} clientes únicos
              </p>
            </div>
          </div>
        )}

        {/* Rating + Reviews */}
        {stats.totalReviews > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(stats.avgRating) ? 'text-yellow-500 fill-yellow-500' : 'text-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium">{stats.avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">
              ({stats.totalReviews} avaliações)
            </span>
          </div>
        )}

        {/* Recent Reviewers (Avatar Stack) */}
        {stats.recentReviewers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {stats.recentReviewers.slice(0, 5).map((reviewer, i) => (
                <Avatar key={i} className="w-7 h-7 border-2 border-background">
                  <AvatarImage src={reviewer.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {reviewer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Avaliaram recentemente
            </span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Eye className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-bold">{stats.totalViews.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Visualizações</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-bold">{stats.followers.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Seguidores</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <ShoppingBag className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-bold">{stats.totalLikes.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Curtidas</p>
          </div>
        </div>

        {/* Neighborhood Rank */}
        {stats.rankPosition > 0 && (
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Ranking do bairro</span>
              </div>
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                #{stats.rankPosition} de {stats.totalBusinesses}
              </Badge>
            </div>
            <Progress value={rankPercentile} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Top {100 - rankPercentile}% dos negócios da cidade
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
