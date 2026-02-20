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
          bio: string | null
          website_url: string | null
          location: string | null
          role: 'admin' | 'user' | 'guest' | 'moderator'
          email_verified: string | null
          last_login_at: string | null
          signature: string | null
          notification_settings: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website_url?: string | null
          location?: string | null
          role?: 'admin' | 'user' | 'guest' | 'moderator'
          email_verified?: string | null
          last_login_at?: string | null
          signature?: string | null
          notification_settings?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website_url?: string | null
          location?: string | null
          role?: 'admin' | 'user' | 'guest' | 'moderator'
          email_verified?: string | null
          last_login_at?: string | null
          signature?: string | null
          notification_settings?: Json
          metadata?: Json
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
          content: string | null
          icon: string | null
          banner_url: string | null
          config: Json
          skin: string
          list_order: string
          sort_order: string
          view_count: number
          post_count: number
          comment_count: number
          is_notice: boolean
          is_hidden: boolean
          is_locked: boolean
          is_secret: boolean
          admin_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          content?: string | null
          icon?: string | null
          banner_url?: string | null
          config?: Json
          skin?: string
          list_order?: string
          sort_order?: string
          view_count?: number
          post_count?: number
          comment_count?: number
          is_notice?: boolean
          is_hidden?: boolean
          is_locked?: boolean
          is_secret?: boolean
          admin_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          content?: string | null
          icon?: string | null
          banner_url?: string | null
          config?: Json
          skin?: string
          list_order?: string
          sort_order?: string
          view_count?: number
          post_count?: number
          comment_count?: number
          is_notice?: boolean
          is_hidden?: boolean
          is_locked?: boolean
          is_secret?: boolean
          admin_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          board_id: string
          category_id: string | null
          author_id: string | null
          author_name: string | null
          author_password: string | null
          title: string
          content: string
          content_html: string | null
          excerpt: string | null
          status: 'draft' | 'published' | 'trash' | 'temp' | 'embossed' | 'secret'
          visibility: 'all' | 'member' | 'admin' | 'only_me'
          is_notice: boolean
          is_secret: boolean
          is_locked: boolean
          is_blind: boolean
          is_hidden: boolean
          allow_comment: boolean
          allow_trackback: boolean
          notify_message: boolean
          ip_address: string | null
          tags: string[]
          metadata: Json
          view_count: number
          vote_count: number
          blamed_count: number
          comment_count: number
          trackback_count: number
          attached_count: number
          readed_count: number
          voted_count: number
          comment_notified: boolean
          last_commenter_id: string | null
          last_commented_at: string | null
          published_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          category_id?: string | null
          author_id?: string | null
          author_name?: string | null
          author_password?: string | null
          title: string
          content: string
          content_html?: string | null
          excerpt?: string | null
          status?: 'draft' | 'published' | 'trash' | 'temp' | 'embossed' | 'secret'
          visibility?: 'all' | 'member' | 'admin' | 'only_me'
          is_notice?: boolean
          is_secret?: boolean
          is_locked?: boolean
          is_blind?: boolean
          is_hidden?: boolean
          allow_comment?: boolean
          allow_trackback?: boolean
          notify_message?: boolean
          ip_address?: string | null
          tags?: string[]
          metadata?: Json
          view_count?: number
          vote_count?: number
          blamed_count?: number
          comment_count?: number
          trackback_count?: number
          attached_count?: number
          readed_count?: number
          voted_count?: number
          comment_notified?: boolean
          last_commenter_id?: string | null
          last_commented_at?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          category_id?: string | null
          author_id?: string | null
          author_name?: string | null
          author_password?: string | null
          title?: string
          content?: string
          content_html?: string | null
          excerpt?: string | null
          status?: 'draft' | 'published' | 'trash' | 'temp' | 'embossed' | 'secret'
          visibility?: 'all' | 'member' | 'admin' | 'only_me'
          is_notice?: boolean
          is_secret?: boolean
          is_locked?: boolean
          is_blind?: boolean
          is_hidden?: boolean
          allow_comment?: boolean
          allow_trackback?: boolean
          notify_message?: boolean
          ip_address?: string | null
          tags?: string[]
          metadata?: Json
          view_count?: number
          vote_count?: number
          blamed_count?: number
          comment_count?: number
          trackback_count?: number
          attached_count?: number
          readed_count?: number
          voted_count?: number
          comment_notified?: boolean
          last_commenter_id?: string | null
          last_commented_at?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          parent_id: string | null
          author_id: string | null
          author_name: string | null
          author_password: string | null
          content: string
          content_html: string | null
          status: 'visible' | 'hidden' | 'trash' | 'secret'
          is_secret: boolean
          is_blind: boolean
          ip_address: string | null
          vote_count: number
          blamed_count: number
          depth: number
          path: string
          order_index: number
          like_count: number
          dislike_count: number
          report_count: number
          metadata: Json
          notified_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          post_id: string
          parent_id?: string | null
          author_id?: string | null
          author_name?: string | null
          author_password?: string | null
          content: string
          content_html?: string | null
          status?: 'visible' | 'hidden' | 'trash' | 'secret'
          is_secret?: boolean
          is_blind?: boolean
          ip_address?: string | null
          vote_count?: number
          blamed_count?: number
          depth?: number
          path?: string
          order_index?: number
          like_count?: number
          dislike_count?: number
          report_count?: number
          metadata?: Json
          notified_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          parent_id?: string | null
          author_id?: string | null
          author_name?: string | null
          author_password?: string | null
          content?: string
          content_html?: string | null
          status?: 'visible' | 'hidden' | 'trash' | 'secret'
          is_secret?: boolean
          is_blind?: boolean
          ip_address?: string | null
          vote_count?: number
          blamed_count?: number
          depth?: number
          path?: string
          order_index?: number
          like_count?: number
          dislike_count?: number
          report_count?: number
          metadata?: Json
          notified_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          board_id: string
          parent_id: string | null
          name: string
          slug: string
          description: string | null
          icon: string | null
          color: string | null
          order_index: number
          depth: number
          path: string
          post_count: number
          is_hidden: boolean
          is_locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_id: string
          parent_id?: string | null
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          color?: string | null
          order_index?: number
          depth?: number
          path?: string
          post_count?: number
          is_hidden?: boolean
          is_locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          parent_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          order_index?: number
          depth?: number
          path?: string
          post_count?: number
          is_hidden?: boolean
          is_locked?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      installation_status: {
        Row: {
          id: string
          status: 'pending' | 'in_progress' | 'completed' | 'failed'
          current_step: number
          step_data: Json
          error_message: string | null
          error_details: Json
          site_name: string | null
          admin_email: string | null
          admin_user_id: string | null
          timezone: string
          language: string
          supabase_url: string | null
          supabase_anon_key: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'failed'
          current_step?: number
          step_data?: Json
          error_message?: string | null
          error_details?: Json
          site_name?: string | null
          admin_email?: string | null
          admin_user_id?: string | null
          timezone?: string
          language?: string
          supabase_url?: string | null
          supabase_anon_key?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'failed'
          current_step?: number
          step_data?: Json
          error_message?: string | null
          error_details?: Json
          site_name?: string | null
          admin_email?: string | null
          admin_user_id?: string | null
          timezone?: string
          language?: string
          supabase_url?: string | null
          supabase_anon_key?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      site_config: {
        Row: {
          id: string
          key: string
          value: Json
          category: 'general' | 'security' | 'email' | 'seo' | 'appearance' | 'features' | 'integration'
          description: string | null
          is_public: boolean
          is_editable: boolean
          validation_rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          category?: 'general' | 'security' | 'email' | 'seo' | 'appearance' | 'features' | 'integration'
          description?: string | null
          is_public?: boolean
          is_editable?: boolean
          validation_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          category?: 'general' | 'security' | 'email' | 'seo' | 'appearance' | 'features' | 'integration'
          description?: string | null
          is_public?: boolean
          is_editable?: boolean
          validation_rules?: Json
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          module: string
          key: string
          value: Json
          description: string | null
          is_public: boolean
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module: string
          key: string
          value: Json
          description?: string | null
          is_public?: boolean
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module?: string
          key?: string
          value?: Json
          description?: string | null
          is_public?: boolean
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      is_installation_complete: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_current_installation_step: {
        Args: Record<string, never>
        Returns: number
      }
      initialize_site_config: {
        Args: {
          p_site_name: string
          p_site_description: string
          p_site_language: string
          p_site_timezone: string
          p_admin_email: string
        }
        Returns: boolean
      }
    }
  }
}

// Type exports for convenience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Board = Database['public']['Tables']['boards']['Row']
export type BoardInsert = Database['public']['Tables']['boards']['Insert']
export type BoardUpdate = Database['public']['Tables']['boards']['Update']

export type Post = Database['public']['Tables']['posts']['Row']
export type PostInsert = Database['public']['Tables']['posts']['Insert']
export type PostUpdate = Database['public']['Tables']['posts']['Update']

export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentInsert = Database['public']['Tables']['comments']['Insert']
export type CommentUpdate = Database['public']['Tables']['comments']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type InstallationStatus = Database['public']['Tables']['installation_status']['Row']
export type InstallationStatusInsert = Database['public']['Tables']['installation_status']['Insert']
export type InstallationStatusUpdate = Database['public']['Tables']['installation_status']['Update']

export type SiteConfig = Database['public']['Tables']['site_config']['Row']
export type SiteConfigInsert = Database['public']['Tables']['site_config']['Insert']
export type SiteConfigUpdate = Database['public']['Tables']['site_config']['Update']

export type Settings = Database['public']['Tables']['settings']['Row']
export type SettingsInsert = Database['public']['Tables']['settings']['Insert']
export type SettingsUpdate = Database['public']['Tables']['settings']['Update']
