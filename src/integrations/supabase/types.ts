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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          id: string
          metadata: Json
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["activity_action"]
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: Database["public"]["Enums"]["activity_entity_type"]
          id?: string
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["activity_action"]
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: Database["public"]["Enums"]["activity_entity_type"]
          id?: string
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          metadata: Json
          summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      approval_request_documents: {
        Row: {
          approval_request_id: string
          created_at: string
          document_id: string | null
          document_url: string | null
          id: string
        }
        Insert: {
          approval_request_id: string
          created_at?: string
          document_id?: string | null
          document_url?: string | null
          id?: string
        }
        Update: {
          approval_request_id?: string
          created_at?: string
          document_id?: string | null
          document_url?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_documents_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_request_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_request_step_approvals: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          approval_request_id: string
          approver_department_id: string | null
          approver_position_id: string | null
          approver_role: string | null
          approver_user_id: string | null
          created_at: string
          id: string
          is_required: boolean
          notes: string | null
          status: string
          step_name: string
          step_order: number
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          approval_request_id: string
          approver_department_id?: string | null
          approver_position_id?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          status?: string
          step_name: string
          step_order: number
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          approval_request_id?: string
          approver_department_id?: string | null
          approver_position_id?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          status?: string
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_step_approvals_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_request_step_assignees: {
        Row: {
          created_at: string | null
          id: string
          step_approval_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          step_approval_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          step_approval_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_step_assignees_step_approval_id_fkey"
            columns: ["step_approval_id"]
            isOneToOne: false
            referencedRelation: "approval_request_step_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_request_step_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          amount: number | null
          approval_notes: string | null
          approved_by: string | null
          category: string | null
          category_type_id: string | null
          created_at: string
          current_step_order: number | null
          date: string | null
          department: string | null
          description: string | null
          document_id: string | null
          document_url: string | null
          id: string
          is_tax_included: boolean | null
          is_use_tax: boolean | null
          items: Json | null
          payment_method: string | null
          payment_schedule_date: string | null
          priority: string | null
          purpose: string | null
          reason_for_purchase: string | null
          rejected_by: string | null
          remarks: string | null
          revision_restart_from_first: boolean | null
          revision_source_step_order: number | null
          route_id: string | null
          status: string
          tax_rate: number | null
          title: string
          updated_at: string
          user_id: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number | null
          approval_notes?: string | null
          approved_by?: string | null
          category?: string | null
          category_type_id?: string | null
          created_at?: string
          current_step_order?: number | null
          date?: string | null
          department?: string | null
          description?: string | null
          document_id?: string | null
          document_url?: string | null
          id?: string
          is_tax_included?: boolean | null
          is_use_tax?: boolean | null
          items?: Json | null
          payment_method?: string | null
          payment_schedule_date?: string | null
          priority?: string | null
          purpose?: string | null
          reason_for_purchase?: string | null
          rejected_by?: string | null
          remarks?: string | null
          revision_restart_from_first?: boolean | null
          revision_source_step_order?: number | null
          route_id?: string | null
          status?: string
          tax_rate?: number | null
          title: string
          updated_at?: string
          user_id?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number | null
          approval_notes?: string | null
          approved_by?: string | null
          category?: string | null
          category_type_id?: string | null
          created_at?: string
          current_step_order?: number | null
          date?: string | null
          department?: string | null
          description?: string | null
          document_id?: string | null
          document_url?: string | null
          id?: string
          is_tax_included?: boolean | null
          is_use_tax?: boolean | null
          items?: Json | null
          payment_method?: string | null
          payment_schedule_date?: string | null
          priority?: string | null
          purpose?: string | null
          reason_for_purchase?: string | null
          rejected_by?: string | null
          remarks?: string | null
          revision_restart_from_first?: boolean | null
          revision_source_step_order?: number | null
          route_id?: string | null
          status?: string
          tax_rate?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_category_type_id_fkey"
            columns: ["category_type_id"]
            isOneToOne: false
            referencedRelation: "category_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "approval_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_route_step_assignees: {
        Row: {
          created_at: string | null
          id: string
          step_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          step_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_route_step_assignees_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_route_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_route_step_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_route_steps: {
        Row: {
          approver_department_id: string | null
          approver_position_id: string | null
          approver_role: string | null
          approver_user_id: string | null
          created_at: string
          id: string
          is_required: boolean
          name: string
          route_id: string
          step_order: number
        }
        Insert: {
          approver_department_id?: string | null
          approver_position_id?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
          route_id: string
          step_order: number
        }
        Update: {
          approver_department_id?: string | null
          approver_position_id?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
          route_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_route_steps_approver_department_id_fkey"
            columns: ["approver_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_route_steps_approver_position_id_fkey"
            columns: ["approver_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_route_steps_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "approval_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_routes: {
        Row: {
          condition_logic: string | null
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          weight: number
        }
        Insert: {
          condition_logic?: string | null
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          weight?: number
        }
        Update: {
          condition_logic?: string | null
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      category_types: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_embeddings: {
        Row: {
          content: string | null
          document_id: string
          embedding: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          content?: string | null
          document_id: string
          embedding: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Update: {
          content?: string | null
          document_id?: string
          embedding?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_judgment: Json | null
          category: string | null
          content_hash: string | null
          created_at: string
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          mime_type: string | null
          text_content: string | null
          user_id: string
        }
        Insert: {
          ai_judgment?: Json | null
          category?: string | null
          content_hash?: string | null
          created_at?: string
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          text_content?: string | null
          user_id?: string
        }
        Update: {
          ai_judgment?: Json | null
          category?: string | null
          content_hash?: string | null
          created_at?: string
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          text_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_completed_at: string | null
          actor_id: string | null
          approval_request_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          recipient_id: string
          requires_action: boolean
          step_order: number | null
          title: string
          type: string
        }
        Insert: {
          action_completed_at?: string | null
          actor_id?: string | null
          approval_request_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          recipient_id: string
          requires_action?: boolean
          step_order?: number | null
          title: string
          type: string
        }
        Update: {
          action_completed_at?: string | null
          actor_id?: string | null
          approval_request_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          recipient_id?: string
          requires_action?: boolean
          step_order?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          position_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          position_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          position_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["permission_value"]
          permission_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_value"]
          permission_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_value"]
          permission_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_embeddings: {
        Row: {
          approval_request_id: string
          content: string | null
          created_at: string
          embedding: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_request_id: string
          content?: string | null
          created_at?: string
          embedding: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          approval_request_id?: string
          content?: string | null
          created_at?: string
          embedding?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_embeddings_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_permission: {
        Args: { p_action: string; p_user_id: string }
        Returns: string
      }
      hybrid_search: {
        Args: {
          match_count?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          similarity_threshold?: number
        }
        Returns: {
          bm25_score: number
          category: string
          content: string
          created_at: string
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          folder_id: string
          id: string
          mime_type: string
          similarity: number
          user_id: string
        }[]
      }
      is_admin_or_super: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      match_document_embeddings: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          document_id: string
          embedding: string
          id: string
          metadata: Json
          similarity: number
          user_id: string
        }[]
      }
      match_document_embeddings_v2: {
        Args: {
          filter_category?: string
          filter_date_from?: string
          filter_date_to?: string
          filter_document_type?: string
          filter_organization?: string
          filter_tags?: string[]
          match_count?: number
          query_embedding?: string
          similarity_threshold?: number
        }
        Returns: {
          ai_judgment: Json
          category: string
          content: string
          created_at: string
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          folder_id: string
          id: string
          mime_type: string
          similarity: number
          user_id: string
        }[]
      }
      match_document_embeddings_v3: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          category: string
          content: string
          created_at: string
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          folder_id: string
          id: string
          mime_type: string
          similarity: number
          user_id: string
        }[]
      }
      match_submission_embeddings: {
        Args: {
          match_count?: number
          p_user_id?: string
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          amount: number
          approval_request_id: string
          category: string
          content: string
          created_at: string
          date: string
          department: string
          id: string
          priority: string
          similarity: number
          status: string
          submitter_name: string
          title: string
          vendor_name: string
        }[]
      }
    }
    Enums: {
      activity_action:
        | "file_upload"
        | "file_delete"
        | "file_rename"
        | "file_move"
        | "folder_create"
        | "folder_rename"
        | "folder_delete"
        | "folder_move"
        | "bulk_move"
        | "rag_ingest"
        | "thread_create"
        | "message_insert"
        | "user_invite"
        | "user_approve"
        | "user_reject"
        | "user_role_change"
        | "user_delete"
        | "file_share"
        | "submission_approve"
        | "submission_reject"
        | "submission_need_revision"
        | "department_create"
        | "department_update"
        | "department_delete"
        | "position_create"
        | "position_update"
        | "position_delete"
        | "permission_update"
      activity_entity_type:
        | "file"
        | "folder"
        | "thread"
        | "message"
        | "bulk"
        | "user"
        | "submission"
        | "department"
        | "position"
        | "permission"
      permission_value:
        | "granted"
        | "denied"
        | "assigned_only"
        | "limited"
        | "view_only"
      user_role:
        | "approver"
        | "requester"
        | "accounting"
        | "admin"
        | "platform_admin"
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
      activity_action: [
        "file_upload",
        "file_delete",
        "file_rename",
        "file_move",
        "folder_create",
        "folder_rename",
        "folder_delete",
        "folder_move",
        "bulk_move",
        "rag_ingest",
        "thread_create",
        "message_insert",
        "user_invite",
        "user_approve",
        "user_reject",
        "user_role_change",
        "user_delete",
        "file_share",
        "submission_approve",
        "submission_reject",
        "submission_need_revision",
        "department_create",
        "department_update",
        "department_delete",
        "position_create",
        "position_update",
        "position_delete",
        "permission_update",
      ],
      activity_entity_type: [
        "file",
        "folder",
        "thread",
        "message",
        "bulk",
        "user",
        "submission",
        "department",
        "position",
        "permission",
      ],
      permission_value: [
        "granted",
        "denied",
        "assigned_only",
        "limited",
        "view_only",
      ],
      user_role: [
        "approver",
        "requester",
        "accounting",
        "admin",
        "platform_admin",
      ],
    },
  },
} as const
