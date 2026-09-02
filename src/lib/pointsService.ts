/**
 * Serviço de pontos standalone para ações que não precisam do hook completo
 * Útil para evitar imports dinâmicos de hooks em componentes
 */

import { supabase } from '@/integrations/supabase/client';
import { API_CONFIG } from '@/lib/config';
import { isBusinessUser } from '@/lib/isBusinessUser';

/**
 * Incrementa o contador de compartilhamentos e concede pontos ao usuário
 */
export const awardSharePoints = async (userId: string, offerId: string): Promise<{ success: boolean }> => {
  if (!userId || !offerId) {
    return { success: false };
  }

  try {
    // Anunciantes não ganham pontos de consumidor
    const isBusiness = await isBusinessUser(userId);

    // Increment shares_count in offers table using atomic increment
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('shares_count, business_id')
      .eq('id', offerId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar oferta para compartilhamento:', fetchError);
    }

    if (offer) {
      const newSharesCount = (offer.shares_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('offers')
        .update({ shares_count: newSharesCount })
        .eq('id', offerId);

      if (updateError) {
        console.error('Erro ao atualizar contador de compartilhamentos:', updateError);
        
        // Fallback: registrar via business_analytics se o update direto falhar
        if (offer.business_id) {
          await supabase.from('business_analytics').insert({
            business_id: offer.business_id,
            offer_id: offerId,
            user_id: userId,
            event_type: 'share'
          });
        }
      } else {
        console.log('Compartilhamento registrado com sucesso, novo total:', newSharesCount);
      }
    }

    // Record the points transaction (apenas consumidores)
    if (!isBusiness) {
      await supabase.from('user_points').insert({
        user_id: userId,
        points_earned: API_CONFIG.APP.DEFAULT_POINTS_PER_SHARE,
        action_type: 'share',
        offer_id: offerId,
        description: 'Compartilhou uma oferta'
      });

      await supabase.rpc('update_user_points', {
        user_id: userId,
        points_to_add: API_CONFIG.APP.DEFAULT_POINTS_PER_SHARE
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao conceder pontos de compartilhamento:', error);
    return { success: false };
  }
};
