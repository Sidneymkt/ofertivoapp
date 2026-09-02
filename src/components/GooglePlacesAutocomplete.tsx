import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  onInputChange?: (address: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

const createSessionToken = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cryptoAny = globalThis.crypto as any;
    if (cryptoAny?.randomUUID) return cryptoAny.randomUUID() as string;
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeGooglePlacesError = (status?: string, errorMessage?: string) => {
  if (!status) return 'Não foi possível buscar endereços agora.';

  if (status === 'REQUEST_DENIED') {
    const msg = (errorMessage || '').toLowerCase();

    if (msg.includes('places api (new)') || msg.includes('places.googleapis.com') || msg.includes('service_disabled')) {
      return 'Autocomplete indisponível: ative a Places API (New) no Google Cloud (places.googleapis.com) e confira as restrições da chave.';
    }

    if (msg.includes('legacy') || msg.includes('legacyapi')) {
      return 'Autocomplete indisponível: sua chave está chamando uma API legada não habilitada. Ative a Places API (New) no Google Cloud.';
    }

    return 'A API do Google recusou a requisição (REQUEST_DENIED). Verifique a API Key e permissões.';
  }

  if (status === 'OVER_QUERY_LIMIT') return 'Limite de uso da API atingido. Tente novamente mais tarde.';
  if (status === 'INVALID_REQUEST') return 'Requisição inválida para o Google Places. Tente editar o texto.';

  return 'Não foi possível buscar endereços agora.';
};

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  onInputChange,
  disabled = false,
  label = "Endereço",
  placeholder = "Digite o endereço",
  required = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string>(() => createSessionToken());

  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Use edge function for autocomplete with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 8000);
      });

      const fetchPromise = supabase.functions.invoke('google-maps-api', {
        body: {
          endpoint: 'places-autocomplete',
          input,
          sessionToken,
          types: 'address',
          components: 'country:br'
        }
      });

      const { data, error: invokeError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as { data: any; error: any };

      if (invokeError) {
        console.error('[GooglePlacesAutocomplete] API error:', invokeError);
        setError('Erro ao buscar endereços. Você pode digitar e usar manualmente.');
        setSuggestions([]);
        return;
      }

      if (data?.status === 'OK' && data?.predictions) {
        const results = data.predictions
          .map((p: any) => ({
            place_id: p.place_id,
            description: p.description
          }))
          .filter((p: PlaceSuggestion) => p.place_id && p.description);

        setSuggestions(results);
        setError(null);
        return;
      }

      if (data?.status === 'ZERO_RESULTS') {
        setSuggestions([]);
        setError(null);
        return;
      }

      const normalized = normalizeGooglePlacesError(data?.status, data?.error_message);
      console.warn('[GooglePlacesAutocomplete] Non-OK response:', data);
      setSuggestions([]);
      setError(normalized);
    } catch (e: any) {
      if (e.message === 'timeout') {
        console.error('[GooglePlacesAutocomplete] Request timeout');
        setError('Tempo esgotado. Você pode pressionar Enter para usar o endereço manualmente.');
      } else if (e.name !== 'AbortError') {
        console.error('[GooglePlacesAutocomplete] fetchSuggestions error:', e);
        setError('Erro ao buscar endereços. Você pode digitar e usar manualmente.');
      }
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  const handleInputChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setError(null);

    // Notify parent about input change
    if (onInputChange) {
      onInputChange(newValue);
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounced search (300ms for better UX)
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const getPlaceDetails = async (placeId: string): Promise<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  } | null> => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 8000);
      });

      const fetchPromise = supabase.functions.invoke('google-maps-api', {
        body: {
          endpoint: 'place-details',
          place_id: placeId,
          sessionToken
        }
      });

      const { data, error: invokeError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as { data: any; error: any };

      if (invokeError) {
        console.error('[GooglePlacesAutocomplete] Place details error:', invokeError);
        return null;
      }

      if (data?.status === 'OK' && data?.result) {
        return {
          formatted_address: data.result.formatted_address || '',
          geometry: {
            location: {
              lat: data.result.geometry?.location?.lat || 0,
              lng: data.result.geometry?.location?.lng || 0
            }
          }
        };
      }

      console.warn('[GooglePlacesAutocomplete] Place details non-OK:', data);
      return null;
    } catch (e: any) {
      if (e.message === 'timeout') {
        console.error('[GooglePlacesAutocomplete] Place details timeout');
      } else {
        console.error('[GooglePlacesAutocomplete] Error getting place details:', e);
      }
      return null;
    }
  };

  const handleSuggestionClick = async (suggestion: PlaceSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setIsLoading(true);

    // Get place details to extract coordinates
    const placeDetails = await getPlaceDetails(suggestion.place_id);
    setIsLoading(false);

    const addressToUse = placeDetails?.formatted_address || suggestion.description;
    setInputValue(addressToUse);

    if (placeDetails && placeDetails.geometry && placeDetails.geometry.location) {
      const coordinates = {
        lat: placeDetails.geometry.location.lat,
        lng: placeDetails.geometry.location.lng
      };

      console.log('[GooglePlacesAutocomplete] Selected place with coordinates:', {
        address: addressToUse,
        coordinates
      });

      onChange(addressToUse, coordinates);
      setSessionToken(createSessionToken());
    } else {
      // Fallback without coordinates
      console.warn('[GooglePlacesAutocomplete] Could not get coordinates, using address only');
      onChange(addressToUse);
      setSessionToken(createSessionToken());
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle manual input without selecting a suggestion
  const handleManualInput = async () => {
    if (inputValue === value) return;
    if (inputValue.length < 3) {
      onChange(inputValue);
      return;
    }

    setIsLoading(true);

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 8000);
      });

      const fetchPromise = supabase.functions.invoke('google-maps-api', {
        body: {
          endpoint: 'geocoding',
          address: inputValue,
          sessionToken
        }
      });

      const { data, error: invokeError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as { data: any; error: any };

      if (invokeError || data?.status !== 'OK' || !data?.results?.[0]) {
        onChange(inputValue);
        return;
      }

      const result = data.results[0];
      const coords = result.geometry?.location;
      const formatted = result.formatted_address || inputValue;

      setInputValue(formatted);

      if (coords) {
        onChange(formatted, { lat: coords.lat, lng: coords.lng });
      } else {
        onChange(formatted);
      }

      setSessionToken(createSessionToken());
    } catch {
      onChange(inputValue);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && (
        <Label htmlFor="address-input">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id="address-input"
          type="text"
          value={inputValue}
          onChange={handleInputChangeEvent}
          onFocus={handleInputFocus}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleManualInput();
              setShowSuggestions(false);
            }
            if (e.key === 'Escape') {
              setShowSuggestions(false);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`pr-10 ${error ? 'border-destructive' : ''}`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-destructive" />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Comece a digitar e selecione o endereço nas sugestões. Se não aparecer, pressione Enter para usar manualmente.
      </p>

      {/* Error message */}
      {error && (
        <div className="space-y-2">
          <p className="text-xs text-destructive">{error}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleManualInput}
            disabled={disabled || isLoading || inputValue.trim().length === 0}
          >
            Usar endereço digitado
          </Button>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              className="w-full flex items-start text-left p-3 hover:bg-accent transition-colors border-b border-border last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-primary" />
              <span className="text-sm">{suggestion.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* No suggestions message */}
      {showSuggestions && !isLoading && !error && inputValue.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full bg-background border border-border rounded-md shadow-lg p-3 mt-1">
          <p className="text-sm text-muted-foreground">Nenhum endereço encontrado. Tente outro termo (ou pressione Enter para usar manualmente).</p>
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
