export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          email: string | null
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          email?: string | null
          points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          email?: string | null
          points?: number
          created_at?: string
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          item_id: string
          item_title: string | null
          item_url: string | null
          image_url: string | null
          price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          item_title?: string | null
          item_url?: string | null
          image_url?: string | null
          price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          item_title?: string | null
          item_url?: string | null
          image_url?: string | null
          price?: number | null
          created_at?: string
        }
      }
      swipe_history: {
        Row: {
          id: string
          user_id: string
          item_id: string
          direction: 'like' | 'skip'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          direction: 'like' | 'skip'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          direction?: 'like' | 'skip'
          created_at?: string
        }
      }
      price_history: {
        Row: {
          id: string
          item_id: string
          price: number
          list_price: number | null
          discount_rate: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          item_id: string
          price: number
          list_price?: number | null
          discount_rate?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          price?: number
          list_price?: number | null
          discount_rate?: number | null
          recorded_at?: string
        }
      }
      sale_queue: {
        Row: {
          id: string
          item_id: string
          item_title: string
          affiliate_url: string
          image_url: string | null
          price: number
          original_price: number | null
          discount_rate: number
          posted_at: string | null
          status: 'pending' | 'posted' | 'skipped'
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          item_title: string
          affiliate_url: string
          image_url?: string | null
          price: number
          original_price?: number | null
          discount_rate: number
          posted_at?: string | null
          status?: 'pending' | 'posted' | 'skipped'
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          item_title?: string
          affiliate_url?: string
          image_url?: string | null
          price?: number
          original_price?: number | null
          discount_rate?: number
          posted_at?: string | null
          status?: 'pending' | 'posted' | 'skipped'
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_type: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_type: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_type?: string
          earned_at?: string
        }
      }
      notification_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          keys: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          keys?: Json
          created_at?: string
        }
      }
      series_progress: {
        Row: {
          id: string
          user_id: string
          series_id: number
          item_id: string
          status: 'read' | 'unread'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          series_id: number
          item_id: string
          status?: 'read' | 'unread'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          series_id?: number
          item_id?: string
          status?: 'read' | 'unread'
          created_at?: string
        }
      }
      followed_series: {
        Row: {
          id: string
          user_id: string
          series_id: number
          series_name: string
          latest_item_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          series_id: number
          series_name: string
          latest_item_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          series_id?: number
          series_name?: string
          latest_item_id?: string | null
          created_at?: string
        }
      }
      view_history: {
        Row: {
          id: string
          user_id: string
          item_id: string
          item_title: string | null
          affiliate_url: string | null
          image_url: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          item_title?: string | null
          affiliate_url?: string | null
          image_url?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          item_title?: string | null
          affiliate_url?: string | null
          image_url?: string | null
          viewed_at?: string
        }
      }
      user_points: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: string
          created_at?: string
        }
      }
      login_streaks: {
        Row: {
          user_id: string
          current_streak: number
          last_login_date: string
          updated_at: string
        }
        Insert: {
          user_id: string
          current_streak?: number
          last_login_date?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          current_streak?: number
          last_login_date?: string
          updated_at?: string
        }
      }
      notification_queue: {
        Row: {
          id: string
          user_id: string | null
          type: 'new_release' | 'price_drop' | 'badge'
          payload: Json
          sent_at: string | null
          status: 'pending' | 'sent' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: 'new_release' | 'price_drop' | 'badge'
          payload?: Json
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: 'new_release' | 'price_drop' | 'badge'
          payload?: Json
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed'
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
