export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievement_credit_transactions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      addresses: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      admin_users: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      ai_art_plan_limits: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      ai_text_improvement_usage: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      badges: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      beneficiarios_verificados: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_achievement_credits: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_achievements: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_active_advantages: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_analytics: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_badges: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_dashboard_access: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_points_transactions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_points_wallet: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_reviews: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      business_subscriptions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      businesses: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      campaign_contributions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      campaigns: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      chats: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      checkin_validations: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      community_highlights: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      community_posts: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      community_weekly_ranking: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      crm_alertas: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      crm_leads: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      crowdfunding_campaigns: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      daily_mission_completions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      donations_pix: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      email_funnel_sent: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      email_funnel_templates: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      favorites: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      follows: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      fundo_social: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      fundo_social_movimentacoes: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      interests: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      manual_checkin_codes: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      marketing_campaign_recipients: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      marketing_campaigns: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      messages: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      notifications: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      offer_ai_assets: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      offer_audit_log: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      offer_interests: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      offer_likes: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      offer_orders: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      offer_views: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      offers: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      patrocinio_pix: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      patrocinios_vaquinha: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      payment_gateways: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      payment_logs: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      platform_sensitive_settings: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      platform_settings: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      points_transfers: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      post_comments: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      post_likes: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      profiles: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      qr_codes: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      raffle_entries: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      raffles: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      referral_commissions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      referral_settings: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      referral_stats: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      referral_tracking: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      reviews: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      sponsored_banners: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      subscription_plans: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      support_tickets: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      transactions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      user_badges: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      user_blocks: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      user_chat_messages: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      user_chats: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      user_follows: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      user_points: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
      validation_analytics: {
        Row: any
        Insert: any
        Update: any
        Relationships: any[]
      }
    }
    Views: {
      businesses_public: {
        Row: any
        Relationships: any[]
      }
      profiles_public: {
        Row: any
        Relationships: any[]
      }
    }
    Functions: {
      after_insert_raffle_entries: {
        Args: any
        Returns: any
      }
      alimentar_fundo_social: {
        Args: any
        Returns: any
      }
      auto_generate_qr_code: {
        Args: any
        Returns: any
      }
      auto_initialize_business_wallet: {
        Args: any
        Returns: any
      }
      auto_mark_offer_as_recent: {
        Args: any
        Returns: any
      }
      award_achievement_credits: {
        Args: any
        Returns: any
      }
      award_special_badge: {
        Args: any
        Returns: any
      }
      before_insert_raffle_entries: {
        Args: any
        Returns: any
      }
      calcular_valor_equivalente: {
        Args: any
        Returns: any
      }
      calculate_referral_commission: {
        Args: any
        Returns: any
      }
      can_validate_offer_checkin: {
        Args: any
        Returns: any
      }
      check_admin_status: {
        Args: any
        Returns: any
      }
      check_and_award_badges: {
        Args: any
        Returns: any
      }
      check_and_award_business_badges: {
        Args: any
        Returns: any
      }
      check_campaign_goal_after_contribution: {
        Args: any
        Returns: any
      }
      clamp_checkin_validation_points: {
        Args: any
        Returns: any
      }
      complete_daily_mission: {
        Args: any
        Returns: any
      }
      conduct_raffle: {
        Args: any
        Returns: any
      }
      confirm_delivery_checkin: {
        Args: any
        Returns: any
      }
      confirm_offer_order: {
        Args: any
        Returns: any
      }
      contribute_to_campaign: {
        Args: any
        Returns: any
      }
      create_notification: {
        Args: any
        Returns: any
      }
      create_offer_pix_order: {
        Args: any
        Returns: any
      }
      create_platform_pix_donation: {
        Args: any
        Returns: any
      }
      create_platform_pix_sponsorship: {
        Args: any
        Returns: any
      }
      debit_business_points: {
        Args: any
        Returns: any
      }
      debit_business_wallet: {
        Args: any
        Returns: any
      }
      ensure_single_default_address: {
        Args: any
        Returns: any
      }
      expire_advantages: {
        Args: any
        Returns: any
      }
      expire_pending_payments: {
        Args: any
        Returns: any
      }
      generate_business_slug: {
        Args: any
        Returns: any
      }
      get_active_platform_pix_key: {
        Args: any
        Returns: any
      }
      get_ai_art_usage_this_month: {
        Args: any
        Returns: any
      }
      get_ai_text_improvement_usage_this_month: {
        Args: any
        Returns: any
      }
      get_business_customer_profiles: {
        Args: any
        Returns: any
      }
      get_business_wallet_balance: {
        Args: any
        Returns: any
      }
      get_current_user_admin_status: {
        Args: any
        Returns: any
      }
      get_date_from_timestamp: {
        Args: any
        Returns: any
      }
      get_offer_favorite_count: {
        Args: any
        Returns: any
      }
      get_offers_by_interest_compatibility: {
        Args: any
        Returns: any
      }
      get_post_stats: {
        Args: any
        Returns: any
      }
      get_public_business_info: {
        Args: any
        Returns: any
      }
      get_raffle_participants: {
        Args: any
        Returns: any
      }
      get_rarity_credits: {
        Args: any
        Returns: any
      }
      handle_new_subscription: {
        Args: any
        Returns: any
      }
      handle_new_user: {
        Args: any
        Returns: any
      }
      increment_banner_click: {
        Args: any
        Returns: any
      }
      increment_banner_view: {
        Args: any
        Returns: any
      }
      initialize_business_wallet: {
        Args: any
        Returns: any
      }
      is_admin: {
        Args: any
        Returns: any
      }
      is_authorized_advertiser: {
        Args: any
        Returns: any
      }
      liberar_pagamento_vaquinha: {
        Args: any
        Returns: any
      }
      log_offer_action: {
        Args: any
        Returns: any
      }
      log_referral_completion: {
        Args: any
        Returns: any
      }
      normalize_interest: {
        Args: any
        Returns: any
      }
      notify_business_new_review: {
        Args: any
        Returns: any
      }
      notify_campaign_sponsored: {
        Args: any
        Returns: any
      }
      notify_checkin_success: {
        Args: any
        Returns: any
      }
      notify_followers_new_offer: {
        Args: any
        Returns: any
      }
      notify_followers_new_raffle: {
        Args: any
        Returns: any
      }
      notify_new_follower: {
        Args: any
        Returns: any
      }
      notify_points_awarded: {
        Args: any
        Returns: any
      }
      notify_raffle_participation: {
        Args: any
        Returns: any
      }
      process_automatic_raffle_participation: {
        Args: any
        Returns: any
      }
      process_payment_confirmation: {
        Args: any
        Returns: any
      }
      process_qr_validation: {
        Args: any
        Returns: any
      }
      processar_meta_atingida: {
        Args: any
        Returns: any
      }
      redeem_advantage: {
        Args: any
        Returns: any
      }
      remover_patrocinador_campanha: {
        Args: any
        Returns: any
      }
      reset_business_wallet_monthly: {
        Args: any
        Returns: any
      }
      search_interests: {
        Args: any
        Returns: any
      }
      set_discount_percentage: {
        Args: any
        Returns: any
      }
      set_offer_interests: {
        Args: any
        Returns: any
      }
      set_offer_orders_updated_at: {
        Args: any
        Returns: any
      }
      transfer_points: {
        Args: any
        Returns: any
      }
      trigger_business_badge_check: {
        Args: any
        Returns: any
      }
      trigger_check_badges: {
        Args: any
        Returns: any
      }
      update_addresses_updated_at: {
        Args: any
        Returns: any
      }
      update_admin_updated_at: {
        Args: any
        Returns: any
      }
      update_business_points_wallet_updated_at: {
        Args: any
        Returns: any
      }
      update_business_rating: {
        Args: any
        Returns: any
      }
      update_business_referral: {
        Args: any
        Returns: any
      }
      update_campaign_points: {
        Args: any
        Returns: any
      }
      update_community_posts_updated_at: {
        Args: any
        Returns: any
      }
      update_offer_likes_count: {
        Args: any
        Returns: any
      }
      update_offer_views_count: {
        Args: any
        Returns: any
      }
      update_referral_on_payment: {
        Args: any
        Returns: any
      }
      update_referral_stats: {
        Args: any
        Returns: any
      }
      update_sponsored_banners_updated_at: {
        Args: any
        Returns: any
      }
      update_transaction_updated_at: {
        Args: any
        Returns: any
      }
      update_updated_at_column: {
        Args: any
        Returns: any
      }
      update_user_follow_counts: {
        Args: any
        Returns: any
      }
      update_user_points: {
        Args: any
        Returns: any
      }
      upsert_interest: {
        Args: any
        Returns: any
      }
      user_owns_raffle_business: {
        Args: any
        Returns: any
      }
      validate_checkin: {
        Args: any
        Returns: any
      }
      validate_manual_checkin_code: {
        Args: any
        Returns: any
      }
      validate_referral_code: {
        Args: any
        Returns: any
      }
      vincular_patrocinador_campanha: {
        Args: any
        Returns: any
      }
    }
    Enums: {
    }
    CompositeTypes: {
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
