export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// NOTE: Permissive fallback schema. The database schema is still being migrated,
// so tables/columns are typed loosely to keep the app compiling and running.
type AnyTable = {
  Row: { [key: string]: any }
  Insert: { [key: string]: any }
  Update: { [key: string]: any }
  Relationships: []
}

type AnyFunction = {
  Args: { [key: string]: any }
  Returns: any
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievement_credit_transactions: AnyTable
      addresses: AnyTable
      admin_users: AnyTable
      ai_text_improvement_usage: AnyTable
      automatic_raffle_participations: AnyTable
      avatars: AnyTable
      badges: AnyTable
      beneficiarios_verificados: AnyTable
      business: AnyTable
      business_achievement_credits: AnyTable
      business_achievements: AnyTable
      business_active_advantages: AnyTable
      business_analytics: AnyTable
      business_badges: AnyTable
      business_dashboard_access: AnyTable
      business_pix_keys: AnyTable
      business_points_transactions: AnyTable
      business_reviews: AnyTable
      business_subscriptions: AnyTable
      businesses: AnyTable
      businesses_public: AnyTable
      campaign: AnyTable
      campaign_contributions: AnyTable
      chats: AnyTable
      checkin_validations: AnyTable
      community: AnyTable
      community_highlights: AnyTable
      community_posts: AnyTable
      community_weekly_ranking: AnyTable
      crm_alertas: AnyTable
      crm_leads: AnyTable
      crowdfunding_campaigns: AnyTable
      daily_mission_completions: AnyTable
      donations_pix: AnyTable
      email_funnel_sent: AnyTable
      email_funnel_templates: AnyTable
      favorites: AnyTable
      follows: AnyTable
      fundo_social: AnyTable
      fundo_social_movimentacoes: AnyTable
      interests: AnyTable
      manual_checkin_codes: AnyTable
      marketing: AnyTable
      marketing_campaign_recipients: AnyTable
      marketing_campaigns: AnyTable
      messages: AnyTable
      notifications: AnyTable
      offer: AnyTable
      offer_ai_assets: AnyTable
      offer_checkins: AnyTable
      offer_interests: AnyTable
      offer_likes: AnyTable
      offer_orders: AnyTable
      offer_views: AnyTable
      offers: AnyTable
      patrocinio_pix: AnyTable
      patrocinios_vaquinha: AnyTable
      payment_logs: AnyTable
      platform_sensitive_settings: AnyTable
      platform_settings: AnyTable
      points_transfers: AnyTable
      post_comments: AnyTable
      post_likes: AnyTable
      profiles: AnyTable
      profiles_public: AnyTable
      qr_codes: AnyTable
      raffle: AnyTable
      raffle_entries: AnyTable
      raffles: AnyTable
      referral_commissions: AnyTable
      referral_settings: AnyTable
      referral_stats: AnyTable
      referral_tracking: AnyTable
      reviews: AnyTable
      sponsored_banners: AnyTable
      subscription_plans: AnyTable
      support_tickets: AnyTable
      transactions: AnyTable
      user_badges: AnyTable
      user_follows: AnyTable
      user_points: AnyTable
      validation_analytics: AnyTable
      [key: string]: AnyTable
    }
    Views: {
      [key: string]: AnyTable
    }
    Functions: {
      award_special_badge: AnyFunction
      check_admin_status: AnyFunction
      check_and_award_badges: AnyFunction
      check_and_award_business_badges: AnyFunction
      complete_daily_mission: AnyFunction
      conduct_raffle: AnyFunction
      confirm_delivery_checkin: AnyFunction
      confirm_offer_order: AnyFunction
      contribute_to_campaign: AnyFunction
      create_notification: AnyFunction
      create_offer_pix_order: AnyFunction
      create_platform_pix_donation: AnyFunction
      create_platform_pix_sponsorship: AnyFunction
      get_ai_text_improvement_usage_this_month: AnyFunction
      get_business_customer_profiles: AnyFunction
      get_business_wallet_balance: AnyFunction
      get_offer_favorite_count: AnyFunction
      get_raffle_participants: AnyFunction
      increment_banner_click: AnyFunction
      increment_banner_view: AnyFunction
      initialize_business_wallet: AnyFunction
      liberar_pagamento_vaquinha: AnyFunction
      log_offer_action: AnyFunction
      process_automatic_raffle_participation: AnyFunction
      process_payment_confirmation: AnyFunction
      process_qr_validation: AnyFunction
      redeem_advantage: AnyFunction
      remover_patrocinador_campanha: AnyFunction
      search_interests: AnyFunction
      set_offer_interests: AnyFunction
      sync_achievement_credits: AnyFunction
      transfer_points: AnyFunction
      update_user_points: AnyFunction
      upsert_interest: AnyFunction
      validate_checkin: AnyFunction
      validate_manual_checkin_code: AnyFunction
      validate_referral_code: AnyFunction
      vincular_patrocinador_campanha: AnyFunction
      [key: string]: AnyFunction
    }
    Enums: {
      [key: string]: string
    }
    CompositeTypes: {
      [key: string]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"] | keyof PublicSchema["Views"]> = any
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = any
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = any
export type Enums<T extends keyof PublicSchema["Enums"]> = string
export type CompositeTypes<T extends keyof PublicSchema["CompositeTypes"]> = any

export const Constants = {
  public: {
    Enums: {},
  },
} as const
