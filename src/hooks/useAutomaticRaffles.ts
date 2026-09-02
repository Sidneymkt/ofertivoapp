import { supabase } from '@/integrations/supabase/client'

export const useAutomaticRaffles = () => {
  
  const triggerAutomaticParticipation = async (
    userId: string,
    actionType: 'checkin' | 'purchase' | 'like' | 'share' | 'follow',
    triggerId?: string,
    businessId?: string
  ) => {
    try {
      console.log('[AutomaticRaffles] Triggering participation:', {
        userId,
        actionType,
        triggerId,
        businessId
      })

      // Call the database function to process automatic participation
      const { error } = await supabase.rpc('process_automatic_raffle_participation' as any, {
        p_user_id: userId,
        p_action_type: actionType,
        p_trigger_id: triggerId || null,
        p_business_id: businessId || null
      })

      if (error) {
        console.error('[AutomaticRaffles] Error processing automatic participation:', error)
        return { success: false, error }
      }

      // Trigger badge check after successful participation
      try {
        await supabase.rpc('check_and_award_badges' as any, { user_id_param: userId })
      } catch (badgeError) {
        console.warn('[AutomaticRaffles] Error checking badges:', badgeError)
        // Don't fail the main operation for badge errors
      }

      console.log('[AutomaticRaffles] Automatic participation processed successfully')
      return { success: true }
      
    } catch (error) {
      console.error('[AutomaticRaffles] Error triggering automatic participation:', error)
      return { success: false, error }
    }
  }

  const getUserRaffleEntries = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('raffle_entries' as any)
        .select(`
          id,
          entry_number,
          number_of_entries,
          created_at,
          raffles (
            id,
            title,
            description,
            prize,
            end_date,
            winner_id,
            is_active,
            image_url,
            businesses (
              name,
              logo_url
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[AutomaticRaffles] Error fetching user raffle entries:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[AutomaticRaffles] Error getting user raffle entries:', error)
      return []
    }
  }

  const getAutomaticParticipations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('automatic_raffle_participations' as any)
        .select(`
          id,
          trigger_action,
          entries_earned,
          created_at,
          raffles (
            title,
            prize,
            businesses (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('[AutomaticRaffles] Error fetching automatic participations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[AutomaticRaffles] Error getting automatic participations:', error)
      return []
    }
  }

  const conductRaffle = async (raffleId: string) => {
    try {
      console.log('[AutomaticRaffles] Conducting raffle:', raffleId)
      
      const { data, error } = await supabase.rpc('conduct_raffle' as any, {
        raffle_id_param: raffleId
      })

      if (error) {
        console.error('[AutomaticRaffles] Error conducting raffle:', error)
        return { success: false, error }
      }

      // Award special badge to winner if successful
      if (data?.success && data?.winner_id) {
        try {
          await supabase.rpc('award_special_badge' as any, {
            user_id_param: data.winner_id,
            badge_name_param: 'Ganhador de Sorteio'
          })
        } catch (badgeError) {
          console.warn('[AutomaticRaffles] Error awarding winner badge:', badgeError)
        }

        // Notificar o ganhador dentro do app
        try {
          const { data: raffleInfo } = await supabase
            .from('raffles')
            .select('title, prize')
            .eq('id', raffleId)
            .maybeSingle()

          await supabase.from('notifications').insert({
            user_id: data.winner_id,
            type: 'raffle_winner',
            title: '🎉 Você ganhou um sorteio!',
            message: `Parabéns! Você foi sorteado em "${raffleInfo?.title || 'um sorteio'}"${raffleInfo?.prize ? ` — Prêmio: ${raffleInfo.prize}` : ''}. Entre em contato com o organizador para receber seu prêmio.`,
            metadata: {
              raffle_id: raffleId,
              raffle_title: raffleInfo?.title,
              prize: raffleInfo?.prize,
            },
            related_id: raffleId,
          })
        } catch (notifError) {
          console.warn('[AutomaticRaffles] Error notifying winner:', notifError)
        }

        // Enviar e-mail ao ganhador
        try {
          await supabase.functions.invoke('send-raffle-winner-email', {
            body: { raffle_id: raffleId, winner_id: data.winner_id },
          })
        } catch (emailError) {
          console.warn('[AutomaticRaffles] Error emailing winner:', emailError)
        }

      }

      return data
    } catch (error) {
      console.error('[AutomaticRaffles] Error conducting raffle:', error)
      return { success: false, error }
    }
  }

  const buyRaffleTicket = async (raffleId: string, userId: string, entryCost: number) => {
    try {
      console.log('[AutomaticRaffles] Buying raffle ticket:', { raffleId, userId, entryCost })

      // Check if user has enough points
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', userId)
        .single()

      if (profileError || !profile) {
        throw new Error('Erro ao verificar pontos do usuário')
      }

      if (profile.total_points < entryCost) {
        return { success: false, error: { message: 'Pontos insuficientes' } }
      }

      // Start transaction-like operations
      // 1. Deduct points from user
      const { error: pointsError } = await supabase
        .from('user_points')
        .insert({
          user_id: userId,
          points_earned: -entryCost,
          action_type: 'raffle_entry',
          description: 'Entrada em sorteio'
        })

      if (pointsError) throw pointsError

      // 2. Update user's total points
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: profile.total_points - entryCost })
        .eq('user_id', userId)

      if (updateError) throw updateError

      // 3. Create raffle entry
      const { data: entry, error: entryError } = await supabase
        .from('raffle_entries' as any)
        .insert({
          raffle_id: raffleId,
          user_id: userId
        } as any)
        .select()
        .single()

      if (entryError) throw entryError

      // Check for badges
      try {
        await supabase.rpc('check_and_award_badges' as any, { user_id_param: userId })
      } catch (badgeError) {
        console.warn('[AutomaticRaffles] Error checking badges after ticket purchase:', badgeError)
      }

      return { success: true, entry }
    } catch (error: any) {
      console.error('[AutomaticRaffles] Error buying raffle ticket:', error)
      return { success: false, error }
    }
  }

  return {
    triggerAutomaticParticipation,
    getUserRaffleEntries,
    getAutomaticParticipations,
    conductRaffle,
    buyRaffleTicket
  }
}