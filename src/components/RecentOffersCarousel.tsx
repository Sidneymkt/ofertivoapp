import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, MapPin, Percent } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { getOfferTypeLabel, getOfferTypeStyle } from '@/lib/offerTypes';

interface RecentOffer {
  id: string;
  title: string;
  discount_percentage: number | null;
  discounted_price: number;
  original_price: number;
  image_url: string | null;
  category: string;
  created_at: string;
  offer_type: string | null;
  business: {
    name: string;
    logo_url: string | null;
  } | null;
}

export const RecentOffersCarousel = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<RecentOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      dragFree: true,
      containScroll: false,
    },
    [AutoScroll({ speed: 1, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const fetchRecentOffers = useCallback(async () => {
    try {
      // First try to get manually marked recent offers
      let { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          title,
          discount_percentage,
          discounted_price,
          original_price,
          image_url,
          category,
          created_at,
          offer_type,
          business:businesses(name, logo_url)
        `)
        .eq('is_active', true)
        .eq('is_featured_recent', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(12);

      // If no manually marked recent offers, fallback to most recent by created_at
      if (!error && (!data || data.length === 0)) {
        const fallback = await supabase
          .from('offers')
          .select(`
            id,
            title,
            discount_percentage,
            discounted_price,
            original_price,
            image_url,
            category,
            created_at,
            offer_type,
            business:businesses(name, logo_url)
          `)
          .eq('is_active', true)
          .gte('valid_until', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(12);
        
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      const validOffers = (data || []).filter(offer => offer.business) as RecentOffer[];
      setOffers(validOffers);
    } catch (error) {
      console.error('Error fetching recent offers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentOffers();

    window.addEventListener('business-profile-updated', fetchRecentOffers);

    const channel = supabase
      .channel('recent-offers-business-sync')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'businesses' },
        fetchRecentOffers
      )
      .subscribe();

    return () => {
      window.removeEventListener('business-profile-updated', fetchRecentOffers);
      supabase.removeChannel(channel);
    };
  }, [fetchRecentOffers]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  if (loading) {
    return (
      <section className="py-8 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Ofertas Recentes</h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="min-w-[200px] h-[140px] rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (offers.length === 0) return null;

  // Duplicate offers to ensure smooth infinite scroll
  const duplicatedOffers = [...offers, ...offers, ...offers];

  return (
    <section className="py-6 sm:py-8 bg-muted/20">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Ofertas Recentes</h2>
          <span className="text-xs sm:text-sm text-muted-foreground ml-2 hidden sm:inline">Acabou de chegar</span>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 pl-4">
          {duplicatedOffers.map((offer, index) => (
            <Card
              key={`${offer.id}-${index}`}
              className="min-w-[200px] max-w-[200px] bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group overflow-hidden flex-shrink-0"
              onClick={() => navigate(`/ofertas/${offer.id}`)}
            >
              {/* Image */}
              <div className="relative h-24 overflow-hidden">
                <img
                  src={offer.image_url || '/placeholder.svg'}
                  alt={offer.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {offer.discount_percentage && offer.discount_percentage > 0 && (
                  <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5">
                    -{offer.discount_percentage}%
                  </Badge>
                )}
                <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{getTimeAgo(offer.created_at)}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {offer.business?.logo_url ? (
                    <img
                      src={offer.business.logo_url}
                      alt={offer.business.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <MapPin className="w-2.5 h-2.5 text-primary" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {offer.business?.name}
                  </span>
                </div>

                {/* Badge do tipo de oferta */}
                <Badge className={`${getOfferTypeStyle(offer.offer_type)} text-[10px] font-medium border-0 px-1.5 py-0.5 mb-1.5`}>
                  {getOfferTypeLabel(offer.offer_type)}
                </Badge>

                <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2 leading-tight">
                  {offer.title}
                </h3>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">
                    {formatPrice(offer.discounted_price)}
                  </span>
                  {offer.original_price > offer.discounted_price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(offer.original_price)}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
