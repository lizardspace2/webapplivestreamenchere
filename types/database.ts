export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bids: {
        Row: {
          id: string
          room: string
          bidder: string
          amount: number
          inserted_at: string
          user_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room: string
          bidder: string
          amount: number | string
          inserted_at?: string
          user_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room?: string
          bidder?: string
          amount?: number | string
          inserted_at?: string
          user_email?: string | null
          created_at?: string
        }
      }
      auction_rooms: {
        Row: {
          id: string
          name: string
          description: string | null
          starting_price: number
          min_increment: number
          status: 'active' | 'paused' | 'ended'
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          starting_price?: number | string
          min_increment?: number | string
          status?: 'active' | 'paused' | 'ended'
          ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          starting_price?: number | string
          min_increment?: number | string
          status?: 'active' | 'paused' | 'ended'
          ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

