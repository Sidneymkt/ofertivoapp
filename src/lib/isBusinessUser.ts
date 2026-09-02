import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se um userId pertence a um anunciante (business).
 * Anunciantes NÃO ganham pontos na gamificação de consumidores.
 */
export const isBusinessUser = async (userId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', userId)
      .single();
    return data?.user_type === 'business';
  } catch {
    return false;
  }
};
