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
      appointments: {
        Row: {
          appointment_date: string
          created_at: string | null
          doctor_id: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          status: string
        }
        Insert: {
          appointment_date: string
          created_at?: string | null
          doctor_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          doctor_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          created_at: string
          doctor_id: string
          full_name: string
          id: string
          mobile_number: string
          note: string | null
          patient_id: string | null
          preferred_at: string
          status: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          full_name: string
          id?: string
          mobile_number: string
          note?: string | null
          patient_id?: string | null
          preferred_at: string
          status?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          full_name?: string
          id?: string
          mobile_number?: string
          note?: string | null
          patient_id?: string | null
          preferred_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          booking_token: string
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          license_number: string | null
          mobile_number: string | null
          profile_photo_url: string | null
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          booking_token?: string
          created_at?: string | null
          email?: string | null
          first_name: string
          id: string
          last_name: string
          license_number?: string | null
          mobile_number?: string | null
          profile_photo_url?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_token?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string | null
          mobile_number?: string | null
          profile_photo_url?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          case_notes: string | null
          case_photo_path: string | null
          created_at: string | null
          date_of_birth: string | null
          doctor_id: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          medical_history: string | null
          mobile_number: string | null
        }
        Insert: {
          case_notes?: string | null
          case_photo_path?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          doctor_id: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          medical_history?: string | null
          mobile_number?: string | null
        }
        Update: {
          case_notes?: string | null
          case_photo_path?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          doctor_id?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          medical_history?: string | null
          mobile_number?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          visited_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id: string
          visited_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      patient_overview: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          last_visit_at: string | null
          mobile_number: string | null
          visit_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      booking_form_doctor: {
        Args: { token: string }
        Returns: { first_name: string; last_name: string | null; specialization: string | null }[]
      }
      cancel_signup: { Args: { token_hash: string }; Returns: boolean }
      regenerate_booking_token: { Args: never; Returns: string }
      submit_booking_request: {
        Args: {
          token: string
          full_name: string
          mobile_number: string
          preferred_at: string
          note?: string | null
        }
        Returns: boolean
      }
      delete_account: { Args: never; Returns: undefined }
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
