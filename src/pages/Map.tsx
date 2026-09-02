import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { API_CONFIG } from '@/lib/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Store, Star, Navigation as NavigationIcon, Filter, Target, Zap, Award, ChevronLeft, ChevronRight, Lightbulb, Layers, Sun, Moon, Mountain, Map as MapIcon, Maximize2, Minimize2, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getMapboxToken, getGoogleMapsApiKey } from '@/lib/mapTokenCache';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { OFFER_TYPES, normalizeOfferType } from '@/lib/offerTypes';
import { CATEGORIES, getCategoryStyle } from '@/lib/categories';
import { calculateDistance } from '@/lib/geo';
import { useDailyMissions } from '@/hooks/useDailyMissions';

const Map = () => {
  const { completeMission } = useDailyMissions();
  
  // Auto-complete visit_map mission
  useEffect(() => {
    completeMission('visit_map');
  }, []);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const googleMap = useRef<any | null>(null);
  const googleMarkers = useRef<any[]>([]);
  const googleInfoWindow = useRef<any | null>(null);
  const googleMapsLoaderPromise = useRef<Promise<void> | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [activeMapProvider, setActiveMapProvider] = useState<'mapbox' | 'google' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOfferType, setSelectedOfferType] = useState<string>('all');
  const [radiusFilter, setRadiusFilter] = useState<number>(5); // km
  const offersScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [mapStyle, setMapStyle] = useState<string>('streets');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  // Map style options
  const mapStyles = [
    { id: 'streets', label: 'Ruas', icon: MapIcon, style: 'mapbox://styles/mapbox/streets-v12' },
    { id: 'satellite', label: 'Satélite', icon: Mountain, style: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'light', label: 'Claro', icon: Sun, style: 'mapbox://styles/mapbox/light-v11' },
    { id: 'dark', label: 'Escuro', icon: Moon, style: 'mapbox://styles/mapbox/dark-v11' },
  ];

  // Tipos de ofertas - usando os 4 tipos padronizados do sistema
  const offerTypesMap = {
    'flash': { label: 'Oferta Relâmpago', icon: Zap, emoji: '⚡', color: 'from-orange-500 to-red-600' },
    'first-use': { label: 'Primeira Compra', icon: Award, emoji: '🎁', color: 'from-blue-500 to-cyan-600' },
    'checkin': { label: 'Check-in Premiado', icon: Target, emoji: '🎯', color: 'from-purple-500 to-indigo-600' },
    'combo': { label: 'Combo Econômico', icon: Store, emoji: '📦', color: 'from-emerald-500 to-teal-600' }
  };

  // Function to get color based on distance
  const getMarkerColor = (distance: number) => {
    if (distance < 1) return { color: 'bg-green-500', label: 'Muito perto' };
    if (distance < 3) return { color: 'bg-yellow-500', label: 'Próximo' };
    return { color: 'bg-red-500', label: 'Distante' };
  };

  // Fetch real offers from Supabase with realtime sync
  const { data: allOffers = [], isLoading: isOffersLoading, refetch } = useQuery({
    queryKey: ['map-offers'],
    queryFn: async () => {
      const { data: offersData, error } = await supabase
        .from('offers')
        .select(`
          *,
          businesses (
            id,
            name,
            address,
            logo_url
          )
        `)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate distances and add to offers with normalized offer_type
      return offersData?.map(offer => ({
        ...offer,
        business: offer.businesses?.name || 'Negócio',
        business_logo: offer.businesses?.logo_url || null,
        business_address: offer.businesses?.address || '',
        offer_type: normalizeOfferType(offer.offer_type),
        distance: userLocation ? 
          calculateDistance(
            userLocation[1], 
            userLocation[0], 
            Number(offer.latitude), 
            Number(offer.longitude)
          ) : 0
      })) || [];
    },
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds to get new offers
  });

  // Setup realtime subscription for offers
  useEffect(() => {
    const refreshMapOffers = () => {
      refetch();
    };

    const channel = supabase
      .channel('map-offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers'
        },
        refreshMapOffers
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses'
        },
        refreshMapOffers
      )
      .subscribe();

    window.addEventListener('business-profile-updated', refreshMapOffers);

    return () => {
      window.removeEventListener('business-profile-updated', refreshMapOffers);
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Filter offers based on category, offer type and radius
  const offers = useMemo(() => {
    return allOffers.filter(offer => {
      const categoryMatch = selectedCategory === 'all' || offer.category === selectedCategory;
      const offerTypeMatch = selectedOfferType === 'all' || offer.offer_type === selectedOfferType;
      const distanceMatch = offer.distance <= radiusFilter;
      return categoryMatch && offerTypeMatch && distanceMatch;
    });
  }, [allOffers, selectedCategory, selectedOfferType, radiusFilter]);

  const loadGoogleMapsScript = async (): Promise<boolean> => {
    const windowWithGoogle = window as any;

    if (windowWithGoogle.google?.maps) {
      return true;
    }

    try {
      if (!googleMapsLoaderPromise.current) {
        googleMapsLoaderPromise.current = (async () => {
          const apiKey = await getGoogleMapsApiKey();

          if (!apiKey) {
            throw new Error('Google Maps API key não configurada');
          }

          await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById('google-maps-sdk') as HTMLScriptElement | null;
            if (existingScript) {
              if (windowWithGoogle.google?.maps) {
                resolve();
                return;
              }
              existingScript.addEventListener('load', () => resolve(), { once: true });
              existingScript.addEventListener('error', () => reject(new Error('Falha ao carregar Google Maps')), { once: true });
              return;
            }

            const script = document.createElement('script');
            script.id = 'google-maps-sdk';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Falha ao carregar Google Maps'));
            document.head.appendChild(script);
          });
        })();
      }

      await googleMapsLoaderPromise.current;
      return Boolean(windowWithGoogle.google?.maps);
    } catch (error) {
      console.error('Erro ao carregar Google Maps interativo:', error);
      return false;
    }
  };

  const clearGoogleMarkers = () => {
    googleMarkers.current.forEach((marker) => marker.setMap(null));
    googleMarkers.current = [];
  };

  const initializeGoogleFallback = async () => {
    if (!mapContainer.current) return false;

    const isGoogleLoaded = await loadGoogleMapsScript();
    if (!isGoogleLoaded) return false;

    const windowWithGoogle = window as any;
    const [defaultLng, defaultLat] = API_CONFIG.MAPBOX.DEFAULT_CENTER as [number, number];
    const [centerLng, centerLat] = userLocation ?? [defaultLng, defaultLat];

    googleMap.current = new windowWithGoogle.google.maps.Map(mapContainer.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: API_CONFIG.MAPBOX.DEFAULT_ZOOM,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    googleInfoWindow.current = new windowWithGoogle.google.maps.InfoWindow();
    setActiveMapProvider('google');
    setMapError(null);
    setIsMapLoading(false);
    return true;
  };

  // All available categories in the platform
  const allCategories = [
    { value: 'all', label: 'Todas as categorias' },
    ...CATEGORIES.map(c => ({ value: c.value, label: c.label }))
  ];

  // Calculate statistics by offer type
  const offerTypeStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    offers.forEach(offer => {
      const type = normalizeOfferType(offer.offer_type);
      stats[type] = (stats[type] || 0) + 1;
    });
    return stats;
  }, [offers]);

  // Calculate radar statistics
  const radarStats = useMemo(() => {
    const ranges = [
      { max: 0.5, count: 0, label: 'Muito perto' },
      { max: 1, count: 0, label: '< 1km' },
      { max: 3, count: 0, label: '1-3km' },
      { max: 5, count: 0, label: '3-5km' },
      { max: Infinity, count: 0, label: '> 5km' }
    ];

    allOffers.forEach(offer => {
      for (const range of ranges) {
        if (offer.distance <= range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges.filter(r => r.count > 0);
  }, [allOffers]);

  // Retry counter ref
  const retryCount = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    let cancelled = false;
    let loadTimeout: NodeJS.Timeout;

    const initializeMap = async () => {
      try {
        if (!mapContainer.current) {
          console.warn('Map container not available yet');
          return;
        }

        // If map already exists and is loaded, skip
        if (map.current) {
          try {
            map.current.getCenter();
            return;
          } catch {
            console.warn('Existing map instance is broken, reinitializing...');
            try { map.current.remove(); } catch {}
            map.current = null;
          }
        }

        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          const googleInitialized = await initializeGoogleFallback();
          if (!googleInitialized) {
            setMapError('Não foi possível carregar o mapa interativo no desktop.');
            setIsMapLoading(false);
          }
          return;
        }

        const loseContext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
        if (loseContext) loseContext.loseContext();

        // Get user location (non-blocking)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            if (!cancelled) {
              setUserLocation([position.coords.longitude, position.coords.latitude]);
            }
          }, (error) => {
            console.warn('Geolocation error:', error);
          }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        }

        // Get Mapbox token from Supabase edge function
        console.log('Fetching Mapbox token...');
        const token = await getMapboxToken();

        if (cancelled) return;

        if (!token) {
          console.error('No Mapbox token available');
          const googleInitialized = await initializeGoogleFallback();
          if (!googleInitialized) {
            setMapError('Não foi possível carregar o mapa interativo.');
            setIsMapLoading(false);
          }
          return;
        }

        console.log('Mapbox token obtained');

        mapboxgl.accessToken = token;

        const rect = mapContainer.current.getBoundingClientRect();
        console.log('Map container dimensions:', rect.width, 'x', rect.height);

        if (rect.width === 0 || rect.height === 0) {
          console.warn('Map container has zero dimensions, waiting...');
          await new Promise(resolve => setTimeout(resolve, 500));
          if (cancelled) return;
          const retryRect = mapContainer.current?.getBoundingClientRect();
          if (!retryRect || retryRect.width === 0 || retryRect.height === 0) {
            if (retryCount.current < maxRetries) {
              retryCount.current++;
              setTimeout(() => { if (!cancelled) initializeMap(); }, 1000);
              return;
            }
            const googleInitialized = await initializeGoogleFallback();
            if (!googleInitialized) {
              setMapError('Não foi possível carregar o mapa interativo no desktop.');
              setIsMapLoading(false);
            }
            return;
          }
        }

        console.log('Creating Mapbox instance...');
        const newMap = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: API_CONFIG.MAPBOX.DEFAULT_CENTER as [number, number],
          zoom: API_CONFIG.MAPBOX.DEFAULT_ZOOM,
          preserveDrawingBuffer: true,
          failIfMajorPerformanceCaveat: false,
          antialias: false,
          trackResize: true,
        });

        map.current = newMap;
        setActiveMapProvider('mapbox');

        loadTimeout = setTimeout(() => {
          if (cancelled) return;
          console.warn('Map load timeout - switching to Google Maps interactive fallback');
          try { newMap.remove(); } catch {}
          map.current = null;
          void initializeGoogleFallback().then((ok) => {
            if (!ok) {
              setMapError('Não foi possível carregar o mapa interativo no desktop.');
              setIsMapLoading(false);
            }
          });
        }, 8000);

        newMap.on('load', () => {
          if (cancelled) return;
          clearTimeout(loadTimeout);
          setIsMapLoading(false);
          setMapError(null);
          setActiveMapProvider('mapbox');
          setTimeout(() => {
            try { newMap.resize(); } catch {}
          }, 100);
        });

        newMap.on('error', (e) => {
          console.error('Mapbox error event:', e);
          if (e.error && (e.error as any)?.status === 401) {
            clearTimeout(loadTimeout);
            void initializeGoogleFallback().then((ok) => {
              if (!ok) {
                setMapError('Não foi possível carregar o mapa interativo no desktop.');
                setIsMapLoading(false);
              }
            });
          }
        });

        newMap.once('idle', () => {
          if (cancelled) return;
          try { newMap.resize(); } catch {}
        });

        newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
        newMap.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
          }),
          'top-right'
        );
      } catch (error) {
        if (cancelled) return;
        console.error('Error initializing map:', error);

        if (retryCount.current < maxRetries) {
          retryCount.current++;
          if (map.current) {
            try { map.current.remove(); } catch {}
            map.current = null;
          }
          setTimeout(() => { if (!cancelled) initializeMap(); }, 2000);
          return;
        }

        const googleInitialized = await initializeGoogleFallback();
        if (!googleInitialized) {
          setMapError('Não foi possível carregar o mapa interativo no desktop.');
          setIsMapLoading(false);
        }
      }
    };

    // Start immediately instead of with a delay
    initializeMap();
    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      if (map.current) {
        try { map.current.remove(); } catch {}
        map.current = null;
      }
      clearGoogleMarkers();
      googleInfoWindow.current = null;
      googleMap.current = null;
    };
  }, []);

  // Function to add markers to map
  const getMarkerHexColor = (distance: number) => {
    if (distance < 1) return '#22c55e'; // green
    if (distance < 3) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const buildLogoMarkerHTML = (offer: any) => {
    const hexColor = getMarkerHexColor(offer.distance);
    const logoImg = offer.business_logo;
    const initial = (offer.business || 'N')[0].toUpperCase();
    const size = 44;
    const innerSize = size - 8;

    if (logoImg) {
      return `
        <div style="position:relative;width:${size}px;height:${size}px;">
          <div style="position:absolute;top:0;left:0;width:${size}px;height:${size}px;border-radius:50%;background:${hexColor};opacity:0.3;animation:ofertivo-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;border:3.5px solid ${hexColor};background:white;box-shadow:0 4px 14px rgba(0,0,0,0.35);overflow:hidden;animation:ofertivo-pulse 2s ease-in-out infinite;">
            <img src="${logoImg}" alt="${offer.business}" style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <div style="display:none;width:${innerSize}px;height:${innerSize}px;border-radius:50%;background:${hexColor};align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;">${initial}</div>
          </div>
        </div>
      `;
    }
    return `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;top:0;left:0;width:${size}px;height:${size}px;border-radius:50%;background:${hexColor};opacity:0.3;animation:ofertivo-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;border:3.5px solid ${hexColor};background:${hexColor};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.35);animation:ofertivo-pulse 2s ease-in-out infinite;">
          <span style="color:white;font-weight:bold;font-size:18px;">${initial}</span>
        </div>
      </div>
    `;
  };

  const addMarkersToMap = () => {
    if (!offers.length || isMapLoading) return;

    if (activeMapProvider === 'google' && googleMap.current) {
      const windowWithGoogle = window as any;
      clearGoogleMarkers();

      offers.forEach((offer) => {
        const markerDiv = document.createElement('div');
        markerDiv.style.position = 'relative';
        markerDiv.style.width = '44px';
        markerDiv.style.height = '44px';
        markerDiv.style.cursor = 'pointer';
        markerDiv.innerHTML = buildLogoMarkerHTML(offer);

        const overlay = new windowWithGoogle.google.maps.OverlayView();
        overlay.onAdd = function() {
          const panes = this.getPanes();
          panes.overlayMouseTarget.appendChild(markerDiv);
          windowWithGoogle.google.maps.event.addDomListener(markerDiv, 'click', () => {
            setSelectedOffer(offer);
            if (googleInfoWindow.current) {
              const pos = new windowWithGoogle.google.maps.LatLng(Number(offer.latitude), Number(offer.longitude));
              const offerImg = offer.image_url || '/placeholder.svg';
              const logoImg = offer.business_logo;
              const normalizedType = normalizeOfferType(offer.offer_type);
              const offerTypeInfo = offerTypesMap[normalizedType as keyof typeof offerTypesMap];
              googleInfoWindow.current.setContent(`
                <div style="min-width:280px;max-width:320px;font-family:system-ui,sans-serif;cursor:pointer;" onclick="window.location.href='/ofertas/${offer.id}'">
                  <img src="${offerImg}" alt="${offer.title}" style="width:100%;height:120px;object-fit:cover;border-radius:8px 8px 0 0;" />
                  <div style="padding:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                      ${logoImg ? `<img src="${logoImg}" alt="${offer.business}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;" />` : `<div style="width:32px;height:32px;border-radius:50%;background:#d1d5db;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:#6b7280;">${(offer.business || 'N')[0]}</div>`}
                      <div>
                        <strong style="display:block;font-size:14px;">${offer.business}</strong>
                        <span style="font-size:11px;color:#6b7280;">${offer.business_address ? offer.business_address.substring(0, 40) : ''}</span>
                      </div>
                    </div>
                    <h3 style="font-weight:700;font-size:14px;margin-bottom:6px;">${offer.title}</h3>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
                      <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#f0fdf4;color:#15803d;font-weight:600;">${offer.distance.toFixed(1)}km</span>
                      <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#374151;">${offer.category}</span>
                      ${offerTypeInfo ? `<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;">${offerTypeInfo.emoji} ${offerTypeInfo.label}</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;color:#15803d;font-weight:700;font-size:13px;">
                      🎯 ${offer.checkin_points} pontos no check-in
                    </div>
                    <div style="display:block;text-align:center;background:#15803d;color:white;padding:8px;border-radius:8px;font-weight:600;font-size:13px;">Ver oferta completa</div>
                  </div>
                </div>
              `);
              googleInfoWindow.current.setPosition(pos);
              googleInfoWindow.current.open(googleMap.current);
            }
          });
        };
        overlay.draw = function() {
          const projection = this.getProjection();
          const pos = projection.fromLatLngToDivPixel(new windowWithGoogle.google.maps.LatLng(Number(offer.latitude), Number(offer.longitude)));
          if (pos) {
            markerDiv.style.left = (pos.x - 22) + 'px';
            markerDiv.style.top = (pos.y - 22) + 'px';
            markerDiv.style.position = 'absolute';
          }
        };
        overlay.onRemove = function() {
          markerDiv.parentNode?.removeChild(markerDiv);
        };
        overlay.setMap(googleMap.current);
        googleMarkers.current.push({ setMap: (m: any) => overlay.setMap(m) });
      });

      return;
    }

    if (activeMapProvider !== 'mapbox' || !map.current) return;

    const existingMarkers = document.querySelectorAll('.custom-marker');
    existingMarkers.forEach(marker => marker.remove());

    offers.forEach((offer) => {
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker';
      markerEl.style.cursor = 'pointer';
      markerEl.innerHTML = buildLogoMarkerHTML(offer);

      const popupContent = document.createElement('div');
      popupContent.className = 'min-w-[280px] max-w-[320px] overflow-hidden rounded-lg';
      const normalizedType = normalizeOfferType(offer.offer_type);
      const offerTypeInfo = offerTypesMap[normalizedType as keyof typeof offerTypesMap];
      const offerImg = offer.image_url || '/placeholder.svg';
      const logoImg = offer.business_logo;
      popupContent.style.cursor = 'pointer';
      popupContent.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `/ofertas/${offer.id}`;
      });
      popupContent.innerHTML = `
        <div>
          <img src="${offerImg}" alt="${offer.title}" class="w-full h-[120px] object-cover" />
          <div class="p-3 space-y-2">
            <div class="flex items-center gap-2">
              ${logoImg ? `<img src="${logoImg}" alt="${offer.business}" class="w-8 h-8 rounded-full object-cover border-2 border-border" />` : `<div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">${(offer.business || 'N')[0]}</div>`}
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm truncate">${offer.business}</div>
                <div class="text-xs text-gray-500 truncate">${offer.business_address ? offer.business_address.substring(0, 40) : ''}</div>
              </div>
            </div>
            <h3 class="font-bold text-sm line-clamp-2">${offer.title}</h3>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryStyle(offer.category)} shadow-sm">${offer.category}</span>
              ${offerTypeInfo ? `<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-gradient-to-r ${offerTypeInfo.color} text-white shadow-sm">${offerTypeInfo.emoji} ${offerTypeInfo.label}</span>` : ''}
            </div>
            <div class="flex items-center gap-2 text-xs">
              <div class="w-2.5 h-2.5 ${getMarkerColor(offer.distance).color} rounded-full animate-pulse"></div>
              <span class="text-gray-600">${offer.distance.toFixed(1)}km • ${getMarkerColor(offer.distance).label}</span>
            </div>
            <div class="flex items-center gap-1 text-green-700 font-bold text-xs">
              🎯 ${offer.checkin_points} pontos no check-in
            </div>
            <div class="w-full bg-green-600 text-white font-medium py-2 px-4 rounded-lg text-sm text-center">
              Ver Oferta Completa
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true,
        maxWidth: '320px',
        className: 'offer-popup',
      }).setDOMContent(popupContent);

      new mapboxgl.Marker({ element: markerEl })
        .setLngLat([Number(offer.longitude), Number(offer.latitude)])
        .setPopup(popup)
        .addTo(map.current!);

      markerEl.addEventListener('click', () => {
        setSelectedOffer(offer);
      });
    });
  };

  const focusOfferOnMap = (offer: any, zoom = 15) => {
    if (activeMapProvider === 'google' && googleMap.current) {
      googleMap.current.panTo({ lat: Number(offer.latitude), lng: Number(offer.longitude) });
      googleMap.current.setZoom(zoom);
      return;
    }

    if (activeMapProvider === 'mapbox' && map.current) {
      map.current.flyTo({
        center: [Number(offer.longitude), Number(offer.latitude)],
        zoom,
        duration: 1000,
      });
    }
  };

  // Effect to add markers when offers are loaded
  useEffect(() => {
    if (!offers.length || isMapLoading || !activeMapProvider) return;
    addMarkersToMap();
  }, [offers, userLocation, isMapLoading, activeMapProvider]);

  // Re-add markers when map style changes
  useEffect(() => {
    if (activeMapProvider !== 'mapbox' || !map.current) return;

    const handleStyleData = () => {
      setTimeout(() => {
        addMarkersToMap();
      }, 100);
    };

    map.current.on('style.load', handleStyleData);

    return () => {
      if (map.current) {
        map.current.off('style.load', handleStyleData);
      }
    };
  }, [offers, mapStyle, activeMapProvider]);

  // Handle scroll navigation
  const scrollOffers = (direction: 'left' | 'right') => {
    if (!offersScrollRef.current) return;
    
    const scrollAmount = 320; // Width of one card + gap
    const newScrollLeft = direction === 'left' 
      ? offersScrollRef.current.scrollLeft - scrollAmount
      : offersScrollRef.current.scrollLeft + scrollAmount;
    
    offersScrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  // Update arrow visibility on scroll
  const handleOffersScroll = () => {
    if (!offersScrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = offersScrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Check arrow visibility when offers change
  useEffect(() => {
    handleOffersScroll();
    
    const scrollContainer = offersScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleOffersScroll);
      // Check on resize
      const resizeObserver = new ResizeObserver(handleOffersScroll);
      resizeObserver.observe(scrollContainer);
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleOffersScroll);
        resizeObserver.disconnect();
      };
    }
  }, [offers]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Navigation className="mb-4 sm:mb-6" />
        
        {/* Filters and Stats */}
        {!isMapExpanded && (
        <Card className="mb-6 border-2">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Radar Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary animate-pulse" />
                  <h3 className="font-semibold text-lg">Radar de Ofertas</h3>
                </div>
                <Badge variant="secondary" className="text-xs sm:text-sm md:text-lg font-bold px-2 sm:px-3 py-1 sm:py-1.5">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">{offers.length} ofertas em até {radiusFilter}km</span>
                  <span className="sm:hidden">{offers.length} em {radiusFilter}km</span>
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {radarStats.map((stat, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{stat.count}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Offer Type Stats */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(offerTypeStats).map(([type, count]) => {
                  const typeInfo = offerTypesMap[type as keyof typeof offerTypesMap];
                  if (!typeInfo) return null;
                  return (
                    <Badge 
                      key={type}
                      variant={selectedOfferType === type ? "default" : "secondary"}
                      className={`cursor-pointer bg-gradient-to-r ${typeInfo.color} text-white`}
                      onClick={() => setSelectedOfferType(selectedOfferType === type ? 'all' : type)}
                    >
                      {typeInfo.emoji} {typeInfo.label} ({count})
                    </Badge>
                  );
                })}
                {selectedOfferType !== 'all' && (
                  <Badge 
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setSelectedOfferType('all')}
                  >
                    Limpar filtro
                  </Badge>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-background border border-border z-[9999] max-h-[300px] overflow-y-auto"
                      position="popper"
                      sideOffset={5}
                    >
                      {allCategories.map((category) => (
                        <SelectItem 
                          key={category.value} 
                          value={category.value}
                          className="hover:bg-accent focus:bg-accent cursor-pointer"
                        >
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Promoção</label>
                  <Select value={selectedOfferType} onValueChange={setSelectedOfferType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-background border border-border z-[9999] max-h-[300px] overflow-y-auto"
                      position="popper"
                      sideOffset={5}
                    >
                      <SelectItem value="all" className="cursor-pointer hover:bg-accent">Todos os tipos</SelectItem>
                      {OFFER_TYPES.map((offerType) => (
                        <SelectItem key={offerType.value} value={offerType.value} className="cursor-pointer hover:bg-accent">
                          <div className="flex items-center gap-2">
                            <offerType.icon className="w-4 h-4" />
                            {offerType.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Radius Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Raio: {radiusFilter}km
                  </label>
                  <Slider
                    value={[radiusFilter]}
                    onValueChange={(v) => setRadiusFilter(v[0])}
                    min={0.5}
                    max={20}
                    step={0.5}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>500m</span>
                    <span>20km</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
        
        {/* Map Section */}
        <div className="mb-6">
          <div className={`relative w-full transition-all duration-300 ${isMapExpanded ? 'h-[92vh]' : 'h-[65vh] sm:h-[75vh] lg:h-[80vh]'}`}>
            {isMapLoading && (
              <div className="absolute inset-0 bg-card rounded-lg shadow-lg flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Carregando mapa...</p>
                </div>
              </div>
            )}
            
            {mapError && (
              <div className="absolute top-4 right-4 z-10 max-w-xs rounded-lg border bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
                <p className="text-xs text-muted-foreground">{mapError}</p>
              </div>
            )}

            
            <div ref={mapContainer} className="w-full h-full rounded-lg shadow-lg" />
            
            {/* Expand/Collapse Button */}
            <Button
              variant="default"
              className={`absolute top-4 right-4 z-20 rounded-xl shadow-xl border-2 border-primary/30 font-semibold gap-2 px-4 py-2 text-sm transition-all duration-200 ${
                isMapExpanded 
                  ? 'bg-destructive hover:bg-destructive/90 text-white' 
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse'
              }`}
              onClick={() => {
                setIsMapExpanded(!isMapExpanded);
                setTimeout(() => {
                  if (map.current) map.current.resize();
                  if (googleMap.current) {
                    const windowWithGoogle = window as any;
                    windowWithGoogle.google?.maps?.event?.trigger(googleMap.current, 'resize');
                  }
                }, 350);
              }}
            >
              {isMapExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isMapExpanded ? 'Reduzir' : 'Tela cheia'}
            </Button>

            {/* Legend - Collapsible */}
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg shadow-lg max-w-[140px] sm:max-w-none z-10">
              <button 
                onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                className="flex items-center justify-between w-full p-2 sm:p-3 gap-2"
              >
                <h3 className="text-xs sm:text-sm font-semibold">Distância</h3>
                {isLegendCollapsed ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronUp className="w-3 h-3 text-muted-foreground" />}
              </button>
              {!isLegendCollapsed && (
                <div className="px-2 sm:px-3 pb-2 sm:pb-3 space-y-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                    <span>Perto (&lt;1km)</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse shrink-0"></div>
                    <span>Próximo (1-3km)</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse shrink-0"></div>
                    <span>Distante (&gt;3km)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Map Style Selector - works for both providers */}
            <div className="absolute bottom-4 left-2 sm:left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 shadow-lg">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground mr-0.5 sm:mr-1 shrink-0" />
                {(activeMapProvider === 'mapbox' ? mapStyles : [
                  { id: 'streets', label: 'Ruas', icon: MapIcon, gmType: 'roadmap' },
                  { id: 'satellite', label: 'Satélite', icon: Mountain, gmType: 'hybrid' },
                  { id: 'light', label: 'Claro', icon: Sun, gmType: 'roadmap' },
                  { id: 'dark', label: 'Escuro', icon: Moon, gmType: 'roadmap' },
                ] as any[]).map((style: any) => {
                  const Icon = style.icon;
                  return (
                    <Button
                      key={style.id}
                      variant={mapStyle === style.id ? "default" : "ghost"}
                      size="sm"
                      className={`h-7 sm:h-8 px-1.5 sm:px-2 gap-0.5 sm:gap-1 text-[10px] sm:text-xs ${mapStyle === style.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      onClick={() => {
                        setMapStyle(style.id);
                        if (activeMapProvider === 'mapbox' && map.current) {
                          map.current.setStyle(style.style);
                        } else if (activeMapProvider === 'google' && googleMap.current) {
                          googleMap.current.setMapTypeId(style.gmType || 'roadmap');
                        }
                      }}
                    >
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">{style.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Offers List */}
        {!isMapExpanded && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Ofertas Próximas
          </h2>
          
          <div className="relative group">
            {/* Left Navigation Arrow */}
            {showLeftArrow && (
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => scrollOffers('left')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            
            {/* Right Navigation Arrow */}
            {showRightArrow && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => scrollOffers('right')}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}
          
          {isOffersLoading ? (
            <div 
              ref={offersScrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
            >
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse min-w-[280px] md:min-w-[320px] snap-start flex-shrink-0">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma oferta próxima</h3>
              <p className="text-muted-foreground">Não há ofertas ativas na sua região no momento.</p>
            </div>
          ) : (
            <div 
              ref={offersScrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing -mx-1 px-1"
            >
              {offers.sort((a, b) => a.distance - b.distance).map((offer) => {
                const markerColor = getMarkerColor(offer.distance);
                return (
                  <Card 
                    key={offer.id} 
                    className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] sm:hover:scale-105 min-w-[240px] sm:min-w-[280px] md:min-w-[320px] snap-start flex-shrink-0 ${
                      selectedOffer?.id === offer.id ? 'ring-2 ring-primary shadow-lg' : ''
                    }`}
                    onClick={() => {
                      setSelectedOffer(offer);
                      focusOfferOnMap(offer, 15);
                    }}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${markerColor.color} rounded-full animate-pulse`}></div>
                          <span className="text-xs text-muted-foreground">
                            {offer.distance.toFixed(1)}km • {markerColor.label}
                          </span>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryStyle(offer.category)} shadow-sm`}>
                          {offer.category}
                        </div>
                      </div>
                      
                      {(() => {
                        const normalizedType = normalizeOfferType(offer.offer_type);
                        const typeInfo = offerTypesMap[normalizedType as keyof typeof offerTypesMap];
                        return typeInfo ? (
                          <Badge className={`mb-2 bg-gradient-to-r ${typeInfo.color} text-white`}>
                            {typeInfo.emoji} {typeInfo.label}
                          </Badge>
                        ) : null;
                      })()}
                      
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2">{offer.title}</h3>
                      
                      <div className="flex items-center gap-1 mb-3">
                        <Store className="w-3 h-3 text-muted-foreground" />
                        <p className="text-muted-foreground text-xs truncate">{offer.business}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          <span className="text-xs line-through text-muted-foreground">
                            R$ {Number(offer.original_price).toFixed(2)}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            R$ {Number(offer.discounted_price).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs">4.8</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link to={`/ofertas/${offer.id}`} className="flex-1">
                          <Button size="sm" className="w-full text-xs">
                            Ver Oferta
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            focusOfferOnMap(offer, 16);
                          }}
                        >
                          <NavigationIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          </div>
          
          {/* Dicas Section */}
          <div className="mt-8 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Dicas Rápidas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                <CardContent className="p-3">
                  <MapPin className="w-4 h-4 text-green-500 mb-1" />
                  <p className="text-xs font-medium">Ative a localização para ofertas próximas</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <CardContent className="p-3">
                  <Star className="w-4 h-4 text-blue-500 mb-1" />
                  <p className="text-xs font-medium">Favorite ofertas para não perder</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <CardContent className="p-3">
                  <Store className="w-4 h-4 text-purple-500 mb-1" />
                  <p className="text-xs font-medium">Clique no pin para ver detalhes</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
                <CardContent className="p-3">
                  <NavigationIcon className="w-4 h-4 text-orange-500 mb-1" />
                  <p className="text-xs font-medium">Use filtros para refinar a busca</p>
                </CardContent>
              </Card>
            </div>
          </div>
          
        </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Map;