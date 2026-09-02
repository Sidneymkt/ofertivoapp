import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  Clock, 
  ZoomIn, 
  ZoomOut,
  Crosshair,
  ExternalLink 
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getGoogleMapsApiKey } from '@/lib/mapTokenCache';

interface OfferMapProps {
  latitude: number;
  longitude: number;
  businessInfo: {
    id: string;
    name: string;
    address: string;
    phone?: string;
    category?: string;
    website?: string;
    whatsapp?: string;
  };
  className?: string;
  height?: string; // Classe Tailwind para altura (ex: "h-64")
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps: {
      Map: any;
      Marker: any;
      InfoWindow: any;
      event: any;
      LatLng: any;
      LatLngBounds: any;
      Animation: any;
      Size: any;
      Point: any;
    };
  };
  initGoogleMaps?: () => void;
}

declare const window: GoogleMapsWindow;

export const OfferMap: React.FC<OfferMapProps> = ({
  latitude,
  longitude,
  businessInfo,
  className = "",
  height
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();

  // Função para detectar se é mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Função para carregar API do Google Maps
  const loadGoogleMapsScript = useCallback(async () => {
    if (window.google && window.google.maps) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    try {
      const apiKey = await getGoogleMapsApiKey();

      if (apiKey) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsGoogleMapsLoaded(true);
        script.onerror = () => {
          console.error('Erro ao carregar Google Maps');
          toast({
            title: "Erro no mapa",
            description: "Não foi possível carregar o mapa",
            variant: "destructive"
          });
        };
        document.head.appendChild(script);
      } else {
        throw new Error('API key não encontrada na resposta');
      }
    } catch (error) {
      console.error('Erro ao buscar API key:', error);
      toast({
        title: "Erro no mapa",
        description: "Não foi possível carregar o mapa. Verifique as configurações.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Inicializar mapa
  const initializeMap = useCallback(() => {
    if (!window.google || !mapRef.current || mapInstanceRef.current) return;

    const mapOptions = {
      zoom: 16,
      center: { lat: latitude, lng: longitude },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false, // Vamos usar controles customizados
      gestureHandling: 'cooperative',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    };

    // Criar mapa
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

    // Criar marker com animação
    markerRef.current = new window.google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: mapInstanceRef.current,
      title: businessInfo.name,
      animation: window.google.maps.Animation.DROP,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C8.954 0 0 8.954 0 20c0 11.046 20 32 20 32s20-20.954 20-32C40 8.954 31.046 0 20 0z" fill="#DC2626"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
            <circle cx="20" cy="20" r="4" fill="#DC2626"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 52),
        anchor: new window.google.maps.Point(20, 52)
      }
    });

    // Animação inicial do marker
    setTimeout(() => {
      if (markerRef.current) {
        markerRef.current.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {
          if (markerRef.current) {
            markerRef.current.setAnimation(null);
          }
        }, 2000);
      }
    }, 500);

    // Click no marker abre popover
    markerRef.current.addListener('click', () => {
      setIsPopoverOpen(true);
    });

  }, [latitude, longitude, businessInfo.name]);

  // Funções de controle do mapa
  const zoomIn = () => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(currentZoom + 1);
    }
  };

  const zoomOut = () => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(currentZoom - 1);
    }
  };

  const centerOnBusiness = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
      mapInstanceRef.current.setZoom(16);
    }
  };

  const centerOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(userPos);
            mapInstanceRef.current.setZoom(14);
            
            // Mostrar ambos os pontos no mapa
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(userPos);
            bounds.extend({ lat: latitude, lng: longitude });
            mapInstanceRef.current.fitBounds(bounds);
          }
          
          toast({
            title: "Localização encontrada",
            description: "Sua localização foi atualizada no mapa"
          });
        },
        (error) => {
          toast({
            title: "Erro de localização",
            description: "Não foi possível obter sua localização",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive"
      });
    }
  };

  // Função para abrir direções
  const openDirections = async () => {
    // Log do clique para analytics
    try {
      await supabase.from('business_analytics').insert({
        business_id: businessInfo.id,
        event_type: 'directions_clicked',
        metadata: {
          lat: latitude,
          lng: longitude,
          user_agent: navigator.userAgent,
          is_mobile: isMobile()
        }
      });
    } catch (error) {
      console.error('Erro ao registrar analytics:', error);
    }

    const coords = `${latitude},${longitude}`;
    
    if (isMobile()) {
      // Detectar plataforma mobile
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        // Tentar Apple Maps primeiro
        const appleMapUrl = `maps://?daddr=${coords}`;
        const fallbackUrl = `https://maps.apple.com/?daddr=${coords}`;
        
        // Tentar abrir app nativo
        window.location.href = appleMapUrl;
        
        // Fallback após timeout
        setTimeout(() => {
          window.open(fallbackUrl, '_blank');
        }, 1500);
        
      } else if (isAndroid) {
        // Tentar Google Maps app primeiro
        const googleAppUrl = `google.navigation:q=${coords}`;
        const fallbackUrl = `https://maps.google.com/?daddr=${coords}`;
        
        try {
          window.location.href = googleAppUrl;
          // Fallback após timeout
          setTimeout(() => {
            window.open(fallbackUrl, '_blank');
          }, 1500);
        } catch (error) {
          window.open(fallbackUrl, '_blank');
        }
      } else {
        // Fallback para outros mobiles
        window.open(`https://maps.google.com/?daddr=${coords}`, '_blank');
      }
    } else {
      // Desktop - abrir Google Maps web com direções
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
      window.open(directionsUrl, '_blank');
    }

    toast({
      title: "Abrindo direções",
      description: "Redirecionando para o aplicativo de mapas..."
    });
  };

  // Carregar script quando componente monta
  useEffect(() => {
    loadGoogleMapsScript();
  }, [loadGoogleMapsScript]);

  // Inicializar mapa quando API carrega
  useEffect(() => {
    if (isGoogleMapsLoaded) {
      initializeMap();
    }
  }, [isGoogleMapsLoaded, initializeMap]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        // Limpar event listeners se necessário
      }
    };
  }, []);

  return (
    <Card className={className}>
      <CardContent className="p-0 relative">
        {/* Container do mapa */}
        <div className={`relative rounded-lg overflow-hidden bg-muted ${height || 'aspect-video'}`}>
          <div 
            ref={mapRef} 
            className="w-full h-full"
            role="application"
            aria-label={`Mapa mostrando localização de ${businessInfo.name}`}
          />
          
          {!isGoogleMapsLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Controles de zoom - Desktop */}
          <div className="hidden md:flex absolute top-3 right-3 flex-col gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={zoomIn}
              className="w-8 h-8 p-0 shadow-md"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={zoomOut}
              className="w-8 h-8 p-0 shadow-md"
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão centralizar usuário */}
          <Button
            size="sm"
            variant="secondary"
            onClick={centerOnUser}
            className="absolute bottom-3 right-3 shadow-md"
            aria-label="Centralizar na minha localização"
          >
            <Crosshair className="w-4 h-4" />
          </Button>

          {/* Popover com informações do negócio */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <button 
                className="absolute top-3 left-3 px-2 py-1 bg-white rounded-md shadow-md text-sm font-medium hover:bg-gray-50 transition-colors"
                aria-label={`Ver informações de ${businessInfo.name}`}
              >
                <MapPin className="w-4 h-4 inline mr-1" />
                {businessInfo.name}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{businessInfo.name}</h3>
                  {businessInfo.category && (
                    <Badge variant="secondary" className="mt-1">
                      {businessInfo.category}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>{businessInfo.address}</span>
                  </div>
                  
                  {businessInfo.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`tel:${businessInfo.phone}`}
                        className="hover:underline text-primary"
                      >
                        {businessInfo.phone}
                      </a>
                    </div>
                  )}
                  
                  {businessInfo.whatsapp && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`https://wa.me/${businessInfo.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-green-600"
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}

                  {businessInfo.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={businessInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-primary"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={openDirections}
                  className="w-full"
                  size="sm"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Como chegar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Botão "Como chegar" - Mobile prominente */}
        <div className="p-3 md:hidden">
          <Button 
            onClick={openDirections}
            className="w-full"
            size="lg"
          >
            <Navigation className="w-5 h-5 mr-2" />
            Como chegar
          </Button>
        </div>

        {/* Endereço e botão para desktop */}
        <div className="hidden md:block p-3 border-t">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {businessInfo.address}
            </div>
            <Button 
              onClick={openDirections}
              variant="outline"
              size="sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Como chegar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};