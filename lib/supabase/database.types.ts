export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          module: string | null
          severity: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string | null
          severity?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string | null
          severity?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      boards: {
        Row: {
          admin_id: string | null
          comment_count: number | null
          config: Json | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_hidden: boolean | null
          is_locked: boolean | null
          is_notice: boolean | null
          is_secret: boolean | null
          list_order: number | null
          post_count: number | null
          skin: string | null
          slug: string
          sort_order: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          admin_id?: string | null
          comment_count?: number | null
          config?: Json | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_hidden?: boolean | null
          is_locked?: boolean | null
          is_notice?: boolean | null
          is_secret?: boolean | null
          list_order?: number | null
          post_count?: number | null
          skin?: string | null
          slug: string
          sort_order?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          admin_id?: string | null
          comment_count?: number | null
          config?: Json | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_hidden?: boolean | null
          is_locked?: boolean | null
          is_notice?: boolean | null
          is_secret?: boolean | null
          list_order?: number | null
          post_count?: number | null
          skin?: string | null
          slug?: string
          sort_order?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boards_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          board_id: string | null
          color: string | null
          created_at: string | null
          depth: number | null
          description: string | null
          icon: string | null
          id: string
          is_hidden: boolean | null
          is_locked: boolean | null
          name: string
          order_index: number | null
          parent_id: string | null
          path: string | null
          post_count: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          board_id?: string | null
          color?: string | null
          created_at?: string | null
          depth?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_hidden?: boolean | null
          is_locked?: boolean | null
          name: string
          order_index?: number | null
          parent_id?: string | null
          path?: string | null
          post_count?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          board_id?: string | null
          color?: string | null
          created_at?: string | null
          depth?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_hidden?: boolean | null
          is_locked?: boolean | null
          name?: string
          order_index?: number | null
          parent_id?: string | null
          path?: string | null
          post_count?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          document_id: string | null
          id: string
          is_secret: boolean | null
          like_count: number | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_secret?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_secret?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          author_id: string | null
          author_name: string | null
          change_summary: string | null
          change_type: string | null
          content: string
          content_html: string | null
          created_at: string | null
          document_id: string | null
          excerpt: string | null
          id: string
          metadata: Json | null
          title: string
          version: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          change_summary?: string | null
          change_type?: string | null
          content: string
          content_html?: string | null
          created_at?: string | null
          document_id?: string | null
          excerpt?: string | null
          id?: string
          metadata?: Json | null
          title: string
          version: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          change_summary?: string | null
          change_type?: string | null
          content?: string
          content_html?: string | null
          created_at?: string | null
          document_id?: string | null
          excerpt?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          version?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          author_id: string | null
          board_id: string | null
          comment_count: number | null
          content: string
          created_at: string | null
          id: string
          is_notice: boolean | null
          is_secret: boolean | null
          like_count: number | null
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          board_id?: string | null
          comment_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_notice?: boolean | null
          is_secret?: boolean | null
          like_count?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          board_id?: string | null
          comment_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_notice?: boolean | null
          is_secret?: boolean | null
          like_count?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_autosave: {
        Row: {
          content: string
          content_html: string | null
          excerpt: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          saved_at: string | null
          target_id: string | null
          target_type: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          content_html?: string | null
          excerpt?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          saved_at?: string | null
          target_id?: string | null
          target_type: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          content_html?: string | null
          excerpt?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          saved_at?: string | null
          target_id?: string | null
          target_type?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      editor_settings: {
        Row: {
          color_scheme: string | null
          created_at: string | null
          editor_height: number | null
          editor_skin: string | null
          enabled_tools: string[] | null
          font_family: string | null
          font_size: number | null
          hide_toolbar: boolean | null
          id: string
          line_height: number | null
          toolbar_set: string | null
          updated_at: string | null
        }
        Insert: {
          color_scheme?: string | null
          created_at?: string | null
          editor_height?: number | null
          editor_skin?: string | null
          enabled_tools?: string[] | null
          font_family?: string | null
          font_size?: number | null
          hide_toolbar?: boolean | null
          id?: string
          line_height?: number | null
          toolbar_set?: string | null
          updated_at?: string | null
        }
        Update: {
          color_scheme?: string | null
          created_at?: string | null
          editor_height?: number | null
          editor_skin?: string | null
          enabled_tools?: string[] | null
          font_family?: string | null
          font_size?: number | null
          hide_toolbar?: boolean | null
          id?: string
          line_height?: number | null
          toolbar_set?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string | null
          id: string
          mime_type: string
          name: string
          original_name: string
          path: string
          size: number
          uploader_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mime_type: string
          name: string
          original_name: string
          path: string
          size: number
          uploader_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mime_type?: string
          name?: string
          original_name?: string
          path?: string
          size?: number
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_permissions: {
        Row: {
          group_id: string
          permission_id: string
        }
        Insert: {
          group_id: string
          permission_id: string
        }
        Update: {
          group_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
        }
        Relationships: []
      }
      installation_status: {
        Row: {
          admin_email: string | null
          admin_user_id: string | null
          completed_at: string | null
          config: Json | null
          created_at: string | null
          current_step: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          installed_at: string | null
          is_installed: boolean | null
          language: string | null
          site_name: string | null
          started_at: string | null
          status: string | null
          step_data: Json | null
          supabase_anon_key: string | null
          supabase_url: string | null
          timezone: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_user_id?: string | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          current_step?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          installed_at?: string | null
          is_installed?: boolean | null
          language?: string | null
          site_name?: string | null
          started_at?: string | null
          status?: string | null
          step_data?: Json | null
          supabase_anon_key?: string | null
          supabase_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_user_id?: string | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          current_step?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          installed_at?: string | null
          is_installed?: boolean | null
          language?: string | null
          site_name?: string | null
          started_at?: string | null
          status?: string | null
          step_data?: Json | null
          supabase_anon_key?: string | null
          supabase_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_status_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      layouts: {
        Row: {
          code: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          title: string
        }
        Insert: {
          code?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          title: string
        }
        Update: {
          code?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          title?: string
        }
        Relationships: []
      }
      level_group_mapping: {
        Row: {
          created_at: string | null
          group_sync_mode: string | null
          id: string
          point_decrease_mode: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_sync_mode?: string | null
          id?: string
          point_decrease_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_sync_mode?: string | null
          id?: string
          point_decrease_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      level_groups: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          level: number
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          level: number
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          level?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          id: string
          is_active: boolean | null
          is_new_window: boolean | null
          is_visible: boolean | null
          menu_id: string | null
          order_index: number | null
          parent_id: string | null
          required_role: string | null
          title: string
          type: string | null
          url: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          is_new_window?: boolean | null
          is_visible?: boolean | null
          menu_id?: string | null
          order_index?: number | null
          parent_id?: string | null
          required_role?: string | null
          title: string
          type?: string | null
          url?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          is_new_window?: boolean | null
          is_visible?: boolean | null
          menu_id?: string | null
          order_index?: number | null
          parent_id?: string | null
          required_role?: string | null
          title?: string
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          config: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          location: string
          name: string
          order_index: number | null
          title: string
        }
        Insert: {
          config?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location: string
          name: string
          order_index?: number | null
          title: string
        }
        Update: {
          config?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string
          name?: string
          order_index?: number | null
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_deleted_by_receiver: boolean | null
          is_deleted_by_sender: boolean | null
          is_read: boolean | null
          receiver_id: string | null
          sender_id: string | null
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_deleted_by_receiver?: boolean | null
          is_deleted_by_sender?: boolean | null
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_deleted_by_receiver?: boolean | null
          is_deleted_by_sender?: boolean | null
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      point_logs: {
        Row: {
          action: string
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          point: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          action: string
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          point: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          action?: string
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          point?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_rules: {
        Row: {
          action: string
          created_at: string | null
          daily_limit: number | null
          description: string | null
          except_admin: boolean | null
          except_notice: boolean | null
          id: string
          is_active: boolean | null
          name: string
          per_content_limit: number | null
          point: number | null
          revert_on_delete: boolean | null
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          except_admin?: boolean | null
          except_notice?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          per_content_limit?: number | null
          point?: number | null
          revert_on_delete?: boolean | null
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          except_admin?: boolean | null
          except_notice?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          per_content_limit?: number | null
          point?: number | null
          revert_on_delete?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      point_settings: {
        Row: {
          created_at: string | null
          disable_download_on_low_point: boolean | null
          disable_read_on_low_point: boolean | null
          id: string
          is_enabled: boolean | null
          level_icon_path: string | null
          level_icon_type: string | null
          max_level: number | null
          min_point_for_download: number | null
          min_point_for_read: number | null
          point_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disable_download_on_low_point?: boolean | null
          disable_read_on_low_point?: boolean | null
          id?: string
          is_enabled?: boolean | null
          level_icon_path?: string | null
          level_icon_type?: string | null
          max_level?: number | null
          min_point_for_download?: number | null
          min_point_for_read?: number | null
          point_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disable_download_on_low_point?: boolean | null
          disable_read_on_low_point?: boolean | null
          id?: string
          is_enabled?: boolean | null
          level_icon_path?: string | null
          level_icon_type?: string | null
          max_level?: number | null
          min_point_for_download?: number | null
          min_point_for_read?: number | null
          point_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      points: {
        Row: {
          created_at: string | null
          id: string
          point: number
          reason: string
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          point: number
          reason: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          point?: number
          reason?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      poll_items: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          order_index: number | null
          poll_id: string | null
          title: string
          vote_count: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          poll_id?: string | null
          title: string
          vote_count?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          poll_id?: string | null
          title?: string
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_items_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_logs: {
        Row: {
          id: string
          ip_address: string | null
          poll_id: string | null
          poll_item_id: string | null
          user_id: string | null
          voted_at: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          poll_id?: string | null
          poll_item_id?: string | null
          user_id?: string | null
          voted_at?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          poll_id?: string | null
          poll_item_id?: string | null
          user_id?: string | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_logs_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_logs_poll_item_id_fkey"
            columns: ["poll_item_id"]
            isOneToOne: false
            referencedRelation: "poll_items"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_choices: number | null
          poll_type: string | null
          show_results: string | null
          stop_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_choices?: number | null
          poll_type?: string | null
          show_results?: string | null
          stop_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_choices?: number | null
          poll_type?: string | null
          show_results?: string | null
          stop_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          allow_comment: boolean | null
          allow_trackback: boolean | null
          attached_count: number | null
          author_id: string | null
          author_name: string | null
          author_password: string | null
          blamed_count: number | null
          board_id: string | null
          category_id: string | null
          comment_count: number | null
          comment_notified: boolean | null
          content: string
          content_html: string | null
          created_at: string | null
          deleted_at: string | null
          excerpt: string | null
          id: string
          ip_address: string | null
          is_blind: boolean | null
          is_hidden: boolean | null
          is_locked: boolean | null
          is_notice: boolean | null
          is_secret: boolean | null
          last_commented_at: string | null
          last_commenter_id: string | null
          metadata: Json | null
          notify_message: boolean | null
          published_at: string | null
          readed_count: number | null
          search_vector: unknown
          status: string | null
          tags: string[] | null
          title: string
          trackback_count: number | null
          updated_at: string | null
          view_count: number | null
          visibility: string | null
          vote_count: number | null
          voted_count: number | null
        }
        Insert: {
          allow_comment?: boolean | null
          allow_trackback?: boolean | null
          attached_count?: number | null
          author_id?: string | null
          author_name?: string | null
          author_password?: string | null
          blamed_count?: number | null
          board_id?: string | null
          category_id?: string | null
          comment_count?: number | null
          comment_notified?: boolean | null
          content: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          ip_address?: string | null
          is_blind?: boolean | null
          is_hidden?: boolean | null
          is_locked?: boolean | null
          is_notice?: boolean | null
          is_secret?: boolean | null
          last_commented_at?: string | null
          last_commenter_id?: string | null
          metadata?: Json | null
          notify_message?: boolean | null
          published_at?: string | null
          readed_count?: number | null
          search_vector?: unknown
          status?: string | null
          tags?: string[] | null
          title: string
          trackback_count?: number | null
          updated_at?: string | null
          view_count?: number | null
          visibility?: string | null
          vote_count?: number | null
          voted_count?: number | null
        }
        Update: {
          allow_comment?: boolean | null
          allow_trackback?: boolean | null
          attached_count?: number | null
          author_id?: string | null
          author_name?: string | null
          author_password?: string | null
          blamed_count?: number | null
          board_id?: string | null
          category_id?: string | null
          comment_count?: number | null
          comment_notified?: boolean | null
          content?: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          ip_address?: string | null
          is_blind?: boolean | null
          is_hidden?: boolean | null
          is_locked?: boolean | null
          is_notice?: boolean | null
          is_secret?: boolean | null
          last_commented_at?: string | null
          last_commenter_id?: string | null
          metadata?: Json | null
          notify_message?: boolean | null
          published_at?: string | null
          readed_count?: number | null
          search_vector?: unknown
          status?: string | null
          tags?: string[] | null
          title?: string
          trackback_count?: number | null
          updated_at?: string | null
          view_count?: number | null
          visibility?: string | null
          vote_count?: number | null
          voted_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string
          email_verified: string | null
          id: string
          last_login_at: string | null
          level: number | null
          location: string | null
          metadata: Json | null
          notification_settings: Json | null
          point: number | null
          role: string | null
          signature: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          email_verified?: string | null
          id: string
          last_login_at?: string | null
          level?: number | null
          location?: string | null
          metadata?: Json | null
          notification_settings?: Json | null
          point?: number | null
          role?: string | null
          signature?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          email_verified?: string | null
          id?: string
          last_login_at?: string | null
          level?: number | null
          location?: string | null
          metadata?: Json | null
          notification_settings?: Json | null
          point?: number | null
          role?: string | null
          signature?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      scrap_folders: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          order_index: number | null
          parent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          order_index?: number | null
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          order_index?: number | null
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrap_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "scrap_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      scraps: {
        Row: {
          created_at: string | null
          excerpt: string | null
          folder_id: string | null
          id: string
          is_favorite: boolean | null
          notes: string | null
          tags: string[] | null
          target_id: string
          target_type: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          excerpt?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          notes?: string | null
          tags?: string[] | null
          target_id: string
          target_type: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          excerpt?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean | null
          notes?: string | null
          tags?: string[] | null
          target_id?: string
          target_type?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraps_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "scrap_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      security_settings: {
        Row: {
          admin_allowed_ip: string | null
          admin_denied_ip: string | null
          autologin_lifetime: number | null
          autologin_refresh: boolean | null
          check_csrf_token: boolean | null
          created_at: string | null
          id: string
          mediafilter_classes: string | null
          mediafilter_whitelist: string | null
          robot_user_agents: string | null
          updated_at: string | null
          use_cookies_ssl: boolean | null
          use_httponly: boolean | null
          use_nofollow: boolean | null
          use_samesite: string | null
          use_session_ssl: boolean | null
          x_content_type_options: string | null
          x_frame_options: string | null
        }
        Insert: {
          admin_allowed_ip?: string | null
          admin_denied_ip?: string | null
          autologin_lifetime?: number | null
          autologin_refresh?: boolean | null
          check_csrf_token?: boolean | null
          created_at?: string | null
          id?: string
          mediafilter_classes?: string | null
          mediafilter_whitelist?: string | null
          robot_user_agents?: string | null
          updated_at?: string | null
          use_cookies_ssl?: boolean | null
          use_httponly?: boolean | null
          use_nofollow?: boolean | null
          use_samesite?: string | null
          use_session_ssl?: boolean | null
          x_content_type_options?: string | null
          x_frame_options?: string | null
        }
        Update: {
          admin_allowed_ip?: string | null
          admin_denied_ip?: string | null
          autologin_lifetime?: number | null
          autologin_refresh?: boolean | null
          check_csrf_token?: boolean | null
          created_at?: string | null
          id?: string
          mediafilter_classes?: string | null
          mediafilter_whitelist?: string | null
          robot_user_agents?: string | null
          updated_at?: string | null
          use_cookies_ssl?: boolean | null
          use_httponly?: boolean | null
          use_nofollow?: boolean | null
          use_samesite?: string | null
          use_session_ssl?: boolean | null
          x_content_type_options?: string | null
          x_frame_options?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_system: boolean | null
          key: string
          module: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          key: string
          module: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          key?: string
          module?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      site_config: {
        Row: {
          category: string
          description: string | null
          is_editable: boolean | null
          is_public: boolean | null
          key: string
          value: Json
        }
        Insert: {
          category: string
          description?: string | null
          is_editable?: boolean | null
          is_public?: boolean | null
          key: string
          value: Json
        }
        Update: {
          category?: string
          description?: string | null
          is_editable?: boolean | null
          is_public?: boolean | null
          key?: string
          value?: Json
        }
        Relationships: []
      }
      site_modules: {
        Row: {
          config: Json | null
          description: string | null
          id: string
          installed_at: string | null
          is_active: boolean | null
          is_core: boolean | null
          name: string
          title: string
          version: string | null
        }
        Insert: {
          config?: Json | null
          description?: string | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          is_core?: boolean | null
          name: string
          title: string
          version?: string | null
        }
        Update: {
          config?: Json | null
          description?: string | null
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          is_core?: boolean | null
          name?: string
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      site_themes: {
        Row: {
          author: string | null
          author_url: string | null
          config: Json | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_responsive: boolean | null
          name: string
          preview_image: string | null
          screenshot_url: string | null
          supports_dark_mode: boolean | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          author?: string | null
          author_url?: string | null
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_responsive?: boolean | null
          name: string
          preview_image?: string | null
          screenshot_url?: string | null
          supports_dark_mode?: boolean | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          author?: string | null
          author_url?: string | null
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_responsive?: boolean | null
          name?: string
          preview_image?: string | null
          screenshot_url?: string | null
          supports_dark_mode?: boolean | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      site_widgets: {
        Row: {
          config: Json | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_visible: boolean | null
          name: string
          order_index: number | null
          position: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_visible?: boolean | null
          name: string
          order_index?: number | null
          position: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_visible?: boolean | null
          name?: string
          order_index?: number | null
          position?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          count: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          key: string
          lang_code: string
          namespace: string | null
          plural: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          key: string
          lang_code: string
          namespace?: string | null
          plural?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          key?: string
          lang_code?: string
          namespace?: string | null
          plural?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      user_groups: {
        Row: {
          added_at: string | null
          added_by: string | null
          created_at: string | null
          expires_at: string | null
          group_id: string | null
          id: string
          is_leader: boolean | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_leader?: boolean | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_leader?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          target_id: string
          target_type: string
          user_id: string | null
          vote_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          target_id: string
          target_type: string
          user_id?: string | null
          vote_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          target_id?: string
          target_type?: string
          user_id?: string | null
          vote_type?: string | null
        }
        Relationships: []
      }
      widgets: {
        Row: {
          code: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          title: string
        }
        Insert: {
          code?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          title: string
        }
        Update: {
          code?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_autosaves: { Args: never; Returns: undefined }
      decrement_board_comment_count: {
        Args: { board_uuid: string }
        Returns: undefined
      }
      decrement_board_post_count: {
        Args: { board_uuid: string }
        Returns: undefined
      }
      decrement_category_post_count: {
        Args: { category_uuid: string }
        Returns: undefined
      }
      decrement_vote_count: {
        Args: { count_field?: string; row_id: string; table_name: string }
        Returns: undefined
      }
      get_current_installation_step: { Args: never; Returns: number }
      get_user_groups: {
        Args: { user_uuid: string }
        Returns: {
          group_id: string
          group_name: string
          group_slug: string
          is_leader: boolean
        }[]
      }
      get_user_points: { Args: { user_uuid: string }; Returns: number }
      increment_board_comment_count: {
        Args: { board_uuid: string }
        Returns: undefined
      }
      increment_board_post_count: {
        Args: { board_uuid: string }
        Returns: undefined
      }
      increment_category_post_count: {
        Args: { category_uuid: string }
        Returns: undefined
      }
      increment_page_view_count: { Args: { page_id: string }; Returns: number }
      increment_view_count: {
        Args: { row_id: string; table_name: string }
        Returns: undefined
      }
      increment_vote_count: {
        Args: { count_field?: string; row_id: string; table_name: string }
        Returns: undefined
      }
      initialize_site_config: {
        Args: {
          p_admin_email?: string
          p_site_description?: string
          p_site_language?: string
          p_site_name: string
          p_site_timezone?: string
        }
        Returns: boolean
      }
      is_installation_complete: { Args: never; Returns: boolean }
      is_seeding_complete: { Args: never; Returns: boolean }
      log_activity: {
        Args: {
          action_text: string
          description_text: string
          ip_addr: string
          metadata_json: Json
          module_text: string
          severity_text: string
          target_type_text: string
          target_uuid: string
          user_agent_text: string
          user_uuid: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_has_permission: {
        Args: { permission_slug: string; user_uuid: string }
        Returns: boolean
      }
      verify_initial_seed: {
        Args: never
        Returns: {
          actual_count: number
          expected_count: number
          status: string
          table_name: string
        }[]
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

// Export individual table types for easier importing
export type UUID = string

// Core table types
export type Menu = DefaultSchema["Tables"]["menus"]
export type MenuItem = DefaultSchema["Tables"]["menu_items"]
export type Category = DefaultSchema["Tables"]["categories"]
export type Board = DefaultSchema["Tables"]["boards"]
export type Post = DefaultSchema["Tables"]["posts"]
export type Notification = DefaultSchema["Tables"]["notifications"]
export type NotificationInsert = DefaultSchema["Tables"]["notifications"]["Insert"]
export type NotificationSettings = Json

// Additional useful types
export type Profile = DefaultSchema["Tables"]["profiles"]
export type Setting = DefaultSchema["Tables"]["settings"]
export type Layout = DefaultSchema["Tables"]["layouts"]
export type PointRule = DefaultSchema["Tables"]["point_rules"]
export type PointLog = DefaultSchema["Tables"]["point_logs"]
export type ActivityLog = DefaultSchema["Tables"]["activity_log"]
export type Comment = DefaultSchema["Tables"]["comments"]
export type CommentInsert = DefaultSchema["Tables"]["comments"]["Insert"]
export type CommentUpdate = DefaultSchema["Tables"]["comments"]["Update"]
export type CommentStatus = string // Add this if it's an enum

// Message types (from messages table)
export type Message = DefaultSchema["Tables"]["messages"]
export type MessageInsert = DefaultSchema["Tables"]["messages"]["Insert"]
export type MessageUpdate = DefaultSchema["Tables"]["messages"]["Update"]

// Extended types with relations
export type MessageWithRelations = Message & {
  receiver?: Profile | null
  sender?: Profile | null
}

export type CommentWithAuthor = Comment & {
  post_id: string
  author_name: string
  status: string
  vote_count: number
  depth: number
}

export type PostWithRelations = Post & {
  board_id: string
  comments: CommentWithAuthor[]
}

export type NotificationWithMeta = Notification & {
  is_read?: boolean
}

// List item types
export type PostListItem = Post & {
  board_title?: string
  category_name?: string
  author_name?: string
}

export type MessageListFilters = {
  sender_id?: string
  receiver_id?: string
  is_read?: boolean
  created_after?: string
  created_before?: string
  limit?: number
  offset?: number
}

export type MessageBlock = {
  id: string
  message_id: string
  content: string
  order_index: number
  created_at: string
  updated_at: string
}

export type MessageBlockInsert = Omit<MessageBlock, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type MessageBlockWithRelations = MessageBlock & {
  message: Message
}

// User types
export type ProfileUpdate = DefaultSchema["Tables"]["profiles"]["Update"]
export type UserRole = string // Add this if it's an enum

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

