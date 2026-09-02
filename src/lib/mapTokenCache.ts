import { supabase } from '@/integrations/supabase/client';

let mapboxTokenCache: string | null = null;
let mapboxTokenPromise: Promise<string | null> | null = null;

let googleApiKeyCache: string | null = null;
let googleApiKeyPromise: Promise<string | null> | null = null;

/**
 * Returns the Mapbox access token, fetching it only once and caching in memory.
 */
export const getMapboxToken = (): Promise<string | null> => {
  if (mapboxTokenCache) return Promise.resolve(mapboxTokenCache);

  if (!mapboxTokenPromise) {
    mapboxTokenPromise = supabase.functions
      .invoke('mapbox-config')
      .then(({ data, error }) => {
        if (error || !data?.token) {
          console.error('Failed to fetch Mapbox token:', error);
          mapboxTokenPromise = null; // allow retry on failure
          return null;
        }
        mapboxTokenCache = data.token.trim();
        return mapboxTokenCache;
      })
      .catch((err) => {
        console.error('Failed to fetch Mapbox token:', err);
        mapboxTokenPromise = null;
        return null;
      });
  }

  return mapboxTokenPromise;
};

/**
 * Returns the Google Maps API key, fetching it only once and caching in memory.
 */
export const getGoogleMapsApiKey = (): Promise<string | null> => {
  if (googleApiKeyCache) return Promise.resolve(googleApiKeyCache);

  if (!googleApiKeyPromise) {
    googleApiKeyPromise = supabase.functions
      .invoke('google-maps-api', { body: { endpoint: 'config' } })
      .then(({ data, error }) => {
        if (error || !data?.apiKey) {
          console.error('Failed to fetch Google Maps API key:', error);
          googleApiKeyPromise = null;
          return null;
        }
        googleApiKeyCache = data.apiKey;
        return googleApiKeyCache;
      })
      .catch((err) => {
        console.error('Failed to fetch Google Maps API key:', err);
        googleApiKeyPromise = null;
        return null;
      });
  }

  return googleApiKeyPromise;
};
