import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Locate, Loader2 } from 'lucide-react';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { useAddresses, Address, AddressFormData } from '@/hooks/useAddresses';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface AddressEditorProps {
  businessId?: string;
  onAddressSelect?: (address: Address) => void;
  disabled?: boolean;
  showSavedAddresses?: boolean;
}

export const AddressEditor: React.FC<AddressEditorProps> = ({
  businessId,
  onAddressSelect,
  disabled = false,
  showSavedAddresses = true
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  
  // Form state for address
  const [formData, setFormData] = useState<Partial<AddressFormData>>({
    formatted_address: '',
    city: 'Manaus',
    state: 'AM',
    country: 'Brasil'
  });

  const {
    addresses,
    defaultAddress,
    loading,
    saveAddress
  } = useAddresses(businessId);

  useEffect(() => {
    if (defaultAddress && !selectedAddress) {
      setSelectedAddress(defaultAddress);
      setFormData({
        formatted_address: defaultAddress.formatted_address,
        street: defaultAddress.street,
        city: defaultAddress.city || 'Manaus',
        state: defaultAddress.state || 'AM',
        country: defaultAddress.country || 'Brasil',
        latitude: defaultAddress.latitude,
        longitude: defaultAddress.longitude
      });
      onAddressSelect?.(defaultAddress);
    }
  }, [defaultAddress]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode using Google Maps API via edge function
          const response = await supabase.functions.invoke('google-maps-api', {
            body: {
              endpoint: 'geocoding',
              latlng: `${latitude},${longitude}`
            }
          });

          console.log('[AddressEditor] Reverse geocode response:', response);

          if (response.error) {
            throw new Error(`API Error: ${response.error.message || 'Failed to reverse geocode'}`);
          }

          const data = response.data;
          
          if (data && data.results && data.results[0]) {
            const address = data.results[0].formatted_address;
            setFormData(prev => ({
              ...prev,
              formatted_address: address,
              latitude,
              longitude
            }));
            toast.success('Localização atual obtida!');
          } else {
            // Fallback: just save coordinates
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude
            }));
            toast.info('Coordenadas obtidas! Digite o endereço manualmente.');
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude
          }));
          toast.info('Coordenadas obtidas! Digite o endereço manualmente.');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Erro ao obter localização atual');
        setIsGettingLocation(false);
      }
    );
  };

  const handleGooglePlacesSelect = async (address: string, coords?: { lat: number; lng: number }) => {
    const updatedFormData = {
      ...formData,
      formatted_address: address,
      latitude: coords?.lat,
      longitude: coords?.lng
    };
    setFormData(updatedFormData);
    
    // Auto-save when address is selected from autocomplete with valid coordinates
    if (coords?.lat && coords?.lng && !disabled) {
      const label = formData.city || 'Endereço';
      const addressToSave: AddressFormData = {
        label,
        formatted_address: address,
        street: formData.street || address,
        city: formData.city || 'Manaus',
        state: formData.state || 'AM',
        country: formData.country || 'Brasil',
        latitude: coords.lat,
        longitude: coords.lng,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        postal_code: formData.postal_code
      };

      const newAddress = await saveAddress(addressToSave, selectedAddress?.id);
      if (newAddress) {
        setSelectedAddress(newAddress);
        onAddressSelect?.(newAddress);
        toast.success('Endereço atualizado com sucesso!');
      }
    } else if (onAddressSelect && address) {
      // Notify parent immediately when address is selected (fallback)
      const label = formData.city || 'Endereço';
      onAddressSelect({
        ...updatedFormData,
        label,
        id: selectedAddress?.id || '',
        user_id: null,
        business_id: businessId || null,
        is_default: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Address);
    }
  };

  const handleAddressInputChange = (address: string) => {
    // Update formData as user types to enable Save button
    console.log('[AddressEditor] Input changed:', address);
    setFormData(prev => {
      const updated = {
        ...prev,
        formatted_address: address
      };
      console.log('[AddressEditor] FormData updated:', updated);
      return updated;
    });
  };

  const handleSaveAddress = async () => {
    if (!formData.formatted_address || !formData.formatted_address.trim()) {
      toast.error('Digite um endereço válido');
      return;
    }

    // Validar se tem coordenadas
    if (!formData.latitude || !formData.longitude) {
      toast.error('Selecione um endereço da lista de sugestões ou use sua localização atual');
      return;
    }

    // Auto-generate label from city
    const label = formData.city || 'Endereço';

    const addressToSave: AddressFormData = {
      label,
      formatted_address: formData.formatted_address,
      street: formData.street || formData.formatted_address,
      city: formData.city || 'Manaus',
      state: formData.state || 'AM',
      country: formData.country || 'Brasil',
      latitude: formData.latitude,
      longitude: formData.longitude,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      postal_code: formData.postal_code
    };

    console.log('[AddressEditor] Saving address:', addressToSave);
    
    const newAddress = await saveAddress(addressToSave, selectedAddress?.id);
    if (newAddress) {
      setSelectedAddress(newAddress);
      onAddressSelect?.(newAddress);
      toast.success('Endereço atualizado com sucesso!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <GooglePlacesAutocomplete
            value={formData.formatted_address || ''}
            onChange={handleGooglePlacesSelect}
            onInputChange={handleAddressInputChange}
            disabled={disabled}
            label="Endereço Completo"
            placeholder="Digite o endereço"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCurrentLocation}
            disabled={isGettingLocation || disabled}
            title="Usar minha localização atual"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Locate className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {formData.latitude && formData.longitude && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <strong>📍 Coordenadas:</strong><br />
          Latitude: {formData.latitude.toFixed(6)}<br />
          Longitude: {formData.longitude.toFixed(6)}
        </div>
      )}

      {!disabled && formData.formatted_address && formData.formatted_address.trim().length > 0 && (
        <Button 
          onClick={handleSaveAddress} 
          className="w-full"
          disabled={loading || !formData.latitude || !formData.longitude}
        >
          <Save className="w-4 h-4 mr-2" />
          {formData.latitude && formData.longitude ? 'Salvar Endereço' : 'Selecione um endereço da lista'}
        </Button>
      )}
      
      {selectedAddress && showSavedAddresses && (
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm font-medium text-muted-foreground">Endereço salvo:</p>
          <p className="text-sm font-medium mt-1">{selectedAddress.formatted_address}</p>
        </div>
      )}
    </div>
  );
};
