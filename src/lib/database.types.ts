// Generated from the Supabase schema (MCP generate_typescript_types). Regenerate after every migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          alert: string | null
          client_id: string
          conversion_event: string | null
          currency: string
          external_id: string
          id: string
          kind: string
          label: string | null
          last_sync_error: string | null
          last_synced_at: string | null
          notes: string | null
          platform: string
          roas_floor: number | null
        }
        Insert: {
          alert?: string | null
          client_id: string
          conversion_event?: string | null
          currency?: string
          external_id: string
          id?: string
          kind?: string
          label?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          notes?: string | null
          platform: string
          roas_floor?: number | null
        }
        Update: {
          alert?: string | null
          client_id?: string
          conversion_event?: string | null
          currency?: string
          external_id?: string
          id?: string
          kind?: string
          label?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          notes?: string | null
          platform?: string
          roas_floor?: number | null
        }
        Relationships: []
      }
      ad_daily: {
        Row: {
          account_id: string
          clicks: number
          conv_value: number
          conversions: number
          date: string
          impressions: number
          spend: number
        }
        Insert: {
          account_id: string
          clicks?: number
          conv_value?: number
          conversions?: number
          date: string
          impressions?: number
          spend?: number
        }
        Update: {
          account_id?: string
          clicks?: number
          conv_value?: number
          conversions?: number
          date?: string
          impressions?: number
          spend?: number
        }
        Relationships: []
      }
      clients: {
        Row: {
          budget: string | null
          created_at: string
          currency: string
          id: string
          key_metric: string | null
          name: string
          notes: string
          parent_id: string | null
          priority: string | null
          reporting: string | null
          services: string[]
          slug: string
          status: string
          website: string | null
        }
        Insert: {
          budget?: string | null
          created_at?: string
          currency?: string
          id?: string
          key_metric?: string | null
          name: string
          notes?: string
          parent_id?: string | null
          priority?: string | null
          reporting?: string | null
          services?: string[]
          slug: string
          status?: string
          website?: string | null
        }
        Update: {
          budget?: string | null
          created_at?: string
          currency?: string
          id?: string
          key_metric?: string | null
          name?: string
          notes?: string
          parent_id?: string | null
          priority?: string | null
          reporting?: string | null
          services?: string[]
          slug?: string
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          plan_id: string | null
          task_id: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          plan_id?: string | null
          task_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          plan_id?: string | null
          task_id?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          client_id: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          preferred_channel: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          role?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budgets: Json
          client_id: string
          created_at: string
          id: string
          month: string
          notes: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budgets?: Json
          client_id: string
          created_at?: string
          id?: string
          month: string
          notes?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budgets?: Json
          client_id?: string
          created_at?: string
          id?: string
          month?: string
          notes?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      recurring: {
        Row: {
          active: boolean
          assignee_id: string | null
          cadence: string
          client_id: string
          created_at: string
          day: number | null
          id: string
          lead_days: number
          next_due: string
          template: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          assignee_id?: string | null
          cadence: string
          client_id: string
          created_at?: string
          day?: number | null
          id?: string
          lead_days?: number
          next_due: string
          template?: string
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          assignee_id?: string | null
          cadence?: string
          client_id?: string
          created_at?: string
          day?: number | null
          id?: string
          lead_days?: number
          next_due?: string
          template?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      scope_quotas: {
        Row: {
          client_id: string
          monthly_quota: number
          type: string
        }
        Insert: {
          client_id: string
          monthly_quota: number
          type: string
        }
        Update: {
          client_id?: string
          monthly_quota?: number
          type?: string
        }
        Relationships: []
      }
      task_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: number
          task_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          task_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          task_id?: string
          to_status?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          ads: string
          assignee_id: string | null
          brief_url: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          from_client: boolean
          id: string
          plan_id: string | null
          priority: string
          recurring_id: string | null
          ref: number
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          ads?: string
          assignee_id?: string | null
          brief_url?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          from_client?: boolean
          id?: string
          plan_id?: string | null
          priority?: string
          recurring_id?: string | null
          ref?: never
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          ads?: string
          assignee_id?: string | null
          brief_url?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          from_client?: boolean
          id?: string
          plan_id?: string | null
          priority?: string
          recurring_id?: string | null
          ref?: never
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          client_id: string
          created_at: string
          date: string
          hours: number
          id: string
          note: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          hours: number
          id?: string
          note?: string | null
          task_id?: string | null
          user_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          hours?: number
          id?: string
          note?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      timers: {
        Row: {
          started_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          started_at?: string
          task_id: string
          user_id?: string
        }
        Update: {
          started_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      conditions: {
        Row: {
          account_id: string
          client_id: string
          platform: string
          alert: string | null
          roas_floor: number | null
          y_spend: number | null
          y_conv: number | null
          base_conv: number | null
          y_metric: number | null
          base_metric: number | null
          change: number | null
          flagged: boolean
        }
        Relationships: []
      }
      alerts: {
        Row: {
          account_id: string | null
          alert: string | null
          base_conv: number | null
          base_metric: number | null
          change: number | null
          client_id: string | null
          platform: string | null
          y_conv: number | null
          y_metric: number | null
          y_spend: number | null
        }
        Relationships: []
      }
      plan_pacing: {
        Row: {
          budget: number | null
          data_through: string | null
          plan_id: string | null
          platform: string | null
          projected: number | null
          spend_mtd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      alerts_on: {
        Args: { on_day: string }
        Returns: {
          account_id: string
          alert: string
          base_conv: number
          base_metric: number
          change: number
          client_id: string
          platform: string
          y_conv: number
          y_metric: number
          y_spend: number
        }[]
      }
      check_ingest_secret: { Args: { candidate: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never
