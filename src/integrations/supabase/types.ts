export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          device_info: Json | null
          document_id: string | null
          error_details: string | null
          event: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          risk_score: number | null
          session_id: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          device_info?: Json | null
          document_id?: string | null
          error_details?: string | null
          event: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          risk_score?: number | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          device_info?: Json | null
          document_id?: string | null
          error_details?: string | null
          event?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          risk_score?: number | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          document_id: string
          id: string
          is_active: boolean | null
          reviewer_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          document_id: string
          id?: string
          is_active?: boolean | null
          reviewer_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          document_id?: string
          id?: string
          is_active?: boolean | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_assignments_document_id"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          comment: string
          created_at: string
          document_id: string
          id: string
          is_internal: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          document_id: string
          id?: string
          is_internal?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          document_id?: string
          id?: string
          is_internal?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_comments_document_id"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_content: string | null
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          is_active: boolean | null
          jurisdiction: Database["public"]["Enums"]["jurisdiction"] | null
          name: string
          template_schema: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_content?: string | null
          description?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          is_active?: boolean | null
          jurisdiction?: Database["public"]["Enums"]["jurisdiction"] | null
          name: string
          template_schema: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_content?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          is_active?: boolean | null
          jurisdiction?: Database["public"]["Enums"]["jurisdiction"] | null
          name?: string
          template_schema?: Json
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          approved_at: string | null
          assigned_reviewer_id: string | null
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          encrypted_content: string | null
          encryption_key_hash: string | null
          file_mime_type: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_template: boolean | null
          jurisdiction: Database["public"]["Enums"]["jurisdiction"] | null
          metadata: Json | null
          parent_document_id: string | null
          rejected_at: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["document_status"]
          submitted_at: string | null
          template_data: Json | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          assigned_reviewer_id?: string | null
          created_at?: string
          description?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          encrypted_content?: string | null
          encryption_key_hash?: string | null
          file_mime_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_template?: boolean | null
          jurisdiction?: Database["public"]["Enums"]["jurisdiction"] | null
          metadata?: Json | null
          parent_document_id?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          template_data?: Json | null
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          assigned_reviewer_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          encrypted_content?: string | null
          encryption_key_hash?: string | null
          file_mime_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_template?: boolean | null
          jurisdiction?: Database["public"]["Enums"]["jurisdiction"] | null
          metadata?: Json | null
          parent_document_id?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          template_data?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_parent_document_id"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_locked_until: string | null
          account_status: string
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email_verified_at: string | null
          failed_login_attempts: number | null
          full_name: string | null
          gdpr_consent_at: string | null
          id: string
          is_compromised: boolean | null
          last_activity_at: string | null
          last_failed_login_at: string | null
          last_login_at: string | null
          locale: string | null
          mfa_enabled: boolean | null
          mfa_method: string | null
          mfa_verified_at: string | null
          phone: string | null
          privacy_consent_at: string | null
          recovery_email: string | null
          role: string
          session_count: number | null
          terms_accepted_at: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          account_locked_until?: string | null
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email_verified_at?: string | null
          failed_login_attempts?: number | null
          full_name?: string | null
          gdpr_consent_at?: string | null
          id?: string
          is_compromised?: boolean | null
          last_activity_at?: string | null
          last_failed_login_at?: string | null
          last_login_at?: string | null
          locale?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          mfa_verified_at?: string | null
          phone?: string | null
          privacy_consent_at?: string | null
          recovery_email?: string | null
          role?: string
          session_count?: number | null
          terms_accepted_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          account_locked_until?: string | null
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email_verified_at?: string | null
          failed_login_attempts?: number | null
          full_name?: string | null
          gdpr_consent_at?: string | null
          id?: string
          is_compromised?: boolean | null
          last_activity_at?: string | null
          last_failed_login_at?: string | null
          last_login_at?: string | null
          locale?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          mfa_verified_at?: string | null
          phone?: string | null
          privacy_consent_at?: string | null
          recovery_email?: string | null
          role?: string
          session_count?: number | null
          terms_accepted_at?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_assign_reviewer: {
        Args: { p_document_id: string }
        Returns: string
      }
      get_user_profile: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          full_name: string
          role: string
          account_status: string
          created_at: string
          updated_at: string
          deleted_at: string
          session_count: number
          last_activity_at: string
          last_login_at: string
          gdpr_consent_at: string
          privacy_consent_at: string
          mfa_enabled: boolean
          locale: string
          username: string
          avatar_url: string
          phone: string
          recovery_email: string
          terms_accepted_at: string
          mfa_method: string
          email_verified_at: string
          is_compromised: boolean
          account_locked_until: string
          last_failed_login_at: string
          timezone: string
          failed_login_attempts: number
          mfa_verified_at: string
        }[]
      }
      increment_failed_login: {
        Args: { p_user_id: string }
        Returns: number
      }
      is_account_locked: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_user_id: string
          p_event: string
          p_action_type: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_session_id?: string
          p_document_id?: string
          p_old_values?: Json
          p_new_values?: Json
          p_device_info?: Json
          p_success?: boolean
          p_error_details?: string
          p_metadata?: Json
        }
        Returns: string
      }
      reset_failed_login_attempts: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      document_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "requires_revision"
      document_type:
        | "contract"
        | "agreement"
        | "legal_notice"
        | "compliance_document"
        | "litigation_document"
        | "corporate_document"
        | "intellectual_property"
        | "employment_document"
        | "real_estate_document"
        | "other"
      jurisdiction:
        | "federal_australia"
        | "nsw"
        | "vic"
        | "qld"
        | "wa"
        | "sa"
        | "tas"
        | "act"
        | "nt"
        | "international"
        | "other"
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
      document_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "requires_revision",
      ],
      document_type: [
        "contract",
        "agreement",
        "legal_notice",
        "compliance_document",
        "litigation_document",
        "corporate_document",
        "intellectual_property",
        "employment_document",
        "real_estate_document",
        "other",
      ],
      jurisdiction: [
        "federal_australia",
        "nsw",
        "vic",
        "qld",
        "wa",
        "sa",
        "tas",
        "act",
        "nt",
        "international",
        "other",
      ],
    },
  },
} as const
