import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, CircleDot, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CoverageRadiusSelectorProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  className?: string;
}

export const CoverageRadiusSelector: React.FC<CoverageRadiusSelectorProps> = ({
  latitude,
  longitude,
  radiusKm,
  onRadiusChange,
  className = "",
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const circleLayerId = 'coverage-radius-circle';
  const circleSourceId = 'coverage-radius-source';
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useStaticMap, setUseStaticMap] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  // Gerar GeoJSON para o círculo de raio
  const createCircleGeoJSON = (centerLng: number, centerLat: number, radiusInKm: number) => {
    const points = 64;
    const km = radiusInKm;
    const coords = [];
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = km * Math.cos(angle);
      const dy = km * Math.sin(angle);
      
      // Converter km para graus
      const latOffset = dy / 111.32;
      const lngOffset = dx / (111.32 * Math.cos(centerLat * Math.PI / 180));
      
      coords.push([centerLng + lngOffset, centerLat + latOffset]);
    }
    
    // Fechar o círculo
    coords.push(coords[0]);
    
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords],
      },
      properties: {},
    };
  };

  // Atualizar círculo quando o raio mudar
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource(circleSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(createCircleGeoJSON(longitude, latitude, radiusKm));
    }
    
    // Ajustar zoom baseado no raio
    const zoomLevel = radiusKm <= 1 ? 14 : radiusKm <= 3 ? 13 : radiusKm <= 5 ? 12 : radiusKm <= 10 ? 11 : 10;
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: zoomLevel,
      duration: 500,
    });
  }, [radiusKm, mapLoaded, longitude, latitude]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    const initMap = async () => {
      try {
        // Buscar token do Mapbox
        const { data: configData } = await supabase.functions.invoke('mapbox-config');
        
        if (!configData?.token) {
          throw new Error('Token do Mapbox não encontrado');
        }

        setMapboxToken(configData.token);
        mapboxgl.accessToken = configData.token;

        // Reset fallback a cada nova inicialização
        setUseStaticMap(false);
        setError(null);

        // Salvar posição do scroll
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // Criar mapa
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [longitude, latitude],
          zoom: 13,
          pitch: 0,
          attributionControl: false,
        });

        // Restaurar scroll
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });

        // Adicionar controles
        map.current.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: false }),
          'top-right'
        );

        // Quando o mapa carregar
        map.current.on('load', () => {
          if (!map.current) return;

          // Adicionar source do círculo
          map.current.addSource(circleSourceId, {
            type: 'geojson',
            data: createCircleGeoJSON(longitude, latitude, radiusKm),
          });

          // Adicionar layer do círculo (preenchimento)
          map.current.addLayer({
            id: circleLayerId,
            type: 'fill',
            source: circleSourceId,
            paint: {
              'fill-color': '#8B5CF6',
              'fill-opacity': 0.15,
            },
          });

          // Adicionar layer da borda do círculo
          map.current.addLayer({
            id: `${circleLayerId}-border`,
            type: 'line',
            source: circleSourceId,
            paint: {
              'line-color': '#8B5CF6',
              'line-width': 2,
              'line-dasharray': [2, 2],
            },
          });

          setMapLoaded(true);
        });

        // Criar marcador central
        const el = document.createElement('div');
        el.style.cssText = `
          width: 20px;
          height: 20px;
          background-color: #8B5CF6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
        `;

        marker.current = new mapboxgl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(map.current);

      } catch (err) {
        console.error('Erro ao inicializar mapa:', err);
        // Fallback: usar mapa estático quando o WebGL/worker falhar
        if (mapboxToken || typeof (err as any)?.message === 'string') {
          setUseStaticMap(true);
          setError(null);
        } else {
          setError('Não foi possível carregar o mapa');
        }
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [latitude, longitude]);

  // Helpers para mapa estático
  const getZoomLevelForRadius = (rKm: number) =>
    rKm <= 1 ? 14 : rKm <= 3 ? 13 : rKm <= 5 ? 12 : rKm <= 10 ? 11 : 10;

  const metersPerPixel = (lat: number, zoom: number) =>
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);

  // Estimativa de alcance
  const getReachEstimate = (radius: number) => {
    // Estimativa simples baseada na densidade de Manaus (~158 hab/km²)
    const area = Math.PI * radius * radius;
    const density = 158;
    const population = Math.round(area * density);
    
    if (population < 1000) {
      return `~${population} pessoas`;
    } else if (population < 10000) {
      return `~${(population / 1000).toFixed(1)}k pessoas`;
    } else {
      return `~${Math.round(population / 1000)}k pessoas`;
    }
  };

  return (
    <Card className={`border border-border/50 bg-card/50 ${className}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <CircleDot className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">Raio de Abrangência</CardTitle>
              <CardDescription className="text-xs">
                {radiusKm} km • {getReachEstimate(radiusKm)}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600">
            <MapPin className="w-3 h-3 mr-1" />
            Área de alcance
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4 space-y-4">
        {error ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* Mapa */}
            {useStaticMap && mapboxToken ? (
              (() => {
                const zoom = getZoomLevelForRadius(radiusKm);
                const rPx = (radiusKm * 1000) / metersPerPixel(latitude, zoom);
                const w = 600;
                const h = 400;
                const cx = w / 2;
                const cy = h / 2;
                const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${longitude},${latitude},${zoom},0/${w}x${h}@2x?access_token=${mapboxToken}`;

                return (
                  <div className="w-full h-48 sm:h-56 rounded-lg overflow-hidden border border-border/50 shadow-sm bg-muted relative">
                    <img
                      src={staticUrl}
                      alt="Mapa do raio de abrangência"
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox={`0 0 ${w} ${h}`}
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={Math.max(8, Math.min(rPx, Math.max(w, h)))}
                        style={{
                          fill: 'hsl(var(--primary) / 0.12)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 3,
                          strokeDasharray: '6 6',
                        }}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        style={{ fill: 'hsl(var(--primary))' }}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={9}
                        style={{ fill: 'hsl(var(--background))', opacity: 0.9 }}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        style={{ fill: 'hsl(var(--primary))' }}
                      />
                    </svg>
                  </div>
                );
              })()
            ) : (
              <div 
                ref={mapContainer} 
                className="w-full h-48 sm:h-56 rounded-lg overflow-hidden border border-border/50 shadow-sm"
              />
            )}

            {/* Slider de raio */}
            <div className="space-y-3 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Raio de cobertura
                </Label>
                <span className="text-lg font-bold text-purple-600">
                  {radiusKm} km
                </span>
              </div>
              
              <Slider
                value={[radiusKm]}
                onValueChange={(value) => onRadiusChange(value[0])}
                min={1}
                max={25}
                step={1}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 km (local)</span>
                <span>25 km (regional)</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 text-xs text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
              <p>
                Sua oferta será exibida para usuários dentro deste raio. 
                Usuários fora da área ainda podem ver a oferta ao buscar.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CoverageRadiusSelector;
