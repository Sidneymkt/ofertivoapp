import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radar, MapPin, Navigation, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateDistance } from '@/lib/geo';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NearbyOffer {
  id: string;
  title: string;
  distance: number;
  discount_percentage: number;
  discounted_price: number;
  business_name: string;
  category: string;
  image_url: string | null;
}

export const OffersProximityRadar = () => {
  const navigate = useNavigate();
  const [nearbyOffers, setNearbyOffers] = useState<NearbyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pulsing, setPulsing] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: -3.1190, lng: -60.0217 }), // Manaus default
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      setUserLocation({ lat: -3.1190, lng: -60.0217 });
    }
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    fetchNearbyOffers();
  }, [userLocation]);

  // Pulse animation timer
  useEffect(() => {
    const interval = setInterval(() => setPulsing(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchNearbyOffers = async () => {
    if (!userLocation) return;
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('id, title, discount_percentage, discounted_price, latitude, longitude, category, image_url, businesses(name)')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .limit(50);

      if (error) throw error;

      const withDistance = (data || [])
        .map((offer: any) => ({
          id: offer.id,
          title: offer.title,
          discount_percentage: offer.discount_percentage || 0,
          discounted_price: offer.discounted_price,
          business_name: offer.businesses?.name || 'Negócio',
          category: offer.category,
          image_url: offer.image_url,
          distance: calculateDistance(userLocation.lat, userLocation.lng, Number(offer.latitude), Number(offer.longitude)),
        }))
        .filter((o: NearbyOffer) => o.distance <= 5) // within 5km
        .sort((a: NearbyOffer, b: NearbyOffer) => a.distance - b.distance)
        .slice(0, 5);

      setNearbyOffers(withDistance);
    } catch (err) {
      console.error('Erro ao buscar ofertas próximas:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDistanceLabel = (km: number) => {
    if (km < 0.3) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const getDistanceColor = (km: number) => {
    if (km < 0.5) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (km < 1) return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    if (km < 2) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) return null;
  if (nearbyOffers.length === 0) return null;

  return (
    <section className="py-4 sm:py-6">
      <div className="container mx-auto px-3 sm:px-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className={cn(
                    'w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center',
                    pulsing && 'animate-pulse'
                  )}>
                    <Radar className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    Radar de Ofertas
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {nearbyOffers.length} ofertas perto de você agora
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/mapa')} className="text-xs">
                Ver Mapa
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(c => !c)}
              className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {collapsed ? 'Mostrar ofertas' : 'Recolher ofertas'}
              {collapsed ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronUp className="w-4 h-4 ml-1" />}
            </Button>
          </CardHeader>
          {!collapsed && (
          <CardContent className="p-3 sm:p-4 pt-2">
            <div className="space-y-2">
              {nearbyOffers.map((offer, i) => (
                <Link
                  key={offer.id}
                  to={`/ofertas/${offer.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                >
                  <div className="relative shrink-0">
                    {offer.image_url ? (
                      <img
                        src={offer.image_url}
                        alt={offer.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    {offer.discount_percentage > 0 && (
                      <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-destructive text-white px-1.5 py-0.5 rounded-full">
                        -{offer.discount_percentage}%
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {offer.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{offer.business_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={cn('text-[10px] font-semibold border-0', getDistanceColor(offer.distance))}>
                      <Navigation className="w-2.5 h-2.5 mr-0.5" />
                      {getDistanceLabel(offer.distance)}
                    </Badge>
                    <span className="text-xs font-bold text-primary">
                      R$ {offer.discounted_price.toFixed(2)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
          )}
        </Card>
      </div>
    </section>
  );
};
