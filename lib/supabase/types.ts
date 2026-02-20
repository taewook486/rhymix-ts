// Database type definitions for Supabase
// These types should be generated using: npx supabase gen types typescript --linked

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
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          role: 'admin' | 'user' | 'guest'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user' | 'guest'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'user' | 'guest'
          created_at?: string
          updated_at?: string
        }
      }
      boards: {
        Row: {
          id: string
          slug: string
          title: string
          description: string | null
          config: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          board_id: string
          title: string
          content: string
          author_id: string | null
          status: 'draft' | 'published' | 'trash'
          category_id: string | null
          view_count: number
          created_at: string
          updated_at: string
          published_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          title: string
          content: string
          author_id?: string | null
          status?: 'draft' | 'published' | 'trash'
          category_id?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          title?: string
          content?: string
          author_id?: string | null
          status?: 'draft' | 'published' | 'trash'
          category_id?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
          deleted_at?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          parent_id: string | null
          author_id: string | null
          content: string
          status: 'visible' | 'hidden' | 'trash'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          parent_id?: string | null
          author_id?: string | null
          content: string
          status?: 'visible' | 'hidden' | 'trash'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          parent_id?: string | null
          author_id?: string | null
          content?: string
          status?: 'visible' | 'hidden' | 'trash'
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          board_id: string
          parent_id: string | null
          name: string
          slug: string
          order_index: number
        }
        Insert: {
          id?: string
          board_id: string
          parent_id?: string | null
          name: string
          slug: string
          order_index?: number
        }
        Update: {
          id?: string
          board_id?: string
          parent_id?: string | null
          name?: string
          slug?: string
          order_index?: number
        }
      }
    }
  }
}
