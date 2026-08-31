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
      charging_sessions: {
        Row: {
          cost: number | null
          cost_breakdown: Json | null
          created_at: string
          ended_at: string
          energy_kwh: number
          id: string
          location_type: string
          source_import_id: string | null
          started_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          ended_at: string
          energy_kwh: number
          id?: string
          location_type?: string
          source_import_id?: string | null
          started_at: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          ended_at?: string
          energy_kwh?: number
          id?: string
          location_type?: string
          source_import_id?: string | null
          started_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charging_sessions_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "raw_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charging_sessions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_bills: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          source_import_id: string | null
          standing_charge_total: number | null
          tariff_id: string | null
          total_cost: number
          total_kwh: number
          user_id: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          source_import_id?: string | null
          standing_charge_total?: number | null
          tariff_id?: string | null
          total_cost: number
          total_kwh: number
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          source_import_id?: string | null
          standing_charge_total?: number | null
          tariff_id?: string | null
          total_cost?: number
          total_kwh?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_bills_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "raw_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_bills_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "energy_tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_tariffs: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          provider: string
          standing_charge_per_day: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          provider?: string
          standing_charge_per_day?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          provider?: string
          standing_charge_per_day?: number | null
          user_id?: string
        }
        Relationships: []
      }
      raw_imports: {
        Row: {
          created_at: string
          error_summary: Json | null
          id: string
          original_filename: string | null
          processed_at: string | null
          rows_failed: number | null
          rows_imported: number | null
          rows_total: number | null
          source_type: string
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_summary?: Json | null
          id?: string
          original_filename?: string | null
          processed_at?: string | null
          rows_failed?: number | null
          rows_imported?: number | null
          rows_total?: number | null
          source_type: string
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_summary?: Json | null
          id?: string
          original_filename?: string | null
          processed_at?: string | null
          rows_failed?: number | null
          rows_imported?: number | null
          rows_total?: number | null
          source_type?: string
          status?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      tariff_rate_periods: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          price_per_kwh: number
          rate_name: string
          tariff_id: string
          time_end: string
          time_start: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          price_per_kwh: number
          rate_name: string
          tariff_id: string
          time_end: string
          time_start: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          price_per_kwh?: number
          rate_name?: string
          tariff_id?: string
          time_end?: string
          time_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariff_rate_periods_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "energy_tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          battery_end_pct: number | null
          battery_start_pct: number | null
          cost: number | null
          created_at: string
          distance_km: number
          efficiency_wh_per_km: number | null
          ended_at: string | null
          energy_used_kwh: number | null
          id: string
          notes: string | null
          odometer_km: number | null
          source: string
          source_import_id: string | null
          started_at: string | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          battery_end_pct?: number | null
          battery_start_pct?: number | null
          cost?: number | null
          created_at?: string
          distance_km: number
          efficiency_wh_per_km?: number | null
          ended_at?: string | null
          energy_used_kwh?: number | null
          id?: string
          notes?: string | null
          odometer_km?: number | null
          source: string
          source_import_id?: string | null
          started_at?: string | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          battery_end_pct?: number | null
          battery_start_pct?: number | null
          cost?: number | null
          created_at?: string
          distance_km?: number
          efficiency_wh_per_km?: number | null
          ended_at?: string | null
          energy_used_kwh?: number | null
          id?: string
          notes?: string | null
          odometer_km?: number | null
          source?: string
          source_import_id?: string | null
          started_at?: string | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_source_import_id_fkey"
            columns: ["source_import_id"]
            isOneToOne: false
            referencedRelation: "raw_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          battery_capacity_kwh: number | null
          created_at: string
          id: string
          is_default: boolean
          make: string | null
          model: string | null
          name: string
          user_id: string
          year: number | null
        }
        Insert: {
          battery_capacity_kwh?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          make?: string | null
          model?: string | null
          name: string
          user_id: string
          year?: number | null
        }
        Update: {
          battery_capacity_kwh?: number | null
          created_at?: string
          id?: string
          is_default?: boolean
          make?: string | null
          model?: string | null
          name?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
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
    Enums: {},
  },
} as const
