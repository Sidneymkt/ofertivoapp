import { useState, useEffect } from 'react'
import { supabase, Offer } from '@/lib/supabase'
import { mapboxService, Location } from '@/lib/mapbox'
import { useAuth } from './useAuth'

interface UseOffersParams {
  category?: string
  location?: Location
  radius?: number // in kilometers
  limit?: number
}

export const useOffers = (params: UseOffersParams = {}) => {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const {
    category,
    location,
    radius = 10,
    limit = 20
  } = params

  useEffect(() => {
    fetchOffers()
  }, [category, location, radius, limit])

  const fetchOffers = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('offers')
        .select(`
          *,
          business:businesses(*)
        `)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      let filteredOffers = data || []

      // Filter by location if provided
      if (location && filteredOffers.length > 0) {
        filteredOffers = filteredOffers
          .map(offer => ({
            ...offer,
            distance: mapboxService.calculateDistance(location, {
              latitude: offer.latitude,
              longitude: offer.longitude
            })
          }))
          .filter(offer => offer.distance <= radius)
          .sort((a, b) => a.distance - b.distance)
      }

      setOffers(filteredOffers)
    } catch (error: any) {
      setError(error.message)
      console.error('Erro ao buscar ofertas:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchOffers = async (searchTerm: string) => {
    try {
      setLoading(true)
      
      const { data, error: searchError } = await supabase
        .from('offers')
        .select(`
          *,
          business:businesses(*)
        `)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (searchError) throw searchError

      setOffers(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (offerId: string) => {
    if (!user) return

    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('offer_id', offerId)
        .single()

      if (existing) {
        // Remove from favorites
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('offer_id', offerId)
      } else {
        // Add to favorites
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            offer_id: offerId
          })
      }

      // Refresh offers to update favorite status
      await fetchOffers()
    } catch (error) {
      console.error('Erro ao alterar favorito:', error)
    }
  }

  const getFavorites = async () => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          offer:offers!fk_favorites_offer(*,business:businesses(*))
        `)
        .eq('user_id', user.id)

      if (error) throw error

      return data?.map(fav => fav.offer) || []
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error)
      return []
    }
  }

  const shareOffer = async (offerId: string) => {
    if (!user) return

    try {
      // Apenas consumidores ganham pontos por compartilhamento
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single();

      if (profile?.user_type === 'business') {
        return { success: true, points: 0 }
      }

      // Award points for sharing
      await supabase.from('user_points').insert({
        user_id: user.id,
        points_earned: 25,
        action_type: 'share',
        offer_id: offerId,
        description: 'Compartilhou uma oferta'
      })

      // Update user total points
      await supabase.rpc('update_user_points', {
        user_id: user.id,
        points_to_add: 25
      })

      return { success: true, points: 25 }
    } catch (error) {
      console.error('Erro ao compartilhar oferta:', error)
      return { success: false, error }
    }
  }

  const deleteOffer = async (offerId: string) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' }

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId)

      if (error) throw error

      // Remove from local state
      setOffers(prev => prev.filter(offer => offer.id !== offerId))

      return { success: true }
    } catch (error) {
      console.error('Erro ao deletar oferta:', error)
      return { success: false, error }
    }
  }

  return {
    offers,
    loading,
    error,
    fetchOffers,
    searchOffers,
    toggleFavorite,
    getFavorites,
    shareOffer,
    deleteOffer,
    refresh: fetchOffers
  }
}