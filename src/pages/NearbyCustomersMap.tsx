import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNearbyEngagedUsers, EngagedUser } from '@/hooks/useNearbyEngagedUsers';
import { useBusinessOnlineUsers } from '@/hooks/useBusinessOnlineUsers';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, Users, Heart, QrCode, Star, Gift, Eye, UserCheck, 
  MessageSquare, Send, ExternalLink, Radar, Target, Crosshair,
  Layers, Sun, Moon, Mountain, Map as MapIcon, Maximize2, Minimize2, 
  ChevronDown, ChevronUp, ZoomIn, ZoomOut, Fish, Anchor, Link2
} from 'lucide-react';
import { MessageLinkSelector, MessageLinkPreview, SelectedLink } from '@/components/MessageLinkSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  follow: <UserCheck className="w-3 h-3 text-purple-500" />,
  favorite: <Star className="w-3 h-3 text-yellow-500" />,
  checkin: <QrCode className="w-3 h-3 text-emerald-500" />,
  like: <Heart className="w-3 h-3 text-rose-500" />,
  raffle: <Gift className="w-3 h-3 text-blue-500" />,
  view: <Eye className="w-3 h-3 text-gray-500" />,
};

const ACTION_COLORS: Record<string, string> = {
  follow: '#a855f7',
  favorite: '#eab308',
  checkin: '#10b981',
  like: '#f43f5e',
  raffle: '#3b82f6',
  view: '#6b7280',
};

const ACTION_LABELS: Record<string, string> = {
  follow: 'Seguidor',
  favorite: 'Favorito',
  checkin: 'Check-in',
  like: 'Curtida',
  raffle: 'Sorteio',
  view: 'Visualização',
};

