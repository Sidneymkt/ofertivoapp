// Re-export the configured Supabase client
export { supabase } from '@/integrations/supabase/client'

// Types for Supabase Database matching the actual schema
export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  phone: string | null
  address: string | null
  city: string
  state: string
  user_type: 'consumer' | 'business'
  total_points: number
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  owner_id: string
  name: string
  description: string | null
  category: string
  address: string
  latitude: number
  longitude: number
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  cover_image_url: string | null
  is_active: boolean
  followers_count: number
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  business_id: string
  title: string
  description: string | null
  category: string
  original_price: number
  discounted_price: number
  discount_percentage: number
  image_url: string | null
  latitude: number
  longitude: number
  valid_until: string
  max_uses: number | null
  current_uses: number
  is_active: boolean
  likes_count: number
  shares_count: number
  views_count: number
  checkin_points: number
  created_at: string
  updated_at: string
  business?: Business
  distance?: number
}

export interface UserPoints {
  id: string
  user_id: string
  points_earned: number
  action_type: 'signup' | 'checkin' | 'review' | 'share' | 'follow' | 'raffle_entry'
  offer_id?: string | null
  business_id?: string | null
  description: string | null
  created_at: string
}

export interface QRCode {
  id: string
  offer_id: string
  business_id: string
  qr_data: string
  is_used: boolean
  used_by: string
  used_at: string
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  offer_id: string
  business_id: string
  rating: number
  comment: string
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  business_id: string
  created_at: string
}

export interface Raffle {
  id: string
  business_id: string
  title: string
  description: string
  prize_description: string
  entry_cost_points: number
  max_participants: number
  current_participants: number
  start_date: string
  end_date: string
  winner_id?: string
  is_active: boolean
  created_at: string
}

export interface RaffleEntry {
  id: string
  raffle_id: string
  user_id: string
  entry_count: number
  created_at: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  criteria_type: string
  criteria_value?: number
  is_active: boolean
  rarity: string
  created_at: string
  updated_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  progress: number
  is_unlocked: boolean
  badge?: Badge
}