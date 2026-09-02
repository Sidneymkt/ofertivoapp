import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate } from 'react-router-dom';
import { getMapboxToken } from '@/lib/mapTokenCache';
import { MapPin, Loader2 } from 'lucide-react';

export interface NearbyMapOffer {
  id: string;
  title: string;
  business: string;
  finalPrice: string;
  latitude: number;
  longitude: number;
  distance: number | null;
}

interface NearbyOffersMapProps {
  offers: NearbyMapOffer[];
  userLocation: { lat: number; lng: number };
  className?: string;
  height?: number;
}

/**
 * Mini mapa com as ofertas próximas à localização atual do usuário.
 * Usado na tela de Ofertas (modo "Mapa").
 */
export const NearbyOffersMap: React.FC<NearbyOffersMapProps> = ({
  offers,
  userLocation,
  className = '',
  height = 380,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializa o mapa uma única vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getMapboxToken();
        if (!token) throw new Error('Mapa indisponível no momento.');
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapboxgl.accessToken = token;
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [userLocation.lng, userLocation.lat],
          zoom: 12,
          attributionControl: false,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current.on('load', () => !cancelled && setLoading(false));
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Não foi possível carregar o mapa.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcador do usuário + recentralização quando a localização muda
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = document.createElement('div');
    el.className = 'nearby-user-dot';
    el.style.cssText =
      'width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,0.25);';
    userMarkerRef.current?.remove();
    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 14 }).setText('Você está aqui'))
      .addTo(map);
    map.easeTo({ center: [userLocation.lng, userLocation.lat], duration: 600 });
  }, [userLocation.lat, userLocation.lng]);

  // Marcadores das ofertas
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const valid = offers.filter(
      (o) => Number.isFinite(Number(o.latitude)) && Number.isFinite(Number(o.longitude)) && Number(o.latitude) !== 0,
    );

    valid.forEach((offer) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', offer.title);
      el.style.cssText =
        'display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:hsl(var(--primary));color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:14px;cursor:pointer;';
      el.textContent = '%';

      const popup = new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(
        `<div style="font-family:inherit;min-width:150px">
           <strong style="display:block;font-size:13px">${offer.title.replace(/</g, '&lt;')}</strong>
           <span style="font-size:11px;opacity:.75">${offer.business.replace(/</g, '&lt;')}</span>
           <div style="margin-top:4px;font-size:12px;font-weight:600">${offer.finalPrice}${
             offer.distance !== null ? ` · ${offer.distance.toFixed(1)} km` : ''
           }</div>
         </div>`,
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([Number(offer.longitude), Number(offer.latitude)])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('dblclick', () => navigate(`/offers/${offer.id}`));
      markersRef.current.push(marker);
    });

    if (valid.length > 0) {
      const lngs = [userLocation.lng, ...valid.map((o) => Number(o.longitude))];
      const lats = [userLocation.lat, ...valid.map((o) => Number(o.latitude))];
      const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
      const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
      (map as any).fitBounds([sw, ne], { padding: 60, maxZoom: 14, duration: 600 });
    }

  }, [offers, navigate, userLocation.lat, userLocation.lng]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border/60 ${className}`} style={{ height }}>
      <div ref={containerRef} className="absolute inset-0" />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/70 text-center px-4">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      )}
      {!loading && !error && (
        <div className="absolute bottom-2 left-2 rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium shadow">
          {offers.length} oferta{offers.length === 1 ? '' : 's'} perto de você
        </div>
      )}
    </div>
  );
};

export default NearbyOffersMap;
