import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';

export interface BusinessPixKey {
  id: string;
  business_id: string;
  key_type: PixKeyType;
  key_value: string;
  holder_name: string;
  bank_name: string | null;
  is_active: boolean;
}

export const useBusinessPixKey = (businessId?: string) => {
  const [pixKey, setPixKey] = useState<BusinessPixKey | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('business_pix_keys')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) console.error('[useBusinessPixKey]', error);
    setPixKey((data as any) ?? null);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (input: Omit<BusinessPixKey, 'id' | 'business_id'>) => {
    if (!businessId) return;
    try {
      if (pixKey) {
        const { error } = await (supabase as any)
          .from('business_pix_keys')
          .update(input)
          .eq('id', pixKey.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('business_pix_keys')
          .insert({ business_id: businessId, ...input });
        if (error) throw error;
      }
      toast.success('Chave PIX salva!');
      await fetch();
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao salvar chave PIX: ' + (e.message || ''));
    }
  }, [businessId, pixKey, fetch]);

  const remove = useCallback(async () => {
    if (!pixKey) return;
    const { error } = await (supabase as any).from("business_pix_keys").delete().eq('id', pixKey.id);
    if (error) { toast.error('Erro ao remover'); return; }
    setPixKey(null);
    toast.success('Chave PIX removida');
  }, [pixKey]);

  return { pixKey, loading, save, remove, refresh: fetch };
};
