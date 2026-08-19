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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      carrier_routes: {
        Row: {
          capacity_kg: number | null
          carrier_id: string
          created_at: string
          from_city: string
          id: string
          is_urgent: boolean
          price: number | null
          status: string
          to_city: string
          travel_date: string | null
          vehicle_photo_url: string | null
          vehicle_type: string | null
        }
        Insert: {
          capacity_kg?: number | null
          carrier_id: string
          created_at?: string
          from_city: string
          id?: string
          is_urgent?: boolean
          price?: number | null
          status?: string
          to_city: string
          travel_date?: string | null
          vehicle_photo_url?: string | null
          vehicle_type?: string | null
        }
        Update: {
          capacity_kg?: number | null
          carrier_id?: string
          created_at?: string
          from_city?: string
          id?: string
          is_urgent?: boolean
          price?: number | null
          status?: string
          to_city?: string
          travel_date?: string | null
          vehicle_photo_url?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_routes_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_tracking: {
        Row: {
          id: string
          lat: number
          lng: number
          match_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          match_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          match_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_tracking_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          carrier_confirmed: boolean
          carrier_id: string
          created_at: string
          id: string
          passenger_request_id: string | null
          request_id: string | null
          ride_id: string | null
          route_id: string | null
          sender_confirmed: boolean
          sender_id: string
          status: string
        }
        Insert: {
          carrier_confirmed?: boolean
          carrier_id: string
          created_at?: string
          id?: string
          passenger_request_id?: string | null
          request_id?: string | null
          ride_id?: string | null
          route_id?: string | null
          sender_confirmed?: boolean
          sender_id: string
          status?: string
        }
        Update: {
          carrier_confirmed?: boolean
          carrier_id?: string
          created_at?: string
          id?: string
          passenger_request_id?: string | null
          request_id?: string | null
          ride_id?: string | null
          route_id?: string | null
          sender_confirmed?: boolean
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_passenger_request_id_fkey"
            columns: ["passenger_request_id"]
            isOneToOne: false
            referencedRelation: "passenger_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shipment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "passenger_rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "carrier_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          match_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
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
      passenger_requests: {
        Row: {
          created_at: string
          from_city: string
          id: string
          is_urgent: boolean
          passenger_id: string
          price_offer: number | null
          seats: number
          status: string
          to_city: string
          travel_date: string | null
        }
        Insert: {
          created_at?: string
          from_city: string
          id?: string
          is_urgent?: boolean
          passenger_id: string
          price_offer?: number | null
          seats?: number
          status?: string
          to_city: string
          travel_date?: string | null
        }
        Update: {
          created_at?: string
          from_city?: string
          id?: string
          is_urgent?: boolean
          passenger_id?: string
          price_offer?: number | null
          seats?: number
          status?: string
          to_city?: string
          travel_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passenger_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      passenger_rides: {
        Row: {
          created_at: string
          driver_id: string
          from_city: string
          id: string
          is_urgent: boolean
          price_per_seat: number | null
          seats_available: number
          status: string
          to_city: string
          travel_date: string | null
          vehicle_photo_url: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          from_city: string
          id?: string
          is_urgent?: boolean
          price_per_seat?: number | null
          seats_available?: number
          status?: string
          to_city: string
          travel_date?: string | null
          vehicle_photo_url?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          from_city?: string
          id?: string
          is_urgent?: boolean
          price_per_seat?: number | null
          seats_available?: number
          status?: string
          to_city?: string
          travel_date?: string | null
          vehicle_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passenger_rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          nickname: string | null
          rating_as_carrier: number
          rating_as_sender: number
          role: string
          show_contact: boolean
          username: string | null
        }
        Insert: {
          created_at?: string
          id: string
          is_demo?: boolean
          nickname?: string | null
          rating_as_carrier?: number
          rating_as_sender?: number
          role?: string
          show_contact?: boolean
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          nickname?: string | null
          rating_as_carrier?: number
          rating_as_sender?: number
          role?: string
          show_contact?: boolean
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          id: string
          match_id: string | null
          rating: number
          review_type: string
          target_id: string
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          id?: string
          match_id?: string | null
          rating: number
          review_type: string
          target_id: string
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          match_id?: string | null
          rating?: number
          review_type?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_requests: {
        Row: {
          cargo_type: string | null
          created_at: string
          from_city: string
          id: string
          is_urgent: boolean
          photo_url: string | null
          price_offer: number | null
          sender_id: string
          status: string
          to_city: string
          travel_date: string | null
          weight_kg: number | null
        }
        Insert: {
          cargo_type?: string | null
          created_at?: string
          from_city: string
          id?: string
          is_urgent?: boolean
          photo_url?: string | null
          price_offer?: number | null
          sender_id: string
          status?: string
          to_city: string
          travel_date?: string | null
          weight_kg?: number | null
        }
        Update: {
          cargo_type?: string | null
          created_at?: string
          from_city?: string
          id?: string
          is_urgent?: boolean
          photo_url?: string | null
          price_offer?: number | null
          sender_id?: string
          status?: string
          to_city?: string
          travel_date?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_match_carrier: { Args: { _match_id: string }; Returns: boolean }
      is_match_party: { Args: { _match_id: string }; Returns: boolean }
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
