import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getCategoryStyle } from '@/lib/categories';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PersonalizedRecommendations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['personalized-recommendations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's favorite categories (from favorites + checkins + views)
      const [favoritesRes, checkinsRes, viewsRes] = await Promise.all([
        supabase
          .from('favorites')
          .select('offer_id, offers(category)')
          .eq('user_id', user.id)
          .limit(20),
        supabase
          .from('offer_checkins')
          .select('offer_id, offers(category)')
          .eq('user_id', user.id)
          .limit(20),
        supabase
          .from('offer_views')
          .select('offer_id, offers(category)')
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(30),
      ]);

      // Count category preferences
      const catCount: Record<string, number> = {};
      const allData = [
        ...(favoritesRes.data || []),
        ...(checkinsRes.data || []),
        ...(viewsRes.data || []),
      ];

      const seenOfferIds = new Set<string>();
      
      allData.forEach((item: any) => {
        const cat = item.offers?.category;
        if (cat) {
          // Weight: favorites=3, checkins=2, views=1
          const weight = favoritesRes.data?.some(f => f.offer_id === item.offer_id) ? 3
            : checkinsRes.data?.some(c => c.offer_id === item.offer_id) ? 2 : 1;
          catCount[cat] = (catCount[cat] || 0) + weight;
        }
        seenOfferIds.add(item.offer_id);
      });

      // Get top categories
      const topCategories = Object.entries(catCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      // If no preferences, use popular categories
      const targetCategories = topCategories.length > 0 
        ? topCategories 
        : ['alimentacao', 'servicos', 'moda'];

      // Fetch recommended offers the user hasn't seen/interacted with
      const { data: offers } = await supabase
        .from('offers')
        .select(`
          id, title, description, original_price, discounted_price, 
          discount_percentage, image_url, category, valid_until,
          views_count, likes_count, checkin_points,
          businesses(name, logo_url, address)
        `)
        .in('category', targetCategories)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!offers) return [];

      // Filter out already seen and prioritize by relevance
      const unseen = offers.filter(o => !seenOfferIds.has(o.id));
      const result = unseen.length >= 4 ? unseen : offers;

      // Sort by a relevance score
      return result.slice(0, 6).map(offer => ({
        ...offer,
        reason: getRecommendationReason(offer.category, topCategories, seenOfferIds.has(offer.id)),
      }));
    },
    enabled: !!user?.id,
    staleTime: 300000,
  });

  if (!user || isLoading || !recommendations || recommendations.length === 0) return null;

  return (
    <section className="py-4 sm:py-6">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">Para Você</h2>
            <Badge variant="outline" className="text-[10px] sm:text-xs bg-primary/5 border-primary/20 text-primary hidden xs:inline-flex">
              Personalizado
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/ofertas')}
            className="text-xs sm:text-sm text-muted-foreground gap-1"
          >
            Ver mais <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-3 sm:gap-4 w-max sm:w-auto sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((offer: any) => {
              const catStyle = getCategoryStyle(offer.category);
              const discount = offer.discount_percentage || Math.round((1 - offer.discounted_price / offer.original_price) * 100);

              return (
                <Card
                  key={offer.id}
                  className="w-[260px] sm:w-auto shrink-0 cursor-pointer hover:shadow-lg transition-all border-0 shadow-card overflow-hidden group"
                  onClick={() => navigate(`/ofertas/${offer.id}`)}
                >
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="relative h-28 sm:h-36 overflow-hidden">
                      {offer.image_url ? (
                        <img
                          src={offer.image_url}
                          alt={offer.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {discount > 0 && (
                        <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] sm:text-xs">
                          -{discount}%
                        </Badge>
                      )}

                      {/* Reason badge */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <Badge
                          variant="outline"
                          className="bg-background/90 backdrop-blur-sm text-[10px] text-foreground border-border/50 gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-primary" />
                          {offer.reason}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-1 mb-1">
                        {offer.title}
                      </h3>
                      
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        📍 {(offer.businesses as any)?.name || 'Negócio local'}
                      </p>

                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs text-muted-foreground line-through">
                            R${offer.original_price.toFixed(2)}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-secondary">
                            R${offer.discounted_price.toFixed(2)}
                          </span>
                        </div>
                        
                        {offer.checkin_points > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-accent/10 border-accent/30 text-accent-foreground">
                            +{offer.checkin_points} pts
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

function getRecommendationReason(category: string, topCategories: string[], alreadySeen: boolean): string {
  if (alreadySeen) return 'Você pode gostar';
  
  const catLabels: Record<string, string> = {
    alimentacao: 'Gastronomia favorita',
    servicos: 'Serviços que você usa',
    moda: 'Seu estilo',
    saude: 'Saúde & bem-estar',
    esporte: 'Fitness favorito',
    entretenimento: 'Diversão pra você',
    educacao: 'Aprendizado',
    tecnologia: 'Tech que combina',
    outros: 'Novidades pra você',
  };

  if (topCategories.includes(category)) {
    return catLabels[category] || 'Baseado no seu perfil';
  }

  return 'Tendência na região';
}
