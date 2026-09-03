
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Star, MapPin, Clock, Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserNavigation } from '@/hooks/useUserNavigation';

interface FollowedOffer {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  original_price: number;
  discounted_price: number;
  discount_percentage: number;
  valid_until: string;
  created_at: string;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    category: string;
  };
}

export const FollowedBusinessesFeed: React.FC = () => {
  const { user } = useAuth();
  const { follows, toggleFavorite } = useFavorites();
  const { navigateToBusinessProfile } = useUserNavigation();
  const [offers, setOffers] = useState<FollowedOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadFollowedBusinessesOffers = async () => {
    if (!user || follows.length === 0) return;

    setLoading(true);
    try {
      const businessIds = follows.map(f => f.business_id);
      
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          title,
          description,
          image_url,
          original_price,
          discounted_price,
          discount_percentage,
          valid_until,
          created_at,
          businesses (
            id,
            name,
            logo_url,
            category
          )
        `)
        .in('business_id', businessIds)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOffers((data as any) || []);
    } catch (error) {
      console.error('Error loading followed businesses offers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowedBusinessesOffers();
  }, [user, follows]);

  // Real-time subscription for new offers from followed businesses
  useEffect(() => {
    if (!user || follows.length === 0) return;

    const businessIds = follows.map(f => f.business_id);
    
    const offersChannel = supabase
      .channel('followed-offers-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers'
        },
        (payload) => {
          // Check if the new offer is from a followed business
          if (businessIds.includes(payload.new.business_id)) {
            console.log('New offer from followed business:', payload);
            loadFollowedBusinessesOffers();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers'
        },
        (payload) => {
          // Update existing offer if it's from a followed business
          if (businessIds.includes(payload.new.business_id)) {
            console.log('Updated offer from followed business:', payload);
            loadFollowedBusinessesOffers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(offersChannel);
    };
  }, [user, follows]);

  const handleViewOffer = async (offerId: string) => {
    // Record offer view if user is logged in
    if (user) {
      try {
        await supabase
          .from('offer_views')
          .insert([{
            user_id: user.id,
            offer_id: offerId,
            viewed_at: new Date().toISOString()
          }]);
      } catch (error) {
        console.error('Error recording offer view:', error);
      }
    }
    
    navigate(`/ofertas/${offerId}`);
  };

  const handleToggleFavorite = (offerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavorite(offerId);
  };

  if (follows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Star className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Feed Personalizado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Siga negócios para ver suas ofertas exclusivas aqui
          </p>
          <Button variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Encontrar Negócios
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feed dos Negócios Seguidos</h2>
          <p className="text-muted-foreground">
            Ofertas exclusivas dos {follows.length} negócios que você segue
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center">
          <Bell className="w-4 h-4 mr-2" />
          {offers.length} novas ofertas
        </Badge>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma oferta nova</h3>
            <p className="text-muted-foreground text-center">
              Os negócios que você segue ainda não publicaram ofertas recentes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => navigateToBusinessProfile(offer.businesses.id)}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    {offer.businesses.logo_url ? (
                      <img
                        src={offer.businesses.logo_url}
                        alt={offer.businesses.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {offer.businesses.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </button>
                  <div className="flex-1">
                    <button 
                      onClick={() => navigateToBusinessProfile(offer.businesses.id)}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <h3 className="font-semibold">{offer.businesses.name}</h3>
                    </button>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Badge variant="outline" className="mr-2">
                        {offer.businesses.category}
                      </Badge>
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(new Date(offer.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {offer.image_url && (
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      className="w-full h-48 rounded-lg object-cover"
                    />
                  )}
                  
                  <div>
                    <h4 className="font-semibold text-lg">{offer.title}</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      {offer.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-green-600">
                        R$ {offer.discounted_price.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {offer.original_price.toFixed(2)}
                      </span>
                      <Badge variant="destructive">
                        {offer.discount_percentage}% OFF
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Válido até {new Date(offer.valid_until).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleViewOffer(offer.id)}
                    >
                      Ver Oferta
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={(e) => handleToggleFavorite(offer.id, e)}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => navigateToBusinessProfile(offer.businesses.id)}
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
