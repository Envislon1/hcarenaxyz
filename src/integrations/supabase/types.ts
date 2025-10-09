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
      admin_emails: {
        Row: {
          added_by: string | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          created_at: string | null
          download_url: string
          id: string
          is_current: boolean | null
          platform: string
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          download_url: string
          id?: string
          is_current?: boolean | null
          platform: string
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          download_url?: string
          id?: string
          is_current?: boolean | null
          platform?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          game_id: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_offers: {
        Row: {
          created_at: string
          game_id: string
          id: string
          offered_by_player_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          offered_by_player_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          offered_by_player_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_offers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_moves: {
        Row: {
          board_state_before: Json | null
          captured_piece: boolean
          from_index: number
          game_id: string
          id: string
          move_number: number
          notation: string | null
          player_id: string
          timestamp: string
          to_index: number
        }
        Insert: {
          board_state_before?: Json | null
          captured_piece?: boolean
          from_index: number
          game_id: string
          id?: string
          move_number: number
          notation?: string | null
          player_id: string
          timestamp?: string
          to_index: number
        }
        Update: {
          board_state_before?: Json | null
          captured_piece?: boolean
          from_index?: number
          game_id?: string
          id?: string
          move_number?: number
          notation?: string | null
          player_id?: string
          timestamp?: string
          to_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          board_state: Json
          completed_at: string | null
          created_at: string
          current_turn: number
          game_type: string
          id: string
          platform_fee: number
          player1_captures: number | null
          player1_id: string
          player1_time_remaining: number
          player2_captures: number | null
          player2_id: string | null
          player2_time_remaining: number
          stake_amount: number
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"]
          time_limit: number
          timer_last_updated: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          board_state: Json
          completed_at?: string | null
          created_at?: string
          current_turn?: number
          game_type?: string
          id?: string
          platform_fee?: number
          player1_captures?: number | null
          player1_id: string
          player1_time_remaining?: number
          player2_captures?: number | null
          player2_id?: string | null
          player2_time_remaining?: number
          stake_amount: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          time_limit?: number
          timer_last_updated?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          board_state?: Json
          completed_at?: string | null
          created_at?: string
          current_turn?: number
          game_type?: string
          id?: string
          platform_fee?: number
          player1_captures?: number | null
          player1_id?: string
          player1_time_remaining?: number
          player2_captures?: number | null
          player2_id?: string | null
          player2_time_remaining?: number
          stake_amount?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          time_limit?: number
          timer_last_updated?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          games_played: number
          games_won: number
          id: string
          notifications_enabled: boolean | null
          updated_at: string
          username: string
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          games_played?: number
          games_won?: number
          id: string
          notifications_enabled?: boolean | null
          updated_at?: string
          username: string
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          games_played?: number
          games_won?: number
          id?: string
          notifications_enabled?: boolean | null
          updated_at?: string
          username?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      realtime_stats: {
        Row: {
          games_playing: number
          id: string
          players_online: number
          updated_at: string
        }
        Insert: {
          games_playing?: number
          id?: string
          players_online?: number
          updated_at?: string
        }
        Update: {
          games_playing?: number
          id?: string
          players_online?: number
          updated_at?: string
        }
        Relationships: []
      }
      rematch_offers: {
        Row: {
          created_at: string
          from_player_id: string
          id: string
          new_game_id: string | null
          original_game_id: string
          status: string
          to_player_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_player_id: string
          id?: string
          new_game_id?: string | null
          original_game_id: string
          status?: string
          to_player_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_player_id?: string
          id?: string
          new_game_id?: string | null
          original_game_id?: string
          status?: string
          to_player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rematch_offers_new_game_id_fkey"
            columns: ["new_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rematch_offers_original_game_id_fkey"
            columns: ["original_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      takeback_requests: {
        Row: {
          created_at: string
          game_id: string
          id: string
          requested_by_player_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          requested_by_player_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          requested_by_player_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeback_requests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          game_id: string | null
          id: string
          payment_reference: string | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          game_id?: string | null
          id?: string
          payment_reference?: string | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          game_id?: string | null
          id?: string
          payment_reference?: string | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "ceo"
      game_status:
        | "waiting"
        | "active"
        | "completed"
        | "timeout"
        | "cancelled"
        | "draw"
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
      app_role: ["admin", "user", "ceo"],
      game_status: [
        "waiting",
        "active",
        "completed",
        "timeout",
        "cancelled",
        "draw",
      ],
    },
  },
} as const
