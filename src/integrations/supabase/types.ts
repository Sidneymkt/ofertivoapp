export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievement_credit_transactions: {
        Row: {
          advantage_expires_at: string | null
          advantage_type: string | null
          amount: number
          badge_id: string | null
          balance_after: number
          business_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          transaction_type: string
        }
        Insert: {
          advantage_expires_at?: string | null
          advantage_type?: string | null
          amount: number
          badge_id?: string | null
          balance_after: number
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type: string
        }
        Update: {
          advantage_expires_at?: string | null
          advantage_type?: string | null
          amount?: number
          badge_id?: string | null
          balance_after?: number
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_credit_transactions_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "business_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          business_id: string | null
          city: string
          complement: string | null
          country: string | null
          created_at: string | null
          formatted_address: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          number: string | null
          postal_code: string | null
          state: string
          street: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          city: string
          complement?: string | null
          country?: string | null
          created_at?: string | null
          formatted_address: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          postal_code?: string | null
          state: string
          street: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          city?: string
          complement?: string | null
          country?: string | null
          created_at?: string | null
          formatted_address?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          postal_code?: string | null
          state?: string
          street?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_art_plan_limits: {
        Row: {
          monthly_limit: number | null
          plan_key: string
          updated_at: string
          variations_per_generation: number
        }
        Insert: {
          monthly_limit?: number | null
          plan_key: string
          updated_at?: string
          variations_per_generation?: number
        }
        Update: {
          monthly_limit?: number | null
          plan_key?: string
          updated_at?: string
          variations_per_generation?: number
        }
        Relationships: []
      }
      ai_text_improvement_usage: {
        Row: {
          business_id: string
          created_at: string
          field: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          field: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          field?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_text_improvement_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_text_improvement_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      automatic_raffle_participations: {
        Row: {
          created_at: string
          entries_earned: number
          id: string
          raffle_id: string
          trigger_action: string
          trigger_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entries_earned?: number
          id?: string
          raffle_id: string
          trigger_action: string
          trigger_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entries_earned?: number
          id?: string
          raffle_id?: string
          trigger_action?: string
          trigger_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automatic_raffle_participations_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          color: string
          created_at: string
          criteria_type: string
          criteria_value: number | null
          description: string
          icon: string
          id: string
          is_active: boolean | null
          name: string
          rarity: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          criteria_type: string
          criteria_value?: number | null
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          rarity?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rarity?: string
          updated_at?: string
        }
        Relationships: []
      }
      beneficiarios_verificados: {
        Row: {
          agencia: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          banco: string | null
          chave_pix: string | null
          comprovante_documento_url: string | null
          comprovante_social_url: string | null
          conta: string | null
          created_at: string | null
          documento: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          notas_admin: string | null
          status: string
          telefone: string | null
          tipo: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agencia?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          banco?: string | null
          chave_pix?: string | null
          comprovante_documento_url?: string | null
          comprovante_social_url?: string | null
          conta?: string | null
          created_at?: string | null
          documento: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          notas_admin?: string | null
          status?: string
          telefone?: string | null
          tipo: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agencia?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          banco?: string | null
          chave_pix?: string | null
          comprovante_documento_url?: string | null
          comprovante_social_url?: string | null
          conta?: string | null
          created_at?: string | null
          documento?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          notas_admin?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_achievement_credits: {
        Row: {
          business_id: string
          created_at: string
          id: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_achievement_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_achievement_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_achievements: {
        Row: {
          badge_id: string
          business_id: string
          created_at: string
          earned_at: string | null
          id: string
          is_unlocked: boolean | null
          progress: number | null
          updated_at: string
        }
        Insert: {
          badge_id: string
          business_id: string
          created_at?: string
          earned_at?: string | null
          id?: string
          is_unlocked?: boolean | null
          progress?: number | null
          updated_at?: string
        }
        Update: {
          badge_id?: string
          business_id?: string
          created_at?: string
          earned_at?: string | null
          id?: string
          is_unlocked?: boolean | null
          progress?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_achievements_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "business_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      business_active_advantages: {
        Row: {
          activated_at: string
          advantage_type: string
          business_id: string
          created_at: string
          credits_spent: number
          expires_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          offer_id: string | null
        }
        Insert: {
          activated_at?: string
          advantage_type: string
          business_id: string
          created_at?: string
          credits_spent: number
          expires_at: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          offer_id?: string | null
        }
        Update: {
          activated_at?: string
          advantage_type?: string
          business_id?: string
          created_at?: string
          credits_spent?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_active_advantages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_active_advantages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_active_advantages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_analytics: {
        Row: {
          business_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          offer_id: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          offer_id?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          offer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_analytics_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_badges: {
        Row: {
          color: string
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          is_active: boolean | null
          name: string
          rarity: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          rarity?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rarity?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_dashboard_access: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_dashboard_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_dashboard_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_pix_keys: {
        Row: {
          bank_name: string | null
          business_id: string
          created_at: string
          holder_name: string
          id: string
          is_active: boolean
          key_type: string
          key_value: string
          updated_at: string
        }
        Insert: {
          bank_name?: string | null
          business_id: string
          created_at?: string
          holder_name: string
          id?: string
          is_active?: boolean
          key_type: string
          key_value: string
          updated_at?: string
        }
        Update: {
          bank_name?: string | null
          business_id?: string
          created_at?: string
          holder_name?: string
          id?: string
          is_active?: boolean
          key_type?: string
          key_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_pix_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_pix_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_points_transactions: {
        Row: {
          amount: number
          balance_after: number
          business_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          offer_id: string | null
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          offer_id?: string | null
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          offer_id?: string | null
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_points_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_points_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_points_transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_points_wallet: {
        Row: {
          business_id: string
          created_at: string
          current_balance: number
          id: string
          last_reset_at: string
          monthly_allocation: number
          next_reset_at: string
          total_consumed: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          current_balance?: number
          id?: string
          last_reset_at?: string
          monthly_allocation?: number
          next_reset_at?: string
          total_consumed?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          current_balance?: number
          id?: string
          last_reset_at?: string
          monthly_allocation?: number
          next_reset_at?: string
          total_consumed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_points_wallet_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_points_wallet_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_subscriptions: {
        Row: {
          business_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          last_payment_at: string | null
          next_payment_at: string | null
          payment_gateway: string | null
          payment_method: string | null
          payment_status: string | null
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          last_payment_at?: string | null
          next_payment_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          last_payment_at?: string | null
          next_payment_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_business_subscriptions_business_id"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_business_subscriptions_business_id"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string
          average_rating: number | null
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          followers_count: number | null
          id: string
          is_active: boolean | null
          latitude: number
          logo_url: string | null
          longitude: number
          name: string
          owner_id: string
          phone: string | null
          referred_by: string | null
          slug: string | null
          total_reviews: number | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address: string
          average_rating?: number | null
          category: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers_count?: number | null
          id?: string
          is_active?: boolean | null
          latitude: number
          logo_url?: string | null
          longitude: number
          name: string
          owner_id: string
          phone?: string | null
          referred_by?: string | null
          slug?: string | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string
          average_rating?: number | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers_count?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          logo_url?: string | null
          longitude?: number
          name?: string
          owner_id?: string
          phone?: string | null
          referred_by?: string | null
          slug?: string | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      campaign_contributions: {
        Row: {
          amount: number
          campaign_id: string
          contributor_id: string
          created_at: string
          id: string
          is_anonymous: boolean
          message: string | null
        }
        Insert: {
          amount: number
          campaign_id: string
          contributor_id: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          contributor_id?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crowdfunding_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          creator_id: string
          current_points: number
          description: string
          goal_points: number
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_points?: number
          description: string
          goal_points: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_points?: number
          description?: string
          goal_points?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          offer_id: string | null
          target_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_validations: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          location_latitude: number | null
          location_longitude: number | null
          offer_id: string
          points_awarded: number | null
          qr_code: string
          updated_at: string | null
          user_id: string
          validated_by: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          location_latitude?: number | null
          location_longitude?: number | null
          offer_id: string
          points_awarded?: number | null
          qr_code: string
          updated_at?: string | null
          user_id: string
          validated_by: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          location_latitude?: number | null
          location_longitude?: number | null
          offer_id?: string
          points_awarded?: number | null
          qr_code?: string
          updated_at?: string | null
          user_id?: string
          validated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_validations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_validations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_validations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      community_highlights: {
        Row: {
          ativo: boolean
          business_id: string | null
          created_at: string
          created_by: string | null
          descricao_curta: string | null
          id: string
          imagem: string | null
          link_destino: string | null
          prioridade: number
          tipo_destaque: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao_curta?: string | null
          id?: string
          imagem?: string | null
          link_destino?: string | null
          prioridade?: number
          tipo_destaque: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao_curta?: string | null
          id?: string
          imagem?: string | null
          link_destino?: string | null
          prioridade?: number
          tipo_destaque?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_highlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_highlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          mentions: Json | null
          post_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mentions?: Json | null
          post_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mentions?: Json | null
          post_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_weekly_ranking: {
        Row: {
          business_id: string
          cliques: number
          created_at: string
          id: string
          interacoes: number
          ofertas_criadas: number
          pontos_movimentados: number
          posicao: number
          score: number
          semana_fim: string
          semana_inicio: string
          sorteios_ativos: number
        }
        Insert: {
          business_id: string
          cliques?: number
          created_at?: string
          id?: string
          interacoes?: number
          ofertas_criadas?: number
          pontos_movimentados?: number
          posicao: number
          score?: number
          semana_fim: string
          semana_inicio: string
          sorteios_ativos?: number
        }
        Update: {
          business_id?: string
          cliques?: number
          created_at?: string
          id?: string
          interacoes?: number
          ofertas_criadas?: number
          pontos_movimentados?: number
          posicao?: number
          score?: number
          semana_fim?: string
          semana_inicio?: string
          sorteios_ativos?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_weekly_ranking_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_weekly_ranking_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_alertas: {
        Row: {
          business_id: string
          created_at: string
          id: string
          lead_id: string
          tipo_alerta: string
          visualizado: boolean
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          lead_id: string
          tipo_alerta: string
          visualizado?: boolean
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          tipo_alerta?: string
          visualizado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "crm_alertas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_alertas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_alertas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          business_id: string
          created_at: string
          etiquetas: string[] | null
          id: string
          inativo: boolean
          observacoes: string | null
          origem: string
          recorrente: boolean
          score_engajamento: number
          status: string
          ultima_interacao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          etiquetas?: string[] | null
          id?: string
          inativo?: boolean
          observacoes?: string | null
          origem?: string
          recorrente?: boolean
          score_engajamento?: number
          status?: string
          ultima_interacao?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          etiquetas?: string[] | null
          id?: string
          inativo?: boolean
          observacoes?: string | null
          origem?: string
          recorrente?: boolean
          score_engajamento?: number
          status?: string
          ultima_interacao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      crowdfunding_campaigns: {
        Row: {
          beneficiario_id: string | null
          category: string
          comprovante_pagamento_url: string | null
          created_at: string
          creator_id: string
          current_points: number
          data_liberacao: string | null
          description: string
          end_date: string
          goal_points: number
          id: string
          image_url: string | null
          is_active: boolean
          is_verified: boolean
          multiplicador_patrocinio: number | null
          patrocinador_id: string | null
          start_date: string
          status_pagamento: string | null
          tipo_beneficiario: string | null
          title: string
          updated_at: string
          valor_liberado: number | null
          video_url: string | null
        }
        Insert: {
          beneficiario_id?: string | null
          category: string
          comprovante_pagamento_url?: string | null
          created_at?: string
          creator_id: string
          current_points?: number
          data_liberacao?: string | null
          description: string
          end_date: string
          goal_points: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_verified?: boolean
          multiplicador_patrocinio?: number | null
          patrocinador_id?: string | null
          start_date?: string
          status_pagamento?: string | null
          tipo_beneficiario?: string | null
          title: string
          updated_at?: string
          valor_liberado?: number | null
          video_url?: string | null
        }
        Update: {
          beneficiario_id?: string | null
          category?: string
          comprovante_pagamento_url?: string | null
          created_at?: string
          creator_id?: string
          current_points?: number
          data_liberacao?: string | null
          description?: string
          end_date?: string
          goal_points?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_verified?: boolean
          multiplicador_patrocinio?: number | null
          patrocinador_id?: string | null
          start_date?: string
          status_pagamento?: string | null
          tipo_beneficiario?: string | null
          title?: string
          updated_at?: string
          valor_liberado?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crowdfunding_campaigns_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios_verificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crowdfunding_campaigns_patrocinador_id_fkey"
            columns: ["patrocinador_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crowdfunding_campaigns_patrocinador_id_fkey"
            columns: ["patrocinador_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_mission_completions: {
        Row: {
          completed_at: string
          id: string
          mission_date: string
          mission_key: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          mission_date?: string
          mission_key: string
          points_awarded?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          mission_date?: string
          mission_key?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: []
      }
      donations_pix: {
        Row: {
          campaign_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          pix_key_snapshot: Json
          pontos_gerados: number
          status: string
          transaction_id_pix: string | null
          updated_at: string
          user_id: string
          user_type: string
          valor_convertido_pontos: number
          valor_fundo: number
          valor_total: number
        }
        Insert: {
          campaign_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          pix_key_snapshot?: Json
          pontos_gerados: number
          status?: string
          transaction_id_pix?: string | null
          updated_at?: string
          user_id: string
          user_type?: string
          valor_convertido_pontos: number
          valor_fundo: number
          valor_total: number
        }
        Update: {
          campaign_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          pix_key_snapshot?: Json
          pontos_gerados?: number
          status?: string
          transaction_id_pix?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
          valor_convertido_pontos?: number
          valor_fundo?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "donations_pix_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crowdfunding_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_funnel_sent: {
        Row: {
          error_message: string | null
          id: string
          sent_at: string
          status: string
          template_id: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          template_id: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_funnel_sent_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_funnel_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_funnel_templates: {
        Row: {
          created_at: string
          delay_days: number
          funnel_type: string
          id: string
          is_active: boolean
          message: string
          message_html: string | null
          step_order: number
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_days?: number
          funnel_type: string
          id?: string
          is_active?: boolean
          message: string
          message_html?: string | null
          step_order: number
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_days?: number
          funnel_type?: string
          id?: string
          is_active?: boolean
          message?: string
          message_html?: string | null
          step_order?: number
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_favorites_offer"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_follows_business"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_follows_business"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fundo_social: {
        Row: {
          created_at: string | null
          id: string
          percentual_receita: number
          saldo_disponivel: number
          saldo_reservado: number
          total_arrecadado: number
          total_liberado: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          percentual_receita?: number
          saldo_disponivel?: number
          saldo_reservado?: number
          total_arrecadado?: number
          total_liberado?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          percentual_receita?: number
          saldo_disponivel?: number
          saldo_reservado?: number
          total_arrecadado?: number
          total_liberado?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      fundo_social_movimentacoes: {
        Row: {
          campanha_id: string | null
          comprovante_url: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          origem: string | null
          origem_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          campanha_id?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          origem?: string | null
          origem_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          campanha_id?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          origem?: string | null
          origem_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fundo_social_movimentacoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "crowdfunding_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string | null
          id: string
          name: string
          normalized_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          normalized_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          normalized_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      manual_checkin_codes: {
        Row: {
          business_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          offer_id: string
          used: boolean
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          expires_at: string
          id?: string
          offer_id: string
          used?: boolean
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          offer_id?: string
          used?: boolean
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_checkin_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_checkin_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_checkin_codes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_recipients: {
        Row: {
          campaign_id: string
          channel: string
          created_at: string
          email: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          channel: string
          completed_at: string | null
          created_at: string
          created_by: string
          failed_count: number | null
          filters: Json | null
          id: string
          message: string
          message_html: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string | null
          target_audience: string
          title: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          channel: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message: string
          message_html?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          target_audience: string
          title: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          channel?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message?: string
          message_html?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          target_audience?: string
          title?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          sender_id: string
          sender_type: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          sender_id: string
          sender_type: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          related_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          related_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          related_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_ai_assets: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          format: string
          id: string
          image_url: string
          offer_id: string
          params: Json | null
          pdf_url: string | null
          template: string | null
          variation: number
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          format: string
          id?: string
          image_url: string
          offer_id: string
          params?: Json | null
          pdf_url?: string | null
          template?: string | null
          variation?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          format?: string
          id?: string
          image_url?: string
          offer_id?: string
          params?: Json | null
          pdf_url?: string | null
          template?: string | null
          variation?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_ai_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_ai_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_ai_assets_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_audit_log: {
        Row: {
          action: string
          business_id: string
          created_at: string
          id: string
          metadata: Json | null
          offer_data: Json | null
          offer_id: string
          performed_by: string
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          offer_data?: Json | null
          offer_id: string
          performed_by: string
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          offer_data?: Json | null
          offer_id?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_checkins: {
        Row: {
          business_id: string
          created_at: string
          id: string
          location_latitude: number | null
          location_longitude: number | null
          offer_id: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          location_latitude?: number | null
          location_longitude?: number | null
          offer_id: string
          points_awarded?: number
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          location_latitude?: number | null
          location_longitude?: number | null
          offer_id?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_checkins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_checkins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_checkins_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_interests: {
        Row: {
          created_at: string | null
          id: string
          interest_id: string
          offer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_id: string
          offer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_interests_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_likes: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_likes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_orders: {
        Row: {
          amount: number
          business_id: string
          canceled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          consumer_id: string
          consumer_phone: string | null
          created_at: string
          crm_lead_id: string | null
          id: string
          offer_id: string
          pix_key_snapshot: Json
          points_to_award: number
          status: string
          tx_code: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          canceled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          consumer_id: string
          consumer_phone?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          offer_id: string
          pix_key_snapshot?: Json
          points_to_award?: number
          status?: string
          tx_code: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          canceled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          consumer_id?: string
          consumer_phone?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          offer_id?: string
          pix_key_snapshot?: Json
          points_to_award?: number
          status?: string
          tx_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      offer_views: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_offer_views_offer"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          business_id: string
          category: string
          checkin_points: number
          created_at: string
          current_actions: number | null
          current_uses: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          discount_percentage: number | null
          discounted_price: number
          featured_at: string | null
          featured_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_delivery: boolean | null
          is_featured: boolean | null
          is_featured_recent: boolean | null
          is_paused_no_balance: boolean | null
          latitude: number
          likes_count: number | null
          longitude: number
          max_actions: number | null
          max_uses: number | null
          original_price: number
          points_per_action: number | null
          shares_count: number | null
          title: string
          total_points_consumed: number | null
          updated_at: string
          valid_until: string
          views_count: number | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          business_id: string
          category: string
          checkin_points?: number
          created_at?: string
          current_actions?: number | null
          current_uses?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          discounted_price: number
          featured_at?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_delivery?: boolean | null
          is_featured?: boolean | null
          is_featured_recent?: boolean | null
          is_paused_no_balance?: boolean | null
          latitude: number
          likes_count?: number | null
          longitude: number
          max_actions?: number | null
          max_uses?: number | null
          original_price: number
          points_per_action?: number | null
          shares_count?: number | null
          title: string
          total_points_consumed?: number | null
          updated_at?: string
          valid_until: string
          views_count?: number | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          business_id?: string
          category?: string
          checkin_points?: number
          created_at?: string
          current_actions?: number | null
          current_uses?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number
          featured_at?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_delivery?: boolean | null
          is_featured?: boolean | null
          is_featured_recent?: boolean | null
          is_paused_no_balance?: boolean | null
          latitude?: number
          likes_count?: number | null
          longitude?: number
          max_actions?: number | null
          max_uses?: number | null
          original_price?: number
          points_per_action?: number | null
          shares_count?: number | null
          title?: string
          total_points_consumed?: number | null
          updated_at?: string
          valid_until?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      patrocinio_pix: {
        Row: {
          advertiser_id: string
          business_id: string
          campaign_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          pix_key_snapshot: Json
          pontos_gerados: number
          status: string
          transaction_id_pix: string | null
          updated_at: string
          valor_beneficio: number
          valor_fundo: number
          valor_total: number
        }
        Insert: {
          advertiser_id: string
          business_id: string
          campaign_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          pix_key_snapshot?: Json
          pontos_gerados?: number
          status?: string
          transaction_id_pix?: string | null
          updated_at?: string
          valor_beneficio?: number
          valor_fundo?: number
          valor_total: number
        }
        Update: {
          advertiser_id?: string
          business_id?: string
          campaign_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          pix_key_snapshot?: Json
          pontos_gerados?: number
          status?: string
          transaction_id_pix?: string | null
          updated_at?: string
          valor_beneficio?: number
          valor_fundo?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "patrocinio_pix_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrocinio_pix_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrocinio_pix_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crowdfunding_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      patrocinios_vaquinha: {
        Row: {
          business_id: string
          campanha_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          multiplicador: number | null
          tipo: string
          updated_at: string | null
          valor_maximo: number | null
          valor_patrocinado: number | null
        }
        Insert: {
          business_id: string
          campanha_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          multiplicador?: number | null
          tipo: string
          updated_at?: string | null
          valor_maximo?: number | null
          valor_patrocinado?: number | null
        }
        Update: {
          business_id?: string
          campanha_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          multiplicador?: number | null
          tipo?: string
          updated_at?: string | null
          valor_maximo?: number | null
          valor_patrocinado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patrocinios_vaquinha_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrocinios_vaquinha_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrocinios_vaquinha_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "crowdfunding_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          api_key_encrypted: string | null
          config: Json | null
          created_at: string
          gateway_name: string
          id: string
          is_active: boolean
          is_primary: boolean
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          gateway_name: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          gateway_name?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          created_at: string
          event_type: string
          gateway: string
          id: string
          payload: Json | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          gateway: string
          id?: string
          payload?: Json | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          gateway?: string
          id?: string
          payload?: Json | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_sensitive_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      points_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          interests: string[] | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          state: string | null
          total_points: number | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          state?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
          user_type?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          interests?: string[] | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          state?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          business_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          is_used: boolean | null
          offer_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean | null
          offer_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
          offer_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_entries: {
        Row: {
          created_at: string
          entry_number: number
          id: string
          raffle_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_number: number
          id?: string
          raffle_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_number?: number
          id?: string
          raffle_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_entries_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          business_id: string
          created_at: string
          current_participants: number | null
          description: string | null
          draw_audit_log: Json | null
          draw_date: string | null
          draw_hash: string | null
          end_date: string
          entry_cost: number
          id: string
          image_url: string | null
          is_active: boolean | null
          max_participants: number | null
          prize: string
          start_date: string
          title: string
          total_tickets_at_draw: number | null
          winner_id: string | null
          winning_ticket_number: number | null
        }
        Insert: {
          business_id: string
          created_at?: string
          current_participants?: number | null
          description?: string | null
          draw_audit_log?: Json | null
          draw_date?: string | null
          draw_hash?: string | null
          end_date: string
          entry_cost?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_participants?: number | null
          prize: string
          start_date?: string
          title: string
          total_tickets_at_draw?: number | null
          winner_id?: string | null
          winning_ticket_number?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string
          current_participants?: number | null
          description?: string | null
          draw_audit_log?: Json | null
          draw_date?: string | null
          draw_hash?: string | null
          end_date?: string
          entry_cost?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_participants?: number | null
          prize?: string
          start_date?: string
          title?: string
          total_tickets_at_draw?: number | null
          winner_id?: string | null
          winning_ticket_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raffles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          business_id: string
          commission_amount: number
          commission_percentage: number
          created_at: string
          id: string
          payment_date: string | null
          period_end: string
          period_start: string
          referrer_id: string
          status: string
          subscription_amount: number
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          commission_amount: number
          commission_percentage: number
          created_at?: string
          id?: string
          payment_date?: string | null
          period_end: string
          period_start: string
          referrer_id: string
          status?: string
          subscription_amount: number
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          commission_amount?: number
          commission_percentage?: number
          created_at?: string
          id?: string
          payment_date?: string | null
          period_end?: string
          period_start?: string
          referrer_id?: string
          status?: string
          subscription_amount?: number
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "business_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          commission_percentage: number
          created_at: string
          id: string
          is_active: boolean | null
          subscription_plan_id: string
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          subscription_plan_id: string
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          subscription_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_settings_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_stats: {
        Row: {
          active_referrals: number | null
          created_at: string
          id: string
          last_commission_date: string | null
          total_commissions_earned: number | null
          total_commissions_paid: number | null
          total_commissions_pending: number | null
          total_referrals: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_referrals?: number | null
          created_at?: string
          id?: string
          last_commission_date?: string | null
          total_commissions_earned?: number | null
          total_commissions_paid?: number | null
          total_commissions_pending?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_referrals?: number | null
          created_at?: string
          id?: string
          last_commission_date?: string | null
          total_commissions_earned?: number | null
          total_commissions_paid?: number | null
          total_commissions_pending?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_tracking: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          referral_code_used: string | null
          referred_points_awarded: number | null
          referred_user_id: string | null
          referred_user_type: string | null
          referrer_id: string | null
          referrer_points_awarded: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          referral_code_used?: string | null
          referred_points_awarded?: number | null
          referred_user_id?: string | null
          referred_user_type?: string | null
          referrer_id?: string | null
          referrer_points_awarded?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          referral_code_used?: string | null
          referred_points_awarded?: number | null
          referred_user_id?: string | null
          referred_user_type?: string | null
          referrer_id?: string | null
          referrer_points_awarded?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_tracking_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tracking_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tracking_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tracking_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          id: string
          offer_id: string
          rating: number
          user_id: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          offer_id: string
          rating: number
          user_id: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          offer_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_banners: {
        Row: {
          business_id: string | null
          clicks_count: number
          created_at: string
          created_by: string | null
          cta_label: string | null
          ends_at: string | null
          external_link: string | null
          id: string
          image_url: string
          internal_link: string | null
          is_active: boolean
          priority: number
          starts_at: string
          subtitle: string | null
          target_category: string | null
          target_city: string | null
          target_neighborhood: string | null
          target_user_type: string | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          business_id?: string | null
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          ends_at?: string | null
          external_link?: string | null
          id?: string
          image_url: string
          internal_link?: string | null
          is_active?: boolean
          priority?: number
          starts_at?: string
          subtitle?: string | null
          target_category?: string | null
          target_city?: string | null
          target_neighborhood?: string | null
          target_user_type?: string | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          business_id?: string | null
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          ends_at?: string | null
          external_link?: string | null
          id?: string
          image_url?: string
          internal_link?: string | null
          is_active?: boolean
          priority?: number
          starts_at?: string
          subtitle?: string | null
          target_category?: string | null
          target_city?: string | null
          target_neighborhood?: string | null
          target_user_type?: string | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          checkout_url: string | null
          created_at: string
          features: Json
          id: string
          max_offers: number | null
          max_raffles: number | null
          max_views: number | null
          monthly_points_allocation: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          updated_at: string
        }
        Insert: {
          checkout_url?: string | null
          created_at?: string
          features?: Json
          id?: string
          max_offers?: number | null
          max_raffles?: number | null
          max_views?: number | null
          monthly_points_allocation?: number | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          updated_at?: string
        }
        Update: {
          checkout_url?: string | null
          created_at?: string
          features?: Json
          id?: string
          max_offers?: number | null
          max_raffles?: number | null
          max_views?: number | null
          monthly_points_allocation?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          business_id: string
          created_at: string
          description: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          expires_at: string | null
          gateway: string
          gateway_payment_url: string | null
          gateway_transaction_id: string | null
          id: string
          metadata: Json | null
          net_revenue: number | null
          paid_at: string | null
          payment_method: string
          pix_code: string | null
          pix_qr_code: string | null
          status: string
          subscription_id: string | null
          transaction_fee: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          expires_at?: string | null
          gateway: string
          gateway_payment_url?: string | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          net_revenue?: number | null
          paid_at?: string | null
          payment_method: string
          pix_code?: string | null
          pix_qr_code?: string | null
          status?: string
          subscription_id?: string | null
          transaction_fee?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          expires_at?: string | null
          gateway?: string
          gateway_payment_url?: string | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          net_revenue?: number | null
          paid_at?: string | null
          payment_method?: string
          pix_code?: string | null
          pix_qr_code?: string | null
          status?: string
          subscription_id?: string | null
          transaction_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "business_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          is_unlocked: boolean | null
          progress: number | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          is_unlocked?: boolean | null
          progress?: number | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          is_unlocked?: boolean | null
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          sender_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          sender_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "user_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chats: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          action_type: string
          business_id: string | null
          created_at: string
          description: string | null
          id: string
          offer_id: string | null
          points_earned: number
          user_id: string
        }
        Insert: {
          action_type: string
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          offer_id?: string | null
          points_earned: number
          user_id: string
        }
        Update: {
          action_type?: string
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          offer_id?: string | null
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_points_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_points_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_points_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_analytics: {
        Row: {
          average_points_per_checkin: number | null
          business_id: string
          created_at: string
          date: string
          id: string
          offer_id: string | null
          peak_hour: number | null
          total_points_awarded: number
          total_validations: number
          unique_users: number
          updated_at: string
        }
        Insert: {
          average_points_per_checkin?: number | null
          business_id: string
          created_at?: string
          date?: string
          id?: string
          offer_id?: string | null
          peak_hour?: number | null
          total_points_awarded?: number
          total_validations?: number
          unique_users?: number
          updated_at?: string
        }
        Update: {
          average_points_per_checkin?: number | null
          business_id?: string
          created_at?: string
          date?: string
          id?: string
          offer_id?: string | null
          peak_hour?: number | null
          total_points_awarded?: number
          total_validations?: number
          unique_users?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_analytics_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      zzz_probe: {
        Row: {
          id: number | null
        }
        Insert: {
          id?: number | null
        }
        Update: {
          id?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      businesses_public: {
        Row: {
          address: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          followers_count: number | null
          id: string | null
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          interests: string[] | null
          state: string | null
          total_points: number | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          interests?: string[] | null
          state?: string | null
          total_points?: number | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          interests?: string[] | null
          state?: string | null
          total_points?: number | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_migration_sql: { Args: { sql_text: string }; Returns: undefined }
      award_special_badge: {
        Args: { badge_name_param: string; user_id_param: string }
        Returns: undefined
      }
      award_special_badge_internal: {
        Args: { badge_name_param: string; user_id_param: string }
        Returns: undefined
      }
      calcular_valor_equivalente: { Args: { pontos: number }; Returns: number }
      calculate_referral_commission: {
        Args: {
          business_id_param: string
          plan_id_param: string
          subscription_amount_param: number
        }
        Returns: number
      }
      can_validate_offer_checkin: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: boolean
      }
      check_admin_status: {
        Args: { check_user_id: string }
        Returns: {
          is_active: boolean
          role: string
        }[]
      }
      check_and_award_badges: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      check_and_award_badges_internal: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      check_and_award_business_badges: {
        Args: { business_id_param: string }
        Returns: undefined
      }
      check_and_award_business_badges_internal: {
        Args: { business_id_param: string }
        Returns: undefined
      }
      complete_daily_mission: { Args: { p_mission_key: string }; Returns: Json }
      conduct_raffle: { Args: { raffle_id_param: string }; Returns: Json }
      conduct_raffle_internal: {
        Args: { raffle_id_param: string }
        Returns: Json
      }
      confirm_delivery_checkin: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: Json
      }
      confirm_offer_order: {
        Args: { p_ip?: string; p_order_id: string; p_user_agent?: string }
        Returns: Json
      }
      contribute_to_campaign: {
        Args: {
          p_amount: number
          p_campaign_id: string
          p_contributor_id: string
          p_is_anonymous?: boolean
          p_message?: string
        }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_notification_internal: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_offer_pix_order: {
        Args: {
          p_amount: number
          p_consumer_phone?: string
          p_offer_id: string
          p_points_to_award: number
        }
        Returns: {
          amount: number
          business_id: string
          canceled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          consumer_id: string
          consumer_phone: string | null
          created_at: string
          crm_lead_id: string | null
          id: string
          offer_id: string
          pix_key_snapshot: Json
          points_to_award: number
          status: string
          tx_code: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "offer_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_platform_pix_donation: {
        Args: { p_campaign_id?: string; p_valor_total: number }
        Returns: {
          campaign_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          pix_key_snapshot: Json
          pontos_gerados: number
          status: string
          transaction_id_pix: string | null
          updated_at: string
          user_id: string
          user_type: string
          valor_convertido_pontos: number
          valor_fundo: number
          valor_total: number
        }
        SetofOptions: {
          from: "*"
          to: "donations_pix"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_platform_pix_sponsorship: {
        Args: {
          p_business_id: string
          p_campaign_id?: string
          p_valor_total: number
        }
        Returns: {
          advertiser_id: string
          business_id: string
          campaign_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          pix_key_snapshot: Json
          pontos_gerados: number
          status: string
          transaction_id_pix: string | null
          updated_at: string
          valor_beneficio: number
          valor_fundo: number
          valor_total: number
        }
        SetofOptions: {
          from: "*"
          to: "patrocinio_pix"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      debit_business_points: {
        Args: {
          p_business_id: string
          p_offer_id: string
          p_points: number
          p_user_id: string
        }
        Returns: Json
      }
      debit_business_points_internal: {
        Args: {
          p_business_id: string
          p_offer_id: string
          p_points: number
          p_user_id: string
        }
        Returns: Json
      }
      debit_business_wallet: {
        Args: {
          p_amount: number
          p_business_id: string
          p_description?: string
          p_offer_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      debit_business_wallet_internal: {
        Args: {
          p_amount: number
          p_business_id: string
          p_description?: string
          p_offer_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      expire_advantages: { Args: never; Returns: number }
      expire_pending_payments: { Args: never; Returns: undefined }
      generate_business_slug: {
        Args: { business_id: string; business_name: string }
        Returns: string
      }
      get_active_platform_pix_key: { Args: never; Returns: Json }
      get_ai_art_usage_this_month: {
        Args: { p_business_id: string }
        Returns: number
      }
      get_ai_text_improvement_usage_this_month: {
        Args: { p_business_id: string }
        Returns: number
      }
      get_business_customer_profiles: {
        Args: { p_business_id: string; p_user_ids: string[] }
        Returns: {
          avatar_url: string
          city: string
          full_name: string
          phone: string
          state: string
          user_id: string
        }[]
      }
      get_business_wallet_balance: {
        Args: { p_business_id: string }
        Returns: Json
      }
      get_current_user_admin_status: { Args: never; Returns: Json }
      get_date_from_timestamp: { Args: { ts: string }; Returns: string }
      get_offer_favorite_count: {
        Args: { offer_uuid: string }
        Returns: number
      }
      get_offer_like_count: { Args: { offer_uuid: string }; Returns: number }
      get_offers_by_interest_compatibility: {
        Args: {
          max_distance_km?: number
          result_limit?: number
          user_interests: string[]
          user_lat?: number
          user_lon?: number
        }
        Returns: {
          business_id: string
          compatibility_score: number
          distance_km: number
          matching_interests: number
          offer_id: string
          title: string
        }[]
      }
      get_post_stats: {
        Args: { post_id_param: string }
        Returns: {
          comments_count: number
          likes_count: number
        }[]
      }
      get_public_business_info: {
        Args: { business_id_param: string }
        Returns: {
          address: string
          average_rating: number
          category: string
          cover_image_url: string
          created_at: string
          description: string
          followers_count: number
          id: string
          is_active: boolean
          latitude: number
          logo_url: string
          longitude: number
          name: string
          total_reviews: number
          updated_at: string
        }[]
      }
      get_raffle_participants: {
        Args: { raffle_id_param: string }
        Returns: {
          avatar_url: string
          created_at: string
          entry_number: number
          full_name: string
          id: string
          number_of_entries: number
          phone: string
          raffle_id: string
          user_id: string
        }[]
      }
      get_rarity_credits: { Args: { rarity: string }; Returns: number }
      increment_banner_click: {
        Args: { banner_id: string }
        Returns: undefined
      }
      increment_banner_view: { Args: { banner_id: string }; Returns: undefined }
      initialize_business_wallet: {
        Args: { p_business_id: string }
        Returns: Json
      }
      initialize_business_wallet_internal: {
        Args: { p_business_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      liberar_pagamento_vaquinha: {
        Args: { p_campanha_id: string; p_comprovante_url?: string }
        Returns: Json
      }
      log_offer_action: {
        Args: {
          p_action: string
          p_business_id: string
          p_metadata?: Json
          p_offer_data?: Json
          p_offer_id: string
        }
        Returns: string
      }
      normalize_interest: { Args: { input: string }; Returns: string }
      process_automatic_raffle_participation: {
        Args: {
          p_action_type: string
          p_business_id?: string
          p_trigger_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_automatic_raffle_participation_internal: {
        Args: {
          p_action_type: string
          p_business_id?: string
          p_trigger_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_payment_confirmation: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      process_qr_validation:
        | {
            Args: {
              p_business_id: string
              p_location_lat?: number
              p_location_lng?: number
              p_offer_id: string
              p_qr_code: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              location_lat?: number
              location_lng?: number
              qr_data_param: Json
              user_id_param: string
            }
            Returns: Json
          }
      processar_meta_atingida: {
        Args: { p_campanha_id: string }
        Returns: Json
      }
      read_ledger: {
        Args: never
        Returns: {
          name: string
          version: string
        }[]
      }
      redeem_advantage: {
        Args: {
          p_advantage_type: string
          p_business_id: string
          p_credits_cost: number
          p_duration_days: number
          p_metadata?: Json
          p_offer_id?: string
        }
        Returns: Json
      }
      remover_patrocinador_campanha: {
        Args: { p_business_id: string; p_campanha_id: string }
        Returns: Json
      }
      reset_business_wallet_monthly: {
        Args: { p_business_id: string }
        Returns: Json
      }
      search_interests: {
        Args: { result_limit?: number; search_term: string }
        Returns: {
          id: string
          name: string
          normalized_name: string
          relevance_score: number
          usage_count: number
        }[]
      }
      set_offer_interests: {
        Args: { p_interests: string[]; p_offer_id: string }
        Returns: undefined
      }
      sync_achievement_credits: {
        Args: { p_business_id: string }
        Returns: Json
      }
      transfer_points: {
        Args: {
          p_amount: number
          p_message?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      update_user_points: {
        Args: { points_to_add: number; user_id: string }
        Returns: undefined
      }
      update_user_points_internal: {
        Args: { points_to_add: number; user_id: string }
        Returns: undefined
      }
      upsert_interest: { Args: { interest_name: string }; Returns: string }
      user_owns_business:
        | { Args: { p_a: string; p_b: string }; Returns: boolean }
        | { Args: { p_business_id: string }; Returns: boolean }
      user_owns_raffle_business: {
        Args: { p_raffle_id: string }
        Returns: boolean
      }
      validate_checkin:
        | {
            Args: {
              p_business_id: string
              p_location_lat?: number
              p_location_lng?: number
              p_offer_id: string
              p_qr_code: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_lat?: number
              p_lng?: number
              p_qr_data: Json
              p_user_id: string
            }
            Returns: Json
          }
      validate_manual_checkin_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      validate_referral_code: { Args: { p_code: string }; Returns: Json }
      vincular_patrocinador_campanha: {
        Args: {
          p_business_id: string
          p_campanha_id: string
          p_multiplicador?: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
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