const HOT_LEVEL_CONFIG = {
  fire: { emoji: '🔥', label: 'Em Chamas', color: '#ef4444', bg: 'bg-red-500/20 text-red-700 dark:text-red-400' },
  hot: { emoji: '🌶️', label: 'Quente', color: '#f97316', bg: 'bg-orange-500/20 text-orange-700 dark:text-orange-400' },
  warm: { emoji: '☀️', label: 'Morno', color: '#eab308', bg: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  cold: { emoji: '❄️', label: 'Frio', color: '#6b7280', bg: 'bg-muted text-muted-foreground' },
};

const MAP_STYLES = [
  { id: 'streets', label: 'Ruas', icon: MapIcon, style: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', label: 'Satélite', icon: Mountain, style: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'light', label: 'Claro', icon: Sun, style: 'mapbox://styles/mapbox/light-v11' },
  { id: 'dark', label: 'Escuro', icon: Moon, style: 'mapbox://styles/mapbox/dark-v11' },
];

// Simulated movement offsets for "live" feel
const getMovementOffset = (userId: string, tick: number) => {
  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const speed = 0.00003 + (hash % 5) * 0.00001;
  const angle = ((hash % 360) + tick * (2 + (hash % 3))) * (Math.PI / 180);
  return {
    lat: Math.sin(angle) * speed * (1 + Math.sin(tick * 0.02 + hash) * 0.5),
    lng: Math.cos(angle) * speed * (1 + Math.cos(tick * 0.03 + hash) * 0.5),
  };
};

const NearbyCustomersMap = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const googleMap = useRef<any | null>(null);
  const googleMarkers = useRef<any[]>([]);
  const googleMapsLoaderPromise = useRef<Promise<void> | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const movementTick = useRef(0);
  const movementInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [detailUser, setDetailUser] = useState<EngagedUser | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedLink, setSelectedLink] = useState<SelectedLink | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [activeMapProvider, setActiveMapProvider] = useState<'mapbox' | 'google' | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentMapStyle, setCurrentMapStyle] = useState('streets');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [radiusKm, setRadiusKm] = useState(10); // configurable radius filter
  const queryClient = useQueryClient();

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const engagedQuery = useNearbyEngagedUsers(business?.id || null);
  const engagedUsers: EngagedUser[] = engagedQuery.data ?? [];
  const loadingUsers = engagedQuery.isLoading;
  const engagedError = engagedQuery.error as Error | null;
  const rpcMissing = (engagedQuery as any).rpcMissing as boolean;
  const onlineUserIds = useBusinessOnlineUsers(business?.id || null);

  // Haversine distance calc
  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredUsers = filterType
    ? engagedUsers.filter(u => u.actions.some(a => a.type === filterType))
    : engagedUsers;

  // Include all users with coordinates on the map (including business_fallback so raffle participants etc. are visible)
  // Apply configurable radius filter
  const allMapUsers = filteredUsers
    .filter(u => u.latitude !== null && u.longitude !== null)
    .filter(u => {
      if (!business) return true;
      const dist = calcDistance(business.latitude, business.longitude, u.latitude!, u.longitude!);
      return dist <= radiusKm;
    })
    .map(u => ({
      ...u,
      latitude: u.latitude!,
      longitude: u.longitude!,
    }));

  // Users with interactions but absolutely no location data at all (shown in list only)
  const usersWithoutLocation = filteredUsers.filter(u => u.latitude === null || u.longitude === null);


  // Sort: online first, then by proximity to business
  const sortedMapUsers = [...allMapUsers].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.userId) ? 1 : 0;
    const bOnline = onlineUserIds.has(b.userId) ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;
    if (!business) return 0;
    const distA = calcDistance(business.latitude, business.longitude, a.latitude!, a.longitude!);
    const distB = calcDistance(business.latitude, business.longitude, b.latitude!, b.longitude!);
    return distA - distB;
  });

  // Build avatar marker HTML with profile image and colored border
  const buildAvatarMarkerHTML = (u: typeof allMapUsers[0], color: string, tick: number) => {
    const size = 40;
    const borderWidth = 3;
    const hotConfig = HOT_LEVEL_CONFIG[u.hotLevel || 'cold'];
    const avatarContent = u.avatarUrl
      ? `<img src="${u.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div style="display:none;width:100%;height:100%;border-radius:50%;background:${color};align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">${u.fullName?.charAt(0)?.toUpperCase() || '?'}</div>`
      : `<div style="width:100%;height:100%;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">${u.fullName?.charAt(0)?.toUpperCase() || '?'}</div>`;

    const hotBadge = u.hotScore >= 25
      ? `<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:12px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">${hotConfig.emoji}</div>`
      : '';

    return `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;top:-4px;left:-4px;width:${size + 8}px;height:${size + 8}px;border-radius:50%;background:${hotConfig.color};opacity:0.25;animation:ofertivo-ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:${size}px;height:${size}px;border-radius:50%;border:${borderWidth}px solid ${hotConfig.color};overflow:hidden;box-shadow:0 2px 12px ${hotConfig.color}55;position:relative;background:white;">
          ${avatarContent}
        </div>
        <div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:${hotConfig.color};border:2px solid white;"></div>
        ${hotBadge}
      </div>
    `;
  };

  // Google Maps fallback
  const loadGoogleMapsScript = async (): Promise<boolean> => {
    const w = window as any;
    if (w.google?.maps) return true;
    try {
      if (!googleMapsLoaderPromise.current) {
        googleMapsLoaderPromise.current = (async () => {
          const { data, error } = await supabase.functions.invoke('google-maps-api', { body: { endpoint: 'config' } });
          if (error || !data?.apiKey) throw new Error('Google Maps API key não configurada');
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById('google-maps-sdk') as HTMLScriptElement | null;
            if (existing) {
              if (w.google?.maps) { resolve(); return; }
              existing.addEventListener('load', () => resolve(), { once: true });
              existing.addEventListener('error', () => reject(new Error('Falha')), { once: true });
              return;
            }
            const s = document.createElement('script');
            s.id = 'google-maps-sdk';
            s.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}`;
            s.async = true; s.defer = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Falha'));
            document.head.appendChild(s);
          });
        })();
      }
      await googleMapsLoaderPromise.current;
      return Boolean(w.google?.maps);
    } catch { return false; }
  };

  const clearGoogleMarkers = () => {
    googleMarkers.current.forEach(m => m.setMap(null));
    googleMarkers.current = [];
  };

  const focusRadarLocation = useCallback((latitude: number, longitude: number, zoom = 15, duration = 700) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    if (activeMapProvider === 'mapbox' && map.current) {
      const mapInstance = map.current;
      const currentZoom = typeof mapInstance.getZoom === 'function' ? mapInstance.getZoom() : 13;
      const targetZoom = Math.max(currentZoom, zoom);

      try { mapInstance.stop?.(); } catch {}

      mapInstance.easeTo({
        center: [longitude, latitude],
        zoom: targetZoom,
        offset: [0, 0],
        duration,
        essential: true,
        retainPadding: false,
      });

      window.setTimeout(() => {
        if (!map.current) return;
        const point = map.current.project([longitude, latitude]);
        const container = map.current.getContainer();
        const safeEdge = 56;
        const isNearEdge =
          point.x < safeEdge ||
          point.y < safeEdge ||
          point.x > container.clientWidth - safeEdge ||
          point.y > container.clientHeight - safeEdge;

        if (isNearEdge) {
          map.current.jumpTo({ center: [longitude, latitude], zoom: targetZoom });
        }
      }, duration + 80);
    } else if (activeMapProvider === 'google' && googleMap.current) {
      googleMap.current.panTo({ lat: latitude, lng: longitude });
      googleMap.current.setZoom(Math.max(googleMap.current.getZoom?.() || 13, zoom));
    }
  }, [activeMapProvider]);

  const initializeGoogleFallback = async () => {
    if (!mapContainer.current || !business) return false;
    const ok = await loadGoogleMapsScript();
    if (!ok) return false;
    const w = window as any;
    googleMap.current = new w.google.maps.Map(mapContainer.current, {
      center: { lat: business.latitude, lng: business.longitude },
      zoom: 13,
      mapTypeControl: false, fullscreenControl: false, streetViewControl: false, panControl: false, zoomControl: false,
    });
    setActiveMapProvider('google');
    setMapError(null);
    setIsMapLoading(false);
    return true;
  };

  // Add mapbox markers with avatar images
  const addMapboxUserMarkers = useCallback(() => {
    if (!map.current || !business) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Business marker (anchor/fishing base)
    const businessEl = document.createElement('div');
    businessEl.innerHTML = `
      <div style="width:50px;height:50px;background:linear-gradient(135deg,hsl(142,76%,36%),#4ade80);border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:radar-pulse 2s infinite;">
        ${business.logo_url 
          ? `<img src="${business.logo_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />`
          : `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M3 21V7l9-4 9 4v14H3z"/></svg>`
        }
      </div>
    `;
    const bizMarker = new mapboxgl.Marker({ element: businessEl })
      .setLngLat([business.longitude, business.latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<div style="padding:12px;"><strong>${business.name}</strong><br/><small>📍 ${business.address}</small></div>`))
      .addTo(map.current);
    markersRef.current.push(bizMarker);

    const tick = movementTick.current;

    allMapUsers.forEach(u => {
      if (!u.latitude || !u.longitude) return;
      const primaryAction = u.actions[0]?.type || 'view';
      const color = ACTION_COLORS[primaryAction] || '#6b7280';
      const dist = calcDistance(business.latitude, business.longitude, u.latitude, u.longitude);

      // Apply movement offset for live feel
      const offset = liveMode ? getMovementOffset(u.userId, tick) : { lat: 0, lng: 0 };
      const lng = u.longitude! + offset.lng;
      const lat = u.latitude! + offset.lat;

      // IMPORTANT: mapbox-gl sets `transform: translate(...)` on the marker root element
      // to position it. Applying `transform: scale(...)` directly to `el` overwrites the
      // translation and sends the marker to the top-left corner. Wrap the content in an
      // inner div and animate that instead.
      const el = document.createElement('div');
      el.className = 'radar-user-marker';
      el.style.cursor = 'pointer';
      el.style.willChange = 'transform';
      const inner = document.createElement('div');
      inner.style.transition = 'transform 150ms ease';
      inner.style.transformOrigin = 'center center';
      inner.innerHTML = buildAvatarMarkerHTML(u, color, tick);
      el.appendChild(inner);
      el.onmouseenter = () => { inner.style.transform = 'scale(1.2)'; el.style.zIndex = '100'; };
      el.onmouseleave = () => { inner.style.transform = 'scale(1)'; el.style.zIndex = ''; };

      const actionBadges = [...new Set(u.actions.map(a => a.type))].map(type => 
        `<span style="font-size:10px;padding:2px 6px;border-radius:999px;background:${ACTION_COLORS[type]}22;color:${ACTION_COLORS[type]};font-weight:600;">${ACTION_LABELS[type]}</span>`
      ).join('');

      const hotConfig = HOT_LEVEL_CONFIG[u.hotLevel || 'cold'];
      const popupContent = `
        <div style="min-width:220px;font-family:system-ui,sans-serif;padding:12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            ${u.avatarUrl 
              ? `<img src="${u.avatarUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:3px solid ${hotConfig.color};" />` 
              : `<div style="width:44px;height:44px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;border:3px solid ${hotConfig.color}44;">${u.fullName?.charAt(0)?.toUpperCase() || '?'}</div>`
            }
            <div>
              <strong style="display:block;font-size:14px;">${u.fullName || 'Usuário'}</strong>
              <span style="font-size:11px;color:#6b7280;">📍 ${dist.toFixed(1)} km · ${u.totalInteractions} interações</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:6px;border-radius:8px;background:${hotConfig.color}15;">
            <span style="font-size:16px;">${hotConfig.emoji}</span>
            <div style="flex:1;">
              <div style="font-size:11px;font-weight:600;color:${hotConfig.color};">${hotConfig.label} · ${u.hotScore}/100</div>
              <div style="width:100%;height:4px;border-radius:2px;background:#e5e7eb;margin-top:2px;">
                <div style="width:${u.hotScore}%;height:100%;border-radius:2px;background:${hotConfig.color};transition:width 0.3s;"></div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">${actionBadges}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:10px;">Última: ${u.lastActionAt ? format(new Date(u.lastActionAt), "dd/MM 'às' HH:mm", { locale: ptBR }) : '-'}</div>
          <div style="display:flex;gap:6px;">
            <button onclick="window.__openRadarUserDetail__('${u.userId}')" style="flex:1;padding:7px;border:1px solid #ddd;border-radius:8px;background:white;cursor:pointer;font-size:11px;font-weight:600;">👤 Ver detalhes</button>
            <button onclick="window.__openRadarUserDetail__('${u.userId}');setTimeout(()=>document.querySelector('[data-send-msg]')?.click(),300)" style="flex:1;padding:7px;border:none;border-radius:8px;background:${hotConfig.color};color:white;cursor:pointer;font-size:11px;font-weight:600;">🎣 Pescar</button>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        closeOnMove: false,
        maxWidth: '300px',
        className: 'offer-popup',
        focusAfterOpen: false,
        autoPan: false,
      })
        .setHTML(popupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        (e as MouseEvent & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

        if (map.current) {
          const currentLngLat = marker.getLngLat?.();
          const targetLng = currentLngLat?.lng ?? lng;
          const targetLat = currentLngLat?.lat ?? lat;

          focusRadarLocation(targetLat, targetLng, 15, 600);

          if (popup.isOpen?.()) {
            popup.remove();
          } else {
            popup.setLngLat([targetLng, targetLat]).addTo(map.current);
          }
        }
      });

      markersRef.current.push(marker);
    });
  }, [business, allMapUsers, liveMode, focusRadarLocation]);

  // Simulated movement: update marker positions periodically
  useEffect(() => {
    if (!liveMode || activeMapProvider !== 'mapbox' || !map.current || !business) return;

    movementInterval.current = setInterval(() => {
      movementTick.current += 1;
      const tick = movementTick.current;

      // Move existing markers (skip first = business marker)
      markersRef.current.forEach((marker, idx) => {
        if (idx === 0) return; // business marker
        const userIdx = idx - 1;
        if (userIdx >= allMapUsers.length) return;
        const u = allMapUsers[userIdx];
        if (!u.latitude || !u.longitude) return;
        const offset = getMovementOffset(u.userId, tick);
        marker.setLngLat([u.longitude + offset.lng, u.latitude + offset.lat]);
      });
    }, 3000);

    return () => {
      if (movementInterval.current) clearInterval(movementInterval.current);
    };
  }, [liveMode, activeMapProvider, business, allMapUsers]);

  // Global handler for popup buttons
  useEffect(() => {
    (window as any).__openRadarUserDetail__ = (userId: string) => {
      const found = engagedUsers.find(u => u.userId === userId);
      if (found) {
        setDetailUser(found);
        if (found.latitude && found.longitude) {
          focusRadarLocation(found.latitude, found.longitude, 15, 500);
        }
      }
    };
    return () => { delete (window as any).__openRadarUserDetail__; };
  }, [engagedUsers, focusRadarLocation]);

  // Hybrid map initialization
  useEffect(() => {
    if (!business || !mapContainer.current) return;
    let cancelled = false;
    let loadTimeout: ReturnType<typeof setTimeout>;

    const initializeMap = async () => {
      try {
        if (!mapContainer.current) return;
        if (map.current) {
          try { map.current.getCenter(); return; } catch {
            try { map.current.remove(); } catch {} 
            map.current = null;
          }
        }

        // Check WebGL support without destroying context
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          console.log('[Radar] WebGL not available, using Google Maps fallback');
          const ok = await initializeGoogleFallback();
          if (!ok) { setMapError('Não foi possível carregar o mapa.'); setIsMapLoading(false); }
          return;
        }
        // Do NOT call loseContext() — it corrupts WebGL for Mapbox

        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('mapbox-config');
        if (cancelled) return;
        if (tokenError || !tokenData?.token) {
          console.log('[Radar] No Mapbox token, using Google Maps fallback');
          const ok = await initializeGoogleFallback();
          if (!ok) { setMapError('Não foi possível carregar o mapa.'); setIsMapLoading(false); }
          return;
        }

        mapboxgl.accessToken = tokenData.token.trim();

        const rect = mapContainer.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          await new Promise(r => setTimeout(r, 500));
          if (cancelled) return;
          if (retryCount.current < maxRetries) {
            retryCount.current++;
            setTimeout(() => { if (!cancelled) initializeMap(); }, 1000);
            return;
          }
          const ok = await initializeGoogleFallback();
          if (!ok) { setMapError('Não foi possível carregar o mapa.'); setIsMapLoading(false); }
          return;
        }

        const selectedStyle = MAP_STYLES.find(s => s.id === currentMapStyle)?.style || MAP_STYLES[0].style;

        let newMap: mapboxgl.Map;
        try {
          newMap = new mapboxgl.Map({
            container: mapContainer.current,
            style: selectedStyle,
            center: [business.longitude, business.latitude],
            zoom: 13,
            pitch: 20,
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: false,
            antialias: false,
            trackResize: true,
          });
        } catch (mapboxError) {
          // Mapbox failed (WebGL issue) — immediately fall back to Google Maps
          console.log('[Radar] Mapbox init failed, using Google Maps fallback:', mapboxError);
          const ok = await initializeGoogleFallback();
          if (!ok) { setMapError('Não foi possível carregar o mapa.'); setIsMapLoading(false); }
          return;
        }

        map.current = newMap;
        setActiveMapProvider('mapbox');

        loadTimeout = setTimeout(() => {
          if (cancelled) return;
          try { newMap.remove(); } catch {}
          map.current = null;
          void initializeGoogleFallback().then(ok => {
            if (!ok) { setMapError('Não foi possível carregar o mapa.'); setIsMapLoading(false); }
          });
        }, 15000);

        newMap.on('load', () => {
          if (cancelled) return;
          clearTimeout(loadTimeout);
          setIsMapLoading(false);
          setMapError(null);
          setTimeout(() => { try { newMap.resize(); } catch {} }, 100);
        });

        newMap.on('error', (e) => {
          if (e.error && (e.error as any)?.status === 401) {
            clearTimeout(loadTimeout);
            void initializeGoogleFallback().then(ok => {
              if (!ok) { setMapError('Não foi possível carregar o mapa.'); setIsMapLoading(false); }
            });
          }
        });

        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          trackUserLocation: true,
          showUserHeading: true,
          showAccuracyCircle: true,
          fitBoundsOptions: { maxZoom: 15 },
        });
        newMap.addControl(geolocate, 'top-right');
        // Auto-activate geolocation once the map is ready so the advertiser always sees their real position
        newMap.on('load', () => {
          setTimeout(() => {
            try { (geolocate as any).trigger?.(); } catch {}
          }, 400);
        });
        try {
          (geolocate as any).on?.('error', (err: any) => {
            console.log('[Radar] Geolocate error:', err?.message || err);
          });
        } catch {}

      } catch (error) {
        if (cancelled) return;
        console.log('[Radar] Map init error, falling back to Google Maps:', error);
        // Don't retry on WebGL errors — go straight to fallback
        if (map.current) { try { map.current.remove(); } catch {} map.current = null; }
        const ok = await initializeGoogleFallback();
        if (!ok) { setMapError('Não foi possível carregar o mapa.'); setIsMapLoading(false); }
      }
    };

    const delay = setTimeout(() => initializeMap(), 100);

    return () => {
      cancelled = true;
      clearTimeout(delay);
      clearTimeout(loadTimeout!);
      if (map.current) { try { map.current.remove(); } catch {} map.current = null; }
      clearGoogleMarkers();
      googleMap.current = null;
    };
  }, [business]);

  // Change map style
  const handleStyleChange = (styleId: string) => {
    setCurrentMapStyle(styleId);
    if (activeMapProvider === 'mapbox' && map.current) {
      const style = MAP_STYLES.find(s => s.id === styleId)?.style;
      if (style) {
        map.current.setStyle(style);
      }
    } else if (activeMapProvider === 'google' && googleMap.current) {
      const w = window as any;
      if (styleId === 'satellite') {
        googleMap.current.setMapTypeId(w.google.maps.MapTypeId.HYBRID);
      } else if (styleId === 'dark') {
        googleMap.current.setMapTypeId(w.google.maps.MapTypeId.ROADMAP);
        googleMap.current.setOptions({ styles: [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        ]});
      } else if (styleId === 'light') {
        googleMap.current.setMapTypeId(w.google.maps.MapTypeId.ROADMAP);
        googleMap.current.setOptions({ styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
        ]});
      } else {
        googleMap.current.setMapTypeId(w.google.maps.MapTypeId.ROADMAP);
        googleMap.current.setOptions({ styles: [] });
      }
    }
  };

  // Re-add markers after Mapbox style change
  useEffect(() => {
    if (activeMapProvider !== 'mapbox' || !map.current) return;
    const handler = () => {
      setTimeout(() => addMapboxUserMarkers(), 150);
    };
    map.current.on('style.load', handler);
    return () => { map.current?.off('style.load', handler); };
  }, [business, activeMapProvider, allMapUsers, addMapboxUserMarkers]);

  // Update markers when users/filter change
  useEffect(() => {
    if (!business || isMapLoading || !activeMapProvider) return;

    if (activeMapProvider === 'mapbox' && map.current) {
      addMapboxUserMarkers();
      return;
    }

    if (activeMapProvider === 'google' && googleMap.current) {
      clearGoogleMarkers();
      const w = window as any;

      const bizMarker = new w.google.maps.Marker({
        position: { lat: business.latitude, lng: business.longitude },
        map: googleMap.current,
        title: business.name,
        icon: {
          path: w.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#2D5A27',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        },
      });
      googleMarkers.current.push(bizMarker);

      allMapUsers.forEach(u => {
        const color = ACTION_COLORS[u.actions[0]?.type || 'view'] || '#6b7280';
        const markerDiv = document.createElement('div');
        markerDiv.innerHTML = buildAvatarMarkerHTML(u, color, 0);
        markerDiv.style.cursor = 'pointer';
        markerDiv.onmouseenter = () => { markerDiv.style.transform = 'scale(1.2)'; markerDiv.style.zIndex = '100'; };
        markerDiv.onmouseleave = () => { markerDiv.style.transform = 'scale(1)'; markerDiv.style.zIndex = ''; };

        const overlay = new w.google.maps.OverlayView();
        overlay.onAdd = function() {
          const panes = this.getPanes();
          panes.overlayMouseTarget.appendChild(markerDiv);
        };
        overlay.draw = function() {
          const projection = this.getProjection();
          const pos = projection.fromLatLngToDivPixel(new w.google.maps.LatLng(u.latitude!, u.longitude!));
          if (pos) {
            markerDiv.style.position = 'absolute';
            markerDiv.style.left = `${pos.x - 20}px`;
            markerDiv.style.top = `${pos.y - 20}px`;
          }
        };
        overlay.onRemove = function() {
          markerDiv.parentNode?.removeChild(markerDiv);
        };
        overlay.setMap(googleMap.current);
        markerDiv.addEventListener('click', () => {
          setDetailUser(u);
          if (u.latitude && u.longitude) {
            focusRadarLocation(u.latitude, u.longitude, 15, 500);
          }
        });
        googleMarkers.current.push({ setMap: (m: any) => overlay.setMap(m) });
      });
      return;
    }
  }, [allMapUsers, business, isMapLoading, activeMapProvider, addMapboxUserMarkers, focusRadarLocation]);

  // Map control handlers
  const handleZoomIn = () => {
    if (activeMapProvider === 'mapbox' && map.current) map.current.zoomIn();
    else if (activeMapProvider === 'google' && googleMap.current) googleMap.current.setZoom(googleMap.current.getZoom() + 1);
  };
  const handleZoomOut = () => {
    if (activeMapProvider === 'mapbox' && map.current) map.current.zoomOut();
    else if (activeMapProvider === 'google' && googleMap.current) googleMap.current.setZoom(googleMap.current.getZoom() - 1);
  };
  const handleCenter = () => {
    if (!business) return;
    if (activeMapProvider === 'mapbox' && map.current) {
      map.current.flyTo({ center: [business.longitude, business.latitude], zoom: 13, duration: 1000 });
    } else if (activeMapProvider === 'google' && googleMap.current) {
      googleMap.current.panTo({ lat: business.latitude, lng: business.longitude });
      googleMap.current.setZoom(13);
    }
  };

  // Send message handler - uses business chat pattern (user_id = consumer, business_id = business, target_user_id = null)
  const handleSendMessage = async () => {
    if (!detailUser || !messageText.trim() || !business || !user) return;
    setSendingMessage(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find existing business-consumer chat (consumer is user_id, business is business_id)
      const { data: existingChats } = await supabase
        .from('chats')
        .select('id')
        .eq('business_id', business.id)
        .eq('user_id', detailUser.userId)
        .is('target_user_id', null);

      const chatIds = existingChats?.map(c => c.id) || [];

      if (chatIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', user.id)
          .eq('sender_type', 'business')
          .in('chat_id', chatIds)
          .gte('created_at', today.toISOString());

        if ((count || 0) >= 3) {
          toast({ title: 'Limite atingido', description: 'Máximo de 3 mensagens por usuário/dia.', variant: 'destructive' });
          setSendingMessage(false);
          return;
        }
      }

      const { count: dailyTotal } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .eq('sender_type', 'business')
        .gte('created_at', today.toISOString());

      if ((dailyTotal || 0) >= 20) {
        toast({ title: 'Limite diário atingido', description: 'Máximo de 20 mensagens/dia.', variant: 'destructive' });
        setSendingMessage(false);
        return;
      }

      let chatId: string;
      
      if (chatIds.length > 0) {
        chatId = chatIds[0];
      } else {
        // Create chat where consumer is user_id and business_id is set (no target_user_id)
        // This matches the RLS: (auth.uid() = user_id) won't work here since we're the business owner
        // So we use an RPC or create via the consumer pattern
        // Actually, the business owner can view chats via "Business owners can view their chats" SELECT policy
        // But INSERT requires auth.uid() = user_id. We need to create the chat as a user-to-user chat instead.
        
        // Use user-to-user chat pattern: business owner sends as themselves to the consumer
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            user_id: user.id,
            business_id: null,
            target_user_id: detailUser.userId,
            offer_id: null,
          })
          .select('id')
          .single();
        
        if (chatError) throw chatError;
        chatId = newChat.id;
      }

      // Build message with embedded link if selected
      let finalMessage = messageText.trim();
      if (selectedLink) {
        const linkMarker = `[[${selectedLink.type}:${selectedLink.id}:${selectedLink.title}]]`;
        finalMessage = finalMessage ? `${finalMessage}\n\n${linkMarker}` : linkMarker;
      }

      const { error: msgError } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        sender_type: 'business',
        message: finalMessage,
      });

      if (msgError) throw msgError;

      // Create notification for the consumer
      await supabase.from('notifications').insert({
        user_id: detailUser.userId,
        type: 'new_message',
        title: '🎣 Nova mensagem!',
        message: `${business.name} enviou uma mensagem para você`,
        metadata: { chat_id: chatId },
        related_id: chatId,
      });

      toast({ title: '🎣 Cliente fisgado!', description: `Mensagem enviada para ${detailUser.fullName}` });
      setMessageDialogOpen(false);
      setMessageText('');
      setSelectedLink(null);
    } catch (err) {
      console.error('Error sending message:', err);
      toast({ title: 'Erro', description: 'Não foi possível enviar a mensagem.', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const filterOptions = [
    { type: null, label: 'Todos', icon: Users },
    { type: 'follow', label: 'Seguidores', icon: UserCheck },
    { type: 'favorite', label: 'Favoritos', icon: Star },
    { type: 'checkin', label: 'Check-ins', icon: QrCode },
    { type: 'like', label: 'Curtidas', icon: Heart },
    { type: 'raffle', label: 'Sorteios', icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50 px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <BackButton to="/dashboard" label="Dashboard" />
            <div>
              <h1 className="text-sm sm:text-lg font-bold flex items-center gap-1.5">
                <Fish className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="hidden sm:inline">Pesca Digital de Clientes</span>
                <span className="sm:hidden">Pesca Digital</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                🎣 {allMapUsers.length} no radar ({radiusKm}km) · 🟢 {sortedMapUsers.filter(u => onlineUserIds.has(u.userId)).length} online · 🔥 {engagedUsers.filter(u => u.hotLevel === 'fire' || u.hotLevel === 'hot').length} quentes · {engagedUsers.length} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] sm:text-xs px-2 gap-1"
              onClick={async () => {
                await queryClient.removeQueries({ queryKey: ['nearby-engaged-users', business?.id] });
                await engagedQuery.refetch();
                toast({ title: 'Radar atualizado', description: 'Buscando clientes novamente...' });
              }}
              disabled={engagedQuery.isFetching}
              title="Forçar atualização do radar"
            >
              <Radar className={`w-3 h-3 ${engagedQuery.isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              variant={liveMode ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[10px] sm:text-xs px-2 gap-1"
              onClick={() => setLiveMode(!liveMode)}
            >
              <Radar className={`w-3 h-3 ${liveMode ? 'animate-spin' : ''}`} style={liveMode ? { animationDuration: '3s' } : {}} />
              <span className="hidden sm:inline">{liveMode ? 'Ao Vivo' : 'Pausado'}</span>
            </Button>
            <Badge variant="outline" className="animate-pulse border-green-500 text-green-600 text-[10px] sm:text-xs hidden sm:flex">
              🔴 Tempo real
            </Badge>
          </div>
        </div>
      </div>

      {/* Friendly error banner: RPC missing or unexpected failure */}
      {(rpcMissing || (engagedError && !loadingUsers)) && (
        <div className="border-b bg-amber-500/10 border-amber-500/30 px-3 sm:px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-start gap-2 text-[11px] sm:text-xs">
            <span className="text-amber-500 text-base leading-none">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {rpcMissing
                  ? 'Localização precisa dos clientes indisponível'
                  : 'Não foi possível carregar os clientes do radar'}
              </p>
              <p className="text-amber-700/80 dark:text-amber-300/80">
                {rpcMissing
                  ? 'A função de banco `get_engaged_users_addresses` não está aplicada. Sem ela, os endereços cadastrados dos clientes não podem ser exibidos com privacidade. Peça ao administrador para aplicar a migração pendente no Supabase.'
                  : (engagedError?.message?.replace(/^RADAR_RPC_MISSING:\s*/, '') ||
                     'Ocorreu um erro inesperado ao buscar clientes engajados. Tente novamente em instantes.')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 mt-1.5"
                onClick={async () => {
                  await queryClient.removeQueries({ queryKey: ['nearby-engaged-users', business?.id] });
                  await engagedQuery.refetch();
                  toast({ title: 'Radar atualizado', description: 'Buscando clientes novamente...' });
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b px-3 sm:px-4 py-1.5 sm:py-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2 max-w-7xl mx-auto">
          {filterOptions.map(f => {
            const Icon = f.icon;
            const isActive = filterType === f.type;
            return (
              <Button
                key={f.type || 'all'}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="whitespace-nowrap text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                onClick={() => setFilterType(f.type)}
              >
                <Icon className="w-3 h-3 mr-0.5 sm:mr-1" />
                {f.label}
              </Button>
            );
          })}
          
          {/* Radius filter */}
          <div className="flex items-center gap-1 ml-auto border-l pl-2 border-border">
            <Target className="w-3 h-3 text-muted-foreground" />
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="h-7 sm:h-8 text-[10px] sm:text-xs bg-background border rounded-md px-1.5 sm:px-2 focus:ring-1 focus:ring-primary"
            >
              <option value={1}>1 km</option>
              <option value={3}>3 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-2 sm:px-4 py-2 sm:py-4 max-w-7xl mx-auto w-full">
        {/* Map Section */}
        <div className="mb-3 sm:mb-4">
          <div className={`relative w-full transition-all duration-300 rounded-lg overflow-hidden shadow-lg ${isMapExpanded ? 'h-[75vh] sm:h-[80vh]' : 'h-[40vh] sm:h-[50vh]'}`}>
            {isMapLoading && (
              <div className="absolute inset-0 bg-card flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Preparando o radar...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 bg-card flex items-center justify-center z-10">
                <div className="text-center p-6">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{mapError}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            <div ref={mapContainer} className="w-full h-full" />

            {/* Style selector - bottom left */}
            <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-lg p-1 sm:p-1.5 shadow-lg z-10">
              <div className="flex items-center gap-0.5">
                <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground mr-0.5" />
                {MAP_STYLES.map(s => {
                  const Icon = s.icon;
                  return (
                    <Button
                      key={s.id}
                      variant={currentMapStyle === s.id ? "default" : "ghost"}
                      size="sm"
                      className={`h-6 sm:h-7 w-6 sm:w-auto sm:px-2 p-0 gap-1 text-xs ${currentMapStyle === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      onClick={() => handleStyleChange(s.id)}
                      title={s.label}
                    >
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline text-[10px]">{s.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Right controls: Zoom + Center + Expand + Legend */}
            <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
              {/* Zoom & Center controls */}
              <div className="flex flex-col bg-background/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-b border-border/30" onClick={handleZoomIn} title="Aumentar zoom">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-b border-border/30" onClick={handleZoomOut} title="Diminuir zoom">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={handleCenter} title="Centralizar no negócio">
                  <Crosshair className="w-4 h-4" />
                </Button>
              </div>

              {/* Expand/Collapse */}
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg bg-background/90 backdrop-blur-sm shadow-lg h-8 w-8"
                onClick={() => {
                  setIsMapExpanded(!isMapExpanded);
                  setTimeout(() => {
                    if (map.current) map.current.resize();
                    if (googleMap.current) {
                      const w = window as any;
                      w.google?.maps?.event?.trigger(googleMap.current, 'resize');
                    }
                  }, 350);
                }}
              >
                {isMapExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>

            {/* Legend - bottom right */}
            <div className="absolute bottom-3 right-3 z-10">
              <div className="bg-background/90 backdrop-blur-sm rounded-lg shadow-lg">
                <button
                  className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] sm:text-xs font-medium w-full"
                  onClick={() => setShowLegend(!showLegend)}
                >
                  <span>Legenda</span>
                  {showLegend ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
                {showLegend && (
                  <div className="px-2 pb-2 space-y-1">
                    {Object.entries(ACTION_COLORS).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2 text-[10px] sm:text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span>{ACTION_LABELS[type]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Provider badge */}
            {activeMapProvider && (
              <div className="absolute top-3 left-3 z-10">
                <Badge variant="outline" className="bg-background/90 backdrop-blur-sm text-[9px] sm:text-[10px]">
                  {activeMapProvider === 'mapbox' ? 'Mapbox GL' : 'Google Maps'}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Fishing tips banner */}
        {!isMapExpanded && filteredUsers.length > 0 && (
          <div className="mb-3 sm:mb-4 bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-2xl sm:text-3xl">🎣</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm">Dica de Pesca Digital</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {allMapUsers.length} clientes localizados num raio de {radiusKm}km. Clique em um consumidor no mapa para enviar uma oferta personalizada e fisgar uma venda!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User list below map */}
        {!isMapExpanded && (
          <Card className="border-2">
            <div className="p-2.5 sm:p-3 border-b">
              <h2 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                <Anchor className="w-4 h-4 text-primary" />
                Clientes no Radar ({allMapUsers.length}{usersWithoutLocation.length > 0 ? ` + ${usersWithoutLocation.length} sem localização` : ''})
              </h2>
            </div>

            {allMapUsers.length === 0 && usersWithoutLocation.length === 0 && !loadingUsers && (
              <div className="p-6 sm:p-8 text-center text-muted-foreground">
                <Fish className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">Nenhum cliente engajado ainda</p>
                <p className="text-[10px] sm:text-xs mt-1">Clientes aparecerão quando interagirem com suas ofertas</p>
              </div>
            )}

            {allMapUsers.length === 0 && usersWithoutLocation.length > 0 && !loadingUsers && (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-xs sm:text-sm">Nenhum cliente no raio de {radiusKm}km</p>
                <p className="text-[10px] sm:text-xs mt-1">{usersWithoutLocation.length} clientes engajados sem localização definida. Tente aumentar o raio.</p>
              </div>
            )}

            <div className="divide-y max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
              {sortedMapUsers.map(eu => {
                const dist = business ? calcDistance(business.latitude, business.longitude, eu.latitude!, eu.longitude!) : 0;
                const hotConfig = HOT_LEVEL_CONFIG[eu.hotLevel || 'cold'];
                const isOnline = onlineUserIds.has(eu.userId);

                return (
                  <div
                    key={eu.userId}
                    className={`p-2.5 sm:p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      detailUser?.userId === eu.userId ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => {
                      setDetailUser(eu);
                      const lat = eu.latitude || business?.latitude;
                      const lng = eu.longitude || business?.longitude;
                      if (lat && lng) {
                        focusRadarLocation(lat, lng, 15, 700);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="relative">
                        <Avatar className="w-9 h-9 sm:w-10 sm:h-10 ring-2" style={{ ['--tw-ring-color' as any]: hotConfig.color }}>
                          <AvatarImage src={eu.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px] sm:text-xs" style={{ background: hotConfig.color, color: 'white' }}>
                            {eu.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline ? (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-green-500 ring-2 ring-green-500/40 animate-pulse" title="Online agora" />
                        ) : (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background" style={{ background: hotConfig.color }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-xs sm:text-sm truncate flex items-center gap-1.5">
                            {eu.fullName || 'Usuário'}
                            {isOnline && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Online
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <Badge className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4 border-0 ${hotConfig.bg}`}>
                              {hotConfig.emoji} {eu.hotScore}
                            </Badge>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap">📍 {dist.toFixed(1)}km</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                          {[...new Set(eu.actions.map(a => a.type))].map(type => (
                            <Badge key={type} variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4">
                              {ACTION_ICONS[type]}
                              <span className="ml-0.5">{ACTION_LABELS[type]}</span>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${eu.hotScore}%`, background: hotConfig.color }} />
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap">
                            {eu.totalInteractions} inter. · {eu.actions[0] ? format(new Date(eu.actions[0].date), "dd/MM", { locale: ptBR }) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* User detail dialog */}
      <Dialog open={!!detailUser && !messageDialogOpen} onOpenChange={(open) => { if (!open) setDetailUser(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-3" style={{ ['--tw-ring-color' as any]: HOT_LEVEL_CONFIG[detailUser?.hotLevel || 'cold'].color }}>
                  <AvatarImage src={detailUser?.avatarUrl || undefined} />
                  <AvatarFallback className="text-sm" style={{ background: HOT_LEVEL_CONFIG[detailUser?.hotLevel || 'cold'].color, color: 'white' }}>
                    {detailUser?.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background" style={{ background: HOT_LEVEL_CONFIG[detailUser?.hotLevel || 'cold'].color }} />
              </div>
              <div>
                <p className="text-base sm:text-lg">{detailUser?.fullName}</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal">
                  {detailUser?.totalInteractions} interações · {HOT_LEVEL_CONFIG[detailUser?.hotLevel || 'cold'].emoji} {HOT_LEVEL_CONFIG[detailUser?.hotLevel || 'cold'].label}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Detalhes do cliente engajado</DialogDescription>
          </DialogHeader>

          {detailUser && (
            <div className="space-y-3 sm:space-y-4">
              {/* Hot Score Bar */}
              <div className="p-3 rounded-lg border" style={{ borderColor: `${HOT_LEVEL_CONFIG[detailUser.hotLevel].color}40`, background: `${HOT_LEVEL_CONFIG[detailUser.hotLevel].color}08` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    {HOT_LEVEL_CONFIG[detailUser.hotLevel].emoji} Probabilidade de Compra
                  </span>
                  <span className="text-sm font-bold" style={{ color: HOT_LEVEL_CONFIG[detailUser.hotLevel].color }}>
                    {detailUser.hotScore}/100
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${detailUser.hotScore}%`, background: `linear-gradient(90deg, ${HOT_LEVEL_CONFIG[detailUser.hotLevel].color}88, ${HOT_LEVEL_CONFIG[detailUser.hotLevel].color})` }}
                  />
                </div>
              </div>

              {business && detailUser.latitude && detailUser.longitude && (
                <div className="flex items-center gap-2 text-xs sm:text-sm bg-muted/50 p-2 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>
                    ~{calcDistance(
                      business.latitude, business.longitude,
                      detailUser.latitude,
                      detailUser.longitude
                    ).toFixed(1)} km de distância
                    {detailUser.locationSource === 'checkin' && ' (GPS check-in)'}
                    {detailUser.locationSource === 'address' && ' (endereço cadastrado)'}
                  </span>
                </div>
              )}
              {business && !detailUser.latitude && (
                <div className="flex items-center gap-2 text-xs sm:text-sm bg-muted/50 p-2 rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Localização não disponível</span>
                </div>
              )}

              <div>
                <p className="text-xs sm:text-sm font-medium mb-1.5">Tipo de interação</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(detailUser.actions.map(a => a.type))].map(type => (
                    <Badge key={type} className="text-[10px] sm:text-xs" style={{ background: ACTION_COLORS[type], color: 'white' }}>
                      {ACTION_LABELS[type]}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs sm:text-sm font-medium mb-1.5">Histórico</p>
                <div className="space-y-1.5 max-h-40 sm:max-h-48 overflow-y-auto">
                  {detailUser.actions.slice(0, 10).map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] sm:text-xs p-1.5 sm:p-2 bg-muted/50 rounded-md">
                      {ACTION_ICONS[action.type]}
                      <span className="flex-1">
                        {action.label}
                        {action.offerTitle && (
                          <span className="text-muted-foreground"> — {action.offerTitle}</span>
                        )}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(action.date), 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Link to={`/usuario/${detailUser.userId}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-[10px] sm:text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Ver Perfil
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="flex-1 text-[10px] sm:text-xs"
                  data-send-msg
                  onClick={() => {
                    setMessageDialogOpen(true);
                    const action = detailUser.actions[0];
                    if (action) {
                      const ctx: Record<string, string> = {
                        follow: `Olá ${detailUser.fullName}! Obrigado por seguir nosso negócio. Preparamos ofertas especiais para você! 🎁`,
                        favorite: `Olá ${detailUser.fullName}! Vimos que você favoritou uma oferta nossa. Temos novidades! ⭐`,
                        checkin: `Olá ${detailUser.fullName}! Adoramos sua visita! Temos uma proposta especial. 🤝`,
                        like: `Olá ${detailUser.fullName}! Que bom que curtiu nossas ofertas! ❤️`,
                        raffle: `Olá ${detailUser.fullName}! Participou do nosso sorteio? Temos mais surpresas! 🎰`,
                      };
                      setMessageText(ctx[action.type] || `Olá ${detailUser.fullName}! 🎣`);
                    }
                  }}
                >
                  <Fish className="w-3 h-3 mr-1" />
                  Pescar Cliente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message dialog with link selector */}
      <Dialog open={messageDialogOpen} onOpenChange={(open) => { if (!open) { setMessageDialogOpen(false); setSelectedLink(null); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Fish className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Pescar {detailUser?.fullName}
            </DialogTitle>
            <DialogDescription className="text-[10px] sm:text-xs">
              🎣 Envie uma mensagem personalizada com oferta ou sorteio anexado!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Escreva sua isca perfeita..."
              className="min-h-[80px] sm:min-h-[100px] text-sm"
              maxLength={500}
            />
            
            {/* Link preview */}
            {selectedLink && (
              <MessageLinkPreview link={selectedLink} onRemove={() => setSelectedLink(null)} />
            )}
            
            {/* Link selector */}
            {business && !selectedLink && (
              <div className="flex items-center gap-2 p-2 border border-dashed rounded-lg bg-muted/30">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground flex-1">Anexar conteúdo:</span>
                <MessageLinkSelector
                  businessId={business.id}
                  onSelectLink={setSelectedLink}
                  trigger={
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Link2 className="w-3 h-3" />
                      Inserir Link
                    </Button>
                  }
                />
              </div>
            )}
            
            <p className="text-[10px] text-muted-foreground text-right">{messageText.length}/500 · Limite: 3/usuário/dia</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => { setMessageDialogOpen(false); setSelectedLink(null); }}>
              Cancelar
            </Button>
            <Button 
              size="sm"
              onClick={handleSendMessage} 
              disabled={(!messageText.trim() && !selectedLink) || sendingMessage}
              className="gap-1"
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Fisgar!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes radar-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(45, 90, 39, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(45, 90, 39, 0); }
        }
        @keyframes ofertivo-ping {
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        .radar-user-marker { transition: transform 0.2s ease; }
        .mapboxgl-popup-content { padding: 0 !important; border-radius: 12px !important; overflow: hidden; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default NearbyCustomersMap;
