import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Interest {
  id: string
  name: string
  normalized_name: string
  usage_count: number
  relevance_score?: number
}

interface UseInterestsOptions {
  debounceMs?: number
  cacheEnabled?: boolean
  cacheTtlMs?: number
}

// Cache global para interesses
const interestsCache = new Map<string, { data: Interest[]; timestamp: number }>()
const CACHE_TTL_DEFAULT = 5 * 60 * 1000 // 5 minutos

export const useInterests = (options: UseInterestsOptions = {}) => {
  const { 
    debounceMs = 300, 
    cacheEnabled = true, 
    cacheTtlMs = CACHE_TTL_DEFAULT 
  } = options

  const [interests, setInterests] = useState<Interest[]>([])
  const [popularInterests, setPopularInterests] = useState<Interest[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Buscar interesses populares (mais usados) ao inicializar
  const fetchPopularInterests = useCallback(async () => {
    const cacheKey = 'popular_interests'
    
    // Verificar cache
    if (cacheEnabled) {
      const cached = interestsCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
        setPopularInterests(cached.data)
        return cached.data
      }
    }

    try {
      const { data, error } = await supabase
        .from('interests')
        .select('id, name, normalized_name, usage_count')
        .order('usage_count', { ascending: false })
        .limit(20)

      if (error) throw error

      const formattedData = data || []
      
      // Salvar no cache
      if (cacheEnabled) {
        interestsCache.set(cacheKey, { data: formattedData, timestamp: Date.now() })
      }
      
      setPopularInterests(formattedData)
      return formattedData
    } catch (error) {
      console.error('Erro ao buscar interesses populares:', error)
      return []
    }
  }, [cacheEnabled, cacheTtlMs])

  // Buscar interesses com autocomplete usando RPC
  const searchInterests = useCallback(async (term: string): Promise<Interest[]> => {
    if (!term || term.length < 2) {
      setInterests([])
      return []
    }

    const cacheKey = `search_${term.toLowerCase()}`
    
    // Verificar cache
    if (cacheEnabled) {
      const cached = interestsCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
        setInterests(cached.data)
        return cached.data
      }
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('search_interests', {
          search_term: term,
          result_limit: 10
        })

      if (error) throw error

      const formattedData = (data || []) as Interest[]
      
      // Salvar no cache
      if (cacheEnabled) {
        interestsCache.set(cacheKey, { data: formattedData, timestamp: Date.now() })
      }
      
      setInterests(formattedData)
      return formattedData
    } catch (error) {
      console.error('Erro ao buscar interesses:', error)
      setInterests([])
      return []
    } finally {
      setLoading(false)
    }
  }, [cacheEnabled, cacheTtlMs])

  // Busca com debounce
  const debouncedSearch = useCallback((term: string) => {
    setSearchTerm(term)
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!term || term.length < 2) {
      setInterests([])
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      searchInterests(term)
    }, debounceMs)
  }, [debounceMs, searchInterests])

  // Criar ou buscar interesse existente
  const upsertInterest = useCallback(async (interestName: string): Promise<string | null> => {
    if (!interestName || interestName.trim().length === 0) return null

    try {
      const { data, error } = await supabase
        .rpc('upsert_interest', { interest_name: interestName.trim() })

      if (error) throw error

      // Invalidar cache de populares
      interestsCache.delete('popular_interests')
      
      return data as string
    } catch (error) {
      console.error('Erro ao criar interesse:', error)
      return null
    }
  }, [])

  // Associar interesses a uma oferta
  const setOfferInterests = useCallback(async (offerId: string, interestNames: string[]): Promise<boolean> => {
    try {
      const { error } = await supabase
        .rpc('set_offer_interests', {
          p_offer_id: offerId,
          p_interests: interestNames
        })

      if (error) throw error

      // Invalidar cache de populares
      interestsCache.delete('popular_interests')
      
      return true
    } catch (error) {
      console.error('Erro ao associar interesses à oferta:', error)
      return false
    }
  }, [])

  // Buscar interesses de uma oferta
  const getOfferInterests = useCallback(async (offerId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('offer_interests')
        .select('interest_id, interests(name)')
        .eq('offer_id', offerId)

      if (error) throw error

      return (data || []).map((item: any) => item.interests?.name).filter(Boolean)
    } catch (error) {
      console.error('Erro ao buscar interesses da oferta:', error)
      return []
    }
  }, [])

  // Normalizar interesse (client-side)
  const normalizeInterest = useCallback((input: string): string => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\sáéíóúàèìòùâêîôûãõç-]/gi, '')
  }, [])

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Buscar interesses populares ao inicializar
  useEffect(() => {
    fetchPopularInterests()
  }, [fetchPopularInterests])

  // Função legada para compatibilidade com código existente
  const legacyInterests = popularInterests.map(i => i.name)

  return {
    // Estado
    interests,
    popularInterests,
    loading,
    searchTerm,
    
    // Funções
    searchInterests,
    debouncedSearch,
    upsertInterest,
    setOfferInterests,
    getOfferInterests,
    normalizeInterest,
    refetch: fetchPopularInterests,
    
    // Compatibilidade legada (retorna apenas nomes como array de strings)
    legacyInterests
  }
}

// Hook simplificado para buscar apenas interesses existentes (compatibilidade)
export const useSimpleInterests = () => {
  const { legacyInterests, loading, refetch } = useInterests()
  
  return {
    interests: legacyInterests,
    loading,
    refetch
  }
}
