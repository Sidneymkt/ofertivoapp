import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Phone, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getMapboxToken } from '@/lib/mapTokenCache';

interface MapboxOfferMapProps {
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
}

export const MapboxOfferMap: React.FC<MapboxOfferMapProps> = ({
  latitude,
  longitude,
  businessInfo,
  className = "",
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [useStaticMap, setUseStaticMap] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const initMap = async () => {
      try {
        const token = await getMapboxToken();
        
        if (!token) {
          throw new Error('Token do Mapbox não encontrado');
        }

        setMapboxToken(token);
        mapboxgl.accessToken = token;

        // Se já temos um mapa ou não temos container, não prosseguir
        if (!mapContainer.current || map.current) return;

        // Salvar posição atual do scroll antes de criar o mapa
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // Criar mapa interativo
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 15,
          pitch: 0,
          trackResize: true,
          attributionControl: false,
        });

        // Restaurar posição do scroll após criação do mapa
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });

        // Adicionar controles de navegação
        map.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: false,
          }),
          'top-right'
        );

        // Criar marcador customizado com animação
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.cssText = `
          width: 40px;
          height: 40px;
          background-color: #DC2626;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        `;

        // Adicionar hover effect
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'rotate(-45deg) scale(1.2)';
          el.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.5)';
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'rotate(-45deg) scale(1)';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        });

        const innerDot = document.createElement('div');
        innerDot.style.cssText = `
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        `;
        el.appendChild(innerDot);

        // Criar popup interativo com informações detalhadas
        const popupContent = `
          <div class="p-3 min-w-[200px]">
            <h3 class="font-bold text-base mb-2">${businessInfo.name}</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="text-gray-700">${businessInfo.address}</span>
              </div>
              ${businessInfo.phone ? `
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 flex-shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <a href="tel:${businessInfo.phone}" class="text-blue-600 hover:underline">${businessInfo.phone}</a>
                </div>
              ` : ''}
              ${businessInfo.category ? `
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 flex-shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                  </svg>
                  <span class="text-gray-700">${businessInfo.category}</span>
                </div>
              ` : ''}
            </div>
            <button 
              onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}', '_blank')"
              class="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              Como Chegar
            </button>
          </div>
        `;

        const popup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px'
        }).setHTML(popupContent);

        // Adicionar marcador
        marker.current = new mapboxgl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map.current);

        // Abrir popup automaticamente após um pequeno delay (sem afetar scroll)
        setTimeout(() => {
          if (marker.current) {
            const currentScrollY = window.scrollY;
            marker.current.togglePopup();
            // Restaurar scroll caso o popup cause reflow
            requestAnimationFrame(() => {
              window.scrollTo(0, currentScrollY);
            });
          }
        }, 500);

        // Adicionar evento de clique no marcador
        el.addEventListener('click', () => {
          if (marker.current) {
            marker.current.togglePopup();
          }
        });

      } catch (error) {
        console.error('Erro ao carregar mapa:', error);
        // Se falhar (WebGL não suportado ou outro erro), usar mapa estático
        setUseStaticMap(true);
        
        // Tentar obter o token mesmo assim para o mapa estático
        if (!mapboxToken) {
          try {
            const token = await getMapboxToken();
            if (token) {
              setMapboxToken(token);
            }
          } catch (tokenError) {
            console.error('Erro ao buscar token para mapa estático:', tokenError);
          }
        }
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, businessInfo]);

  const openDirections = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    const destination = `${latitude},${longitude}`;
    
    if (isMobile) {
      if (isIOS) {
        window.open(`maps://maps.apple.com/?daddr=${destination}`, '_blank');
      } else {
        window.open(`google.navigation:q=${destination}`, '_blank');
        setTimeout(() => {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
        }, 500);
      }
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {useStaticMap && mapboxToken ? (
            // Mapa estático como fallback quando WebGL não está disponível
            <div 
              className="w-full h-64 rounded-lg overflow-hidden bg-muted relative cursor-pointer group"
              onClick={openDirections}
            >
              <img
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+DC2626(${longitude},${latitude})/${longitude},${latitude},14,0/600x400@2x?access_token=${mapboxToken}`}
                alt={`Mapa de ${businessInfo.name}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all group-hover:scale-105">
                <Navigation className="w-4 h-4" />
                Clique para ver no mapa
              </div>
            </div>
          ) : (
            <div 
              ref={mapContainer} 
              className="w-full h-64 rounded-lg overflow-hidden"
            />
          )}
          
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <ExternalLink className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{businessInfo.address}</span>
            </div>
            
            {businessInfo.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`tel:${businessInfo.phone}`}
                  className="text-primary hover:underline"
                >
                  {businessInfo.phone}
                </a>
              </div>
            )}
            
            <Button 
              onClick={openDirections}
              className="w-full"
              variant="default"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Como Chegar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
