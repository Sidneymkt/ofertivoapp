import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LikeButton } from '@/components/LikeButton';
import { MapPin, Star, Clock, TrendingUp } from 'lucide-react';
import { getOfferTypeLabel, getOfferTypeStyle } from '@/lib/offerTypes';

interface FeaturedOffer {
  id: string;
  title: string;
  description: string | null;
  original_price: number;
  discounted_price: number;
  discount_percentage: number | null;
  image_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  offer_type: string | null;
  checkin_points: number | null;
  businesses: {
    name: string;
    logo_url: string | null;
    category: string;
  } | null;
}

export const FeaturedOffersCarousel = () => {
  const [featuredOffers, setFeaturedOffers] = useState<FeaturedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchFeaturedOffers = useCallback(async () => {
    try {
      let { data, error } = await supabase
        .from('offers')
        .select(
          `
          id,
          title,
          description,
          original_price,
          discounted_price,
          discount_percentage,
          image_url,
          views_count,
          likes_count,
          offer_type,
          checkin_points,
          businesses (
            name,
            logo_url,
            category
          )
        `
        )
        .eq('is_active', true)
        .eq('is_featured', true)
        .is('deleted_at', null)
        .gte('valid_until', new Date().toISOString())
        .order('featured_order', { ascending: true, nullsFirst: false })
        .order('featured_at', { ascending: false });

      // Fallback: most viewed
      if (!error && (!data || data.length === 0)) {
        const fallback = await supabase
          .from('offers')
          .select(
            `
            id,
            title,
            description,
            original_price,
            discounted_price,
            discount_percentage,
            image_url,
            views_count,
            likes_count,
            offer_type,
            checkin_points,
            businesses (
              name,
              logo_url,
              category
            )
          `
          )
          .eq('is_active', true)
          .is('deleted_at', null)
          .gte('valid_until', new Date().toISOString())
          .order('views_count', { ascending: false })
          .limit(10);

        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      const validOffers = (data || []).filter((offer: any) => offer.businesses !== null);
      setFeaturedOffers(validOffers as any);
    } catch (err) {
      console.error('Erro ao buscar ofertas em destaque:', err);
      setFeaturedOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedOffers();

    window.addEventListener('business-profile-updated', fetchFeaturedOffers);

    const channel = supabase
      .channel('featured-offers-business-sync')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'businesses' },
        fetchFeaturedOffers
      )
      .subscribe();

    return () => {
      window.removeEventListener('business-profile-updated', fetchFeaturedOffers);
      supabase.removeChannel(channel);
    };
  }, [fetchFeaturedOffers]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getDiscountBadgeVariant = (discount: number) => {
    if (discount >= 50) return 'destructive';
    if (discount >= 30) return 'default';
    return 'secondary';
  };

  const marqueeOffers = useMemo(() => {
    if (featuredOffers.length === 0) return [] as FeaturedOffer[];

    // Ensure we have enough cards to fill the row before repeating
    const minCards = 8;
    const fillTimes = Math.max(1, Math.ceil(minCards / featuredOffers.length));
    const filled = Array.from({ length: fillTimes }).flatMap(() => featuredOffers);

    // Two identical halves for seamless translateX(-50%) loop
    return [...filled, ...filled];
  }, [featuredOffers]);

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (featuredOffers.length === 0) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12 md:py-16 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Ofertas em Destaque</h2>
          </div>
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
            As ofertas mais populares e imperdíveis da sua cidade selecionadas especialmente para você
          </p>
        </div>

        <div className="ofertivo-marquee rounded-xl">
          <div className="ofertivo-marquee-track gap-4 sm:gap-6">
            {marqueeOffers.map((offer, index) => (
              <article
                key={`${offer.id}-${index}`}
                className="w-[78vw] max-w-[380px] sm:w-[360px] lg:w-[380px] shrink-0"
              >
                <Card className="h-full border-0 shadow-card hover:shadow-glow transition-all duration-500 transform hover:scale-[1.02] group overflow-hidden">
                  <div className="relative overflow-hidden">
                    <div
                      className="aspect-[4/3] relative overflow-hidden bg-muted cursor-pointer"
                      onClick={() => navigate(`/ofertas/${offer.id}`)}
                    >
                      {offer.image_url ? (
                        <img
                          src={offer.image_url}
                          alt={offer.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                          <span className="text-primary-foreground text-4xl font-bold">
                            {offer.businesses?.name?.charAt(0) || 'O'}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {typeof offer.discount_percentage === 'number' && (
                        <Badge
                          variant={getDiscountBadgeVariant(offer.discount_percentage)}
                          className="absolute top-4 right-4 text-lg font-bold px-3 py-1 shadow-lg"
                        >
                          -{offer.discount_percentage}%
                        </Badge>
                      )}

                      {offer.businesses?.logo_url && (
                        <div className="absolute top-4 left-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/80 shadow-lg bg-white">
                            <img
                              src={offer.businesses.logo_url}
                              alt={`Logo ${offer.businesses.name}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-white/90">
                        <div className="flex items-center gap-1 text-sm bg-black/40 rounded-full px-2 py-1">
                          <Star className="w-3 h-3" />
                          <span>{offer.likes_count ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm bg-black/40 rounded-full px-2 py-1">
                          <Clock className="w-3 h-3" />
                          <span>{offer.views_count ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {offer.businesses?.category || 'Geral'}
                          </Badge>
                          <Badge className={`text-xs ${getOfferTypeStyle(offer.offer_type)} border-0`}>
                            {getOfferTypeLabel(offer.offer_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-points text-sm font-medium">
                          <Star className="w-3 h-3" />
                          +{offer.checkin_points ?? 0} pontos
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="w-3 h-3" />
                        <span>{offer.businesses?.name || 'Estabelecimento'}</span>
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors flex-1">
                          {offer.title}
                        </h3>
                        <LikeButton offerId={offer.id} variant="compact" showCount={false} />
                      </div>

                      {offer.description && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{offer.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(offer.original_price)}
                          </span>
                          <span className="text-2xl font-bold text-primary">{formatPrice(offer.discounted_price)}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                        onClick={() => navigate(`/ofertas/${offer.id}`)}
                      >
                        Ver Oferta
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              </article>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Button
            variant="outline"
            size="lg"
            className="hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            onClick={() => navigate('/ofertas')}
          >
            Ver Todas as Ofertas
          </Button>
        </div>
      </div>
    </section>
  );
};
