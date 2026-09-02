import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Address {
  id: string;
  user_id?: string;
  business_id?: string;
  label: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postal_code?: string;
  country: string;
  formatted_address: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  label: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postal_code?: string;
  country?: string;
  formatted_address: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export const useAddresses = (businessId?: string) => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);

  const fetchAddresses = async () => {
    if (!user && !businessId) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('addresses')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (businessId) {
        query = query.eq('business_id', businessId);
      } else if (user) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAddresses(data || []);
      
      const defaultAddr = data?.find(addr => addr.is_default) || data?.[0] || null;
      setDefaultAddress(defaultAddr);
    } catch (error) {
      console.error('[useAddresses] Error fetching addresses:', error);
      toast.error('Erro ao carregar endereços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [user?.id, businessId]);

  const createAddress = async (addressData: AddressFormData): Promise<Address | null> => {
    if (!user && !businessId) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      const newAddress = {
        ...addressData,
        user_id: businessId ? null : user?.id,
        business_id: businessId || null,
        country: addressData.country || 'Brasil',
        is_default: addressData.is_default ?? (addresses.length === 0),
        is_active: true,
      };

      const { data, error } = await supabase
        .from('addresses')
        .insert(newAddress)
        .select()
        .single();

      if (error) throw error;

      toast.success('Endereço adicionado com sucesso!');
      await fetchAddresses();
      return data;
    } catch (error) {
      console.error('[useAddresses] Error creating address:', error);
      toast.error('Erro ao adicionar endereço');
      return null;
    }
  };

  const saveAddress = async (addressData: AddressFormData, addressId?: string): Promise<Address | null> => {
    if (!user && !businessId) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const existingId = addressId || defaultAddress?.id;
    if (!existingId) return createAddress(addressData);

    try {
      const { data, error } = await supabase
        .from('addresses')
        .update({
          ...addressData,
          country: addressData.country || 'Brasil',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId)
        .select()
        .single();

      if (error) throw error;

      await fetchAddresses();
      return data;
    } catch (error) {
      console.error('[useAddresses] Error saving address:', error);
      toast.error('Erro ao atualizar endereço');
      return null;
    }
  };

  const updateAddress = async (id: string, addressData: Partial<AddressFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('addresses')
        .update(addressData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Endereço atualizado com sucesso!');
      await fetchAddresses();
      return true;
    } catch (error) {
      console.error('[useAddresses] Error updating address:', error);
      toast.error('Erro ao atualizar endereço');
      return false;
    }
  };

  const deleteAddress = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('addresses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Endereço removido com sucesso!');
      await fetchAddresses();
      return true;
    } catch (error) {
      console.error('[useAddresses] Error deleting address:', error);
      toast.error('Erro ao remover endereço');
      return false;
    }
  };

  const setAsDefault = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Endereço padrão atualizado!');
      await fetchAddresses();
      return true;
    } catch (error) {
      console.error('[useAddresses] Error setting default address:', error);
      toast.error('Erro ao definir endereço padrão');
      return false;
    }
  };

  return {
    addresses,
    defaultAddress,
    loading,
    createAddress,
    saveAddress,
    updateAddress,
    deleteAddress,
    setAsDefault,
    refresh: fetchAddresses,
  };
};
