import { useState, useEffect } from 'react'
import { supabase, UserPoints } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { API_CONFIG } from '@/lib/config'
import { useAutomaticRaffles } from './useAutomaticRaffles'

interface PointsStats {
  totalPoints: number
  pointsEarned: number
  pointsSpent: number
  level: number
  nextLevelPoints: number
  progressToNext: number
  earnedThisMonth: number
  totalCheckins: number
}

export const usePoints = () => {
  const [pointsStats, setPointsStats] = useState<PointsStats>({
    totalPoints: 0,
    pointsEarned: 0,
    pointsSpent: 0,
    level: 1,
    nextLevelPoints: 1000,
    progressToNext: 0,
    earnedThisMonth: 0,
    totalCheckins: 0
  })
  const [recentActivities, setRecentActivities] = useState<UserPoints[]>([])
  const [loading, setLoading] = useState(true)
  const { user, userProfile } = useAuth()
  const { triggerAutomaticParticipation } = useAutomaticRaffles()

  useEffect(() => {
    if (user) {
      fetchPointsData()
    }
  }, [user])

  const fetchPointsData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get user's current total points
      const { data: userData } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single()

      // Get points history
      const { data: pointsHistory } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (pointsHistory) {
        setRecentActivities(pointsHistory as UserPoints[])
      }

      const totalPoints = userData?.total_points || 0
      const pointsEarned = pointsHistory?.reduce((sum, p) => sum + p.points_earned, 0) || 0
      const pointsSpent = 0 // Points spent is tracked differently in our schema

      // Calculate points earned this month
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const earnedThisMonth = pointsHistory?.filter(p => {
        const pointDate = new Date(p.created_at)
        return pointDate.getMonth() === currentMonth && pointDate.getFullYear() === currentYear
      }).reduce((sum, p) => sum + p.points_earned, 0) || 0

      // Calculate total check-ins
      const totalCheckins = pointsHistory?.filter(p => p.action_type === 'checkin').length || 0

      // Calculate level (1000 points per level)
      const level = Math.floor(totalPoints / 1000) + 1
      const nextLevelPoints = level * 1000
      const progressToNext = (totalPoints % 1000) / 10 // percentage

      setPointsStats({
        totalPoints,
        pointsEarned,
        pointsSpent,
        level,
        nextLevelPoints,
        progressToNext,
        earnedThisMonth,
        totalCheckins
      })
    } catch (error) {
      console.error('Erro ao carregar dados de pontos:', error)
    } finally {
      setLoading(false)
    }
  }

  const awardPoints = async (
    points: number,
    actionType: 'checkin' | 'share' | 'review' | 'signup' | 'follow',
    description: string,
    offerId?: string,
    businessId?: string
  ) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' }

    // Anunciantes não ganham pontos na gamificação de consumidores
    if (userProfile?.user_type === 'business') {
      console.log('[Points] Anunciante ignorado na gamificação de consumidor');
      return { success: false, error: 'Anunciantes não participam da gamificação de consumidores' }
    }

    try {
      // Record the points transaction
      await supabase.from('user_points').insert({
        user_id: user.id,
        points_earned: points,
        action_type: actionType,
        offer_id: offerId,
        business_id: businessId,
        description
      })

      // Update user's total points
      await supabase.rpc('update_user_points', {
        user_id: user.id,
        points_to_add: points
      })

      // Check for new badges after awarding points
      try {
        await supabase.rpc('check_and_award_badges', {
          user_id_param: user.id
        })
      } catch (badgeError) {
        console.warn('Erro ao verificar badges:', badgeError)
        // Don't fail the points award if badge check fails
      }

      // Trigger automatic raffle participation
      try {
        // Only trigger for supported action types
        const supportedActions: ('checkin' | 'purchase' | 'like' | 'share' | 'follow')[] = ['checkin', 'share', 'follow'];
        if (supportedActions.includes(actionType as any)) {
          await triggerAutomaticParticipation(
            user.id,
            actionType as 'checkin' | 'purchase' | 'like' | 'share' | 'follow',
            offerId,
            businessId
          )
        }
      } catch (raffleError) {
        console.warn('Erro ao processar participação automática em sorteios:', raffleError)
        // Don't fail the points award if raffle participation fails
      }

      // Refresh data
      await fetchPointsData()

      return { success: true, points }
    } catch (error) {
      console.error('Erro ao conceder pontos:', error)
      return { success: false, error }
    }
  }

  const spendPoints = async (
    points: number,
    description: string,
    prizeId?: string
  ) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' }
    if (pointsStats.totalPoints < points) {
      return { success: false, error: 'Pontos insuficientes' }
    }

    try {
      // Record the points transaction  
      await supabase.from('user_points').insert({
        user_id: user.id,
        points_earned: -points, // Negative for spending
        action_type: 'raffle_entry',
        description
      })

      // Update user's total points
      await supabase.rpc('update_user_points', {
        user_id: user.id,
        points_to_add: -points
      })

      // Note: Prize redemptions would be handled through raffles table

      // Refresh data
      await fetchPointsData()

      return { success: true, pointsSpent: points }
    } catch (error) {
      console.error('Erro ao gastar pontos:', error)
      return { success: false, error }
    }
  }

  const getAvailablePrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('is_active', true)
        .lte('entry_cost', pointsStats.totalPoints)
        .order('entry_cost', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Erro ao buscar prêmios:', error)
      return []
    }
  }

  const getRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Erro ao buscar sorteios:', error)
      return []
    }
  }

  const enterRaffle = async (raffleId: string, entryCount: number = 1) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' }

    try {
      // Get raffle details
      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', raffleId)
        .single()

      if (raffleError || !raffle) {
        return { success: false, error: 'Sorteio não encontrado' }
      }

      const totalCost = raffle.entry_cost * entryCount

      if (pointsStats.totalPoints < totalCost) {
        return { success: false, error: 'Pontos insuficientes' }
      }

      // Check if raffle is still open
      if (new Date(raffle.end_date) < new Date()) {
        return { success: false, error: 'Sorteio já encerrado' }
      }

      // Enter raffle
      await supabase.from('raffle_entries').insert({
        raffle_id: raffleId,
        user_id: user.id,
        entry_number: entryCount
      })

      // Spend points
      await spendPoints(totalCost, `Participação no sorteio: ${raffle.title}`)

      return { success: true, entriesAdded: entryCount, pointsSpent: totalCost }
    } catch (error) {
      console.error('Erro ao participar do sorteio:', error)
      return { success: false, error }
    }
  }

  // Quick action methods with predefined points
  const checkinPoints = (offerId?: string, businessId?: string) => 
    awardPoints(
      API_CONFIG.APP.DEFAULT_POINTS_PER_CHECKIN,
      'checkin',
      'Check-in realizado',
      offerId,
      businessId
    )

  const sharePoints = async (offerId?: string) => {
    // Increment shares_count in offers table
    if (offerId) {
      try {
        const { data: offer } = await supabase
          .from('offers')
          .select('shares_count')
          .eq('id', offerId)
          .single();
        
        if (offer) {
          await supabase
            .from('offers')
            .update({ shares_count: (offer.shares_count || 0) + 1 })
            .eq('id', offerId);
        }
      } catch (error) {
        console.warn('Error incrementing share count:', error);
      }
    }
    
    return awardPoints(
      API_CONFIG.APP.DEFAULT_POINTS_PER_SHARE,
      'share',
      'Compartilhou uma oferta',
      offerId
    );
  }

  const reviewPoints = (offerId?: string, businessId?: string) => 
    awardPoints(
      API_CONFIG.APP.DEFAULT_POINTS_PER_REVIEW,
      'review',
      'Avaliou uma oferta',
      offerId,
      businessId
    )

  return {
    pointsStats,
    recentActivities,
    loading,
    awardPoints,
    spendPoints,
    getAvailablePrizes,
    getRaffles,
    enterRaffle,
    checkinPoints,
    sharePoints,
    reviewPoints,
    refresh: fetchPointsData
  }
}