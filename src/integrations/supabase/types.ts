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
      app_settings: {
        Row: {
          asaas_api_key: string | null
          asaas_connected: boolean
          brand_cnpj: string | null
          brand_logo_url: string | null
          brand_name: string
          commission_capture_fixed: number
          commission_goal_bonus: number
          commission_sale_percent: number
          contact_city: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_responsible: string | null
          contact_state: string | null
          id: number
          limit_max_leads_month: number
          limit_max_promoters: number
          payment_api_key: string | null
          payment_gateway_connected: boolean
          payment_pix_key: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          primary_color: string
          smartgps_base_url: string | null
          smartgps_connected: boolean
          smartgps_token: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          whatsapp_connected: boolean
          whatsapp_phone_id: string | null
          whatsapp_token: string | null
          whatsapp_webhook_url: string | null
        }
        Insert: {
          asaas_api_key?: string | null
          asaas_connected?: boolean
          brand_cnpj?: string | null
          brand_logo_url?: string | null
          brand_name?: string
          commission_capture_fixed?: number
          commission_goal_bonus?: number
          commission_sale_percent?: number
          contact_city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_responsible?: string | null
          contact_state?: string | null
          id?: number
          limit_max_leads_month?: number
          limit_max_promoters?: number
          payment_api_key?: string | null
          payment_gateway_connected?: boolean
          payment_pix_key?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string
          smartgps_base_url?: string | null
          smartgps_connected?: boolean
          smartgps_token?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_connected?: boolean
          whatsapp_phone_id?: string | null
          whatsapp_token?: string | null
          whatsapp_webhook_url?: string | null
        }
        Update: {
          asaas_api_key?: string | null
          asaas_connected?: boolean
          brand_cnpj?: string | null
          brand_logo_url?: string | null
          brand_name?: string
          commission_capture_fixed?: number
          commission_goal_bonus?: number
          commission_sale_percent?: number
          contact_city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_responsible?: string | null
          contact_state?: string | null
          id?: number
          limit_max_leads_month?: number
          limit_max_promoters?: number
          payment_api_key?: string | null
          payment_gateway_connected?: boolean
          payment_pix_key?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string
          smartgps_base_url?: string | null
          smartgps_connected?: boolean
          smartgps_token?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_connected?: boolean
          whatsapp_phone_id?: string | null
          whatsapp_token?: string | null
          whatsapp_webhook_url?: string | null
        }
        Relationships: []
      }
      checkins: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          latitude: number | null
          location_name: string
          longitude: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          latitude?: number | null
          location_name: string
          longitude?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          event_type: string
          id: string
          linked_to: string | null
          responsible_id: string
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          linked_to?: string | null
          responsible_id: string
          start_time: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          linked_to?: string | null
          responsible_id?: string
          start_time?: string
          title?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          captured_at: string | null
          city: string | null
          company_cnpj: string | null
          created_at: string
          fleet_size: number | null
          id: string
          kind: Database["public"]["Enums"]["lead_kind"]
          latitude: number | null
          location_accuracy: number | null
          longitude: number | null
          name: string
          origem: string | null
          pain: string | null
          phone: string | null
          phone_normalized: string | null
          photo_url: string | null
          plate_verified: boolean
          plate_verified_at: string | null
          plate_verified_by: string | null
          profession: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string
          value: number | null
          vehicle_model: string | null
          vehicle_plate: string | null
          whatsapp_engaged: boolean | null
        }
        Insert: {
          captured_at?: string | null
          city?: string | null
          company_cnpj?: string | null
          created_at?: string
          fleet_size?: number | null
          id?: string
          kind: Database["public"]["Enums"]["lead_kind"]
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          name: string
          origem?: string | null
          pain?: string | null
          phone?: string | null
          phone_normalized?: string | null
          photo_url?: string | null
          plate_verified?: boolean
          plate_verified_at?: string | null
          plate_verified_by?: string | null
          profession?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id: string
          value?: number | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          whatsapp_engaged?: boolean | null
        }
        Update: {
          captured_at?: string | null
          city?: string | null
          company_cnpj?: string | null
          created_at?: string
          fleet_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["lead_kind"]
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          name?: string
          origem?: string | null
          pain?: string | null
          phone?: string | null
          phone_normalized?: string | null
          photo_url?: string | null
          plate_verified?: boolean
          plate_verified_at?: string | null
          plate_verified_by?: string | null
          profession?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string
          value?: number | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          whatsapp_engaged?: boolean | null
        }
        Relationships: []
      }
      payslips: {
        Row: {
          created_at: string
          created_by: string | null
          deductions: number
          gross_amount: number
          id: string
          issued_at: string | null
          net_amount: number
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          reference_month: string
          status: Database["public"]["Enums"]["payslip_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deductions?: number
          gross_amount?: number
          id?: string
          issued_at?: string | null
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["payslip_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deductions?: number
          gross_amount?: number
          id?: string
          issued_at?: string | null
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["payslip_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdv_capture_rate_limit: {
        Row: {
          created_at: string
          id: number
          ip: string
        }
        Insert: {
          created_at?: string
          id?: number
          ip: string
        }
        Update: {
          created_at?: string
          id?: number
          ip?: string
        }
        Relationships: []
      }
      pdv_leads: {
        Row: {
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          ip: string | null
          lead_id: string | null
          note: string | null
          pdv_id: string
          reward_amount: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          lead_id?: string | null
          note?: string | null
          pdv_id: string
          reward_amount?: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          lead_id?: string | null
          note?: string | null
          pdv_id?: string
          reward_amount?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_leads_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pdvs"
            referencedColumns: ["id"]
          },
        ]
      }
      pdvs: {
        Row: {
          active: boolean
          city: string | null
          cnpj: string | null
          created_at: string
          id: string
          last_lead_at: string | null
          leads_count: number
          manager_name: string | null
          name: string
          reward_per_lead: number
          short_code: string
          state: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          city?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          last_lead_at?: string | null
          leads_count?: number
          manager_name?: string | null
          name: string
          reward_per_lead?: number
          short_code: string
          state?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          city?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          last_lead_at?: string | null
          leads_count?: number
          manager_name?: string | null
          name?: string
          reward_per_lead?: number
          short_code?: string
          state?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          adhesion_fee: number
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          commission_percent: number
          created_at: string
          created_by: string | null
          description: string | null
          franchise: string | null
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["product_kind"]
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          adhesion_fee?: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          franchise?: string | null
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["product_kind"]
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          adhesion_fee?: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          franchise?: string | null
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["product_kind"]
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_location: string | null
          daily_goal: number
          full_name: string | null
          id: string
          kyc_doc_address_url: string | null
          kyc_doc_id_back_url: string | null
          kyc_doc_id_front_url: string | null
          kyc_doc_selfie_url: string | null
          kyc_notes: string | null
          kyc_reviewed_at: string | null
          kyc_reviewed_by: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at: string | null
          level: Database["public"]["Enums"]["user_level"]
          monthly_earnings: number
          onboarding_step: number
          role: string | null
          streak_days: number
          updated_at: string
          whatsapp_verified: boolean | null
        }
        Insert: {
          active?: boolean
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_location?: string | null
          daily_goal?: number
          full_name?: string | null
          id: string
          kyc_doc_address_url?: string | null
          kyc_doc_id_back_url?: string | null
          kyc_doc_id_front_url?: string | null
          kyc_doc_selfie_url?: string | null
          kyc_notes?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          level?: Database["public"]["Enums"]["user_level"]
          monthly_earnings?: number
          onboarding_step?: number
          role?: string | null
          streak_days?: number
          updated_at?: string
          whatsapp_verified?: boolean | null
        }
        Update: {
          active?: boolean
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_location?: string | null
          daily_goal?: number
          full_name?: string | null
          id?: string
          kyc_doc_address_url?: string | null
          kyc_doc_id_back_url?: string | null
          kyc_doc_id_front_url?: string | null
          kyc_doc_selfie_url?: string | null
          kyc_notes?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          level?: Database["public"]["Enums"]["user_level"]
          monthly_earnings?: number
          onboarding_step?: number
          role?: string | null
          streak_days?: number
          updated_at?: string
          whatsapp_verified?: boolean | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          deadline: string
          id: string
          linked_to: string | null
          notes: string | null
          priority: string
          responsible_id: string
          status: string | null
          task_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          deadline: string
          id?: string
          linked_to?: string | null
          notes?: string | null
          priority: string
          responsible_id: string
          status?: string | null
          task_type: string
          title: string
        }
        Update: {
          created_at?: string | null
          deadline?: string
          id?: string
          linked_to?: string | null
          notes?: string | null
          priority?: string
          responsible_id?: string
          status?: string | null
          task_type?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          address: string | null
          created_at: string
          id: string
          place_name: string
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"]
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          place_name: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"]
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          place_name?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["wallet_tx_kind"]
          lead_id: string | null
          metadata: Json | null
          source: Database["public"]["Enums"]["wallet_tx_source"]
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["wallet_tx_kind"]
          lead_id?: string | null
          metadata?: Json | null
          source?: Database["public"]["Enums"]["wallet_tx_source"]
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["wallet_tx_kind"]
          lead_id?: string | null
          metadata?: Json | null
          source?: Database["public"]["Enums"]["wallet_tx_source"]
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_withdrawals: {
        Row: {
          amount: number
          created_at: string
          holder_name: string
          id: string
          notes: string | null
          pix_key: string
          pix_key_kind: Database["public"]["Enums"]["pix_key_kind"]
          processed_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          holder_name: string
          id?: string
          notes?: string | null
          pix_key: string
          pix_key_kind: Database["public"]["Enums"]["pix_key_kind"]
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          holder_name?: string
          id?: string
          notes?: string | null
          pix_key?: string
          pix_key_kind?: Database["public"]["Enums"]["pix_key_kind"]
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          direction: string
          id: string
          lead_id: string | null
          message_type: string
          meta_message_id: string | null
          phone: string
          phone_normalized: string
          raw_payload: Json | null
          sent_at: string
          status: string | null
          text: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          lead_id?: string | null
          message_type?: string
          meta_message_id?: string | null
          phone: string
          phone_normalized: string
          raw_payload?: Json | null
          sent_at?: string
          status?: string | null
          text?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message_type?: string
          meta_message_id?: string | null
          phone?: string
          phone_normalized?: string
          raw_payload?: Json | null
          sent_at?: string
          status?: string | null
          text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_logs: {
        Row: {
          action: string
          created_at: string
          direction: string
          error: string | null
          http_status: number | null
          id: string
          message: string | null
          payload: Json | null
          phone: string | null
          response: Json | null
          status: string
          zapi_message_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          direction: string
          error?: string | null
          http_status?: number | null
          id?: string
          message?: string | null
          payload?: Json | null
          phone?: string | null
          response?: Json | null
          status: string
          zapi_message_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          direction?: string
          error?: string | null
          http_status?: number | null
          id?: string
          message?: string | null
          payload?: Json | null
          phone?: string | null
          response?: Json | null
          status?: string
          zapi_message_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      capture_pdv_lead: {
        Args: {
          _contact_name: string
          _contact_phone?: string
          _note?: string
          _short_code: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_branding_settings: {
        Args: never
        Returns: {
          brand_cnpj: string
          brand_logo_url: string
          brand_name: string
          contact_city: string
          contact_email: string
          contact_phone: string
          contact_responsible: string
          contact_state: string
          primary_color: string
        }[]
      }
      get_pdv_public: {
        Args: { _short_code: string }
        Returns: {
          active: boolean
          city: string
          id: string
          name: string
          state: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_rh: { Args: never; Returns: boolean }
      is_visualizador: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      promoter_shift_detail: {
        Args: { _day?: string; _user_id: string }
        Returns: {
          afternoon_count: number
          morning_count: number
          total_all: number
          total_today: number
        }[]
      }
      promoters_daily_shifts: {
        Args: { _day?: string }
        Returns: {
          afternoon_count: number
          full_name: string
          last_checkin_at: string
          last_lat: number
          last_lead_at: string
          last_lng: number
          last_location_name: string
          morning_count: number
          total_today: number
          user_id: string
        }[]
      }
      promoters_ranking: {
        Args: { _month_start?: string }
        Returns: {
          earnings: number
          full_name: string
          id: string
          leads: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      wallet_balance: {
        Args: { _user_id: string }
        Returns: {
          available: number
          pending: number
          total_earned: number
          withdrawn: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "promoter" | "rh" | "visualizador"
      approval_status: "pendente" | "aprovado" | "rejeitado"
      billing_cycle: "once" | "monthly" | "annual"
      kyc_status: "nao_enviado" | "em_analise" | "aprovado" | "rejeitado"
      lead_kind: "b2c" | "b2b"
      lead_status:
        | "coletado"
        | "contatado"
        | "respondido"
        | "vendido"
        | "prospectado"
        | "negociando"
        | "fechado"
      payslip_status: "rascunho" | "emitido" | "pago"
      pix_key_kind: "cpf" | "cnpj" | "email" | "phone" | "random"
      plan_tier: "free" | "pro" | "enterprise"
      product_kind: "hardware" | "assinatura" | "pacote"
      user_level: "BRONZE" | "PRATA" | "OURO"
      visit_status: "pendente" | "em_andamento" | "concluida"
      wallet_tx_kind:
        | "credit"
        | "debit"
        | "withdraw_hold"
        | "withdraw_paid"
        | "withdraw_refund"
        | "bonus"
        | "adjustment"
      wallet_tx_source:
        | "lead_b2c"
        | "lead_b2b"
        | "manual"
        | "withdrawal"
        | "mission"
      withdrawal_status:
        | "pendente"
        | "aprovado"
        | "pago"
        | "rejeitado"
        | "cancelado"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "promoter", "rh", "visualizador"],
      approval_status: ["pendente", "aprovado", "rejeitado"],
      billing_cycle: ["once", "monthly", "annual"],
      kyc_status: ["nao_enviado", "em_analise", "aprovado", "rejeitado"],
      lead_kind: ["b2c", "b2b"],
      lead_status: [
        "coletado",
        "contatado",
        "respondido",
        "vendido",
        "prospectado",
        "negociando",
        "fechado",
      ],
      payslip_status: ["rascunho", "emitido", "pago"],
      pix_key_kind: ["cpf", "cnpj", "email", "phone", "random"],
      plan_tier: ["free", "pro", "enterprise"],
      product_kind: ["hardware", "assinatura", "pacote"],
      user_level: ["BRONZE", "PRATA", "OURO"],
      visit_status: ["pendente", "em_andamento", "concluida"],
      wallet_tx_kind: [
        "credit",
        "debit",
        "withdraw_hold",
        "withdraw_paid",
        "withdraw_refund",
        "bonus",
        "adjustment",
      ],
      wallet_tx_source: [
        "lead_b2c",
        "lead_b2b",
        "manual",
        "withdrawal",
        "mission",
      ],
      withdrawal_status: [
        "pendente",
        "aprovado",
        "pago",
        "rejeitado",
        "cancelado",
      ],
    },
  },
} as const
