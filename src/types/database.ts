export type AppRole = "player" | "coach" | "club" | "admin";

export type ClubEnvironment = "indoor" | "outdoor";

export type GameStatus =
  | "open"
  | "full"
  | "completed"
  | "cancelled";

export type CoachingPackageKind = "monthly" | "per_session";

export type CoachingPriceBasis = "per_person" | "per_group";

export type CoachingRequestStatus =
  | "pending"
  | "contacted"
  | "confirmed"
  | "declined"
  | "cancelled";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          user_id: string;
          role: AppRole;
        };
        Insert: {
          user_id: string;
          role: AppRole;
        };
        Update: {
          user_id?: string;
          role?: AppRole;
        };
        Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          city: string | null;
          address: string | null;
          phone: string | null;
          website: string | null;
          timezone: string | null;
          slot_duration_minutes: number | null;
          first_slot_start: string | null;
          last_session_end: string | null;
          booking_window_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          city?: string | null;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          timezone?: string | null;
          slot_duration_minutes?: number | null;
          first_slot_start?: string | null;
          last_session_end?: string | null;
          booking_window_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          city?: string | null;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          timezone?: string | null;
          slot_duration_minutes?: number | null;
          first_slot_start?: string | null;
          last_session_end?: string | null;
          booking_window_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courts: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          sort_order: number | null;
          environment: ClubEnvironment | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          sort_order?: number | null;
          environment?: ClubEnvironment | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          name?: string;
          sort_order?: number | null;
          environment?: ClubEnvironment | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      court_session_prices: {
        Row: {
          id: string;
          court_id: string;
          from_time: string;
          to_time: string;
          days_of_week: number[] | null;
          price: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          court_id: string;
          from_time: string;
          to_time: string;
          days_of_week?: number[] | null;
          price: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          court_id?: string;
          from_time?: string;
          to_time?: string;
          days_of_week?: number[] | null;
          price?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          last_seen_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      coaching_packages: {
        Row: {
          id: string;
          club_id: string;
          kind: CoachingPackageKind;
          title: string | null;
          group_size: number;
          sessions_per_month: number | null;
          session_minutes: number | null;
          price: number;
          price_basis: CoachingPriceBasis;
          currency: string;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          kind: CoachingPackageKind;
          title?: string | null;
          group_size: number;
          sessions_per_month?: number | null;
          session_minutes?: number | null;
          price: number;
          price_basis: CoachingPriceBasis;
          currency?: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          kind?: CoachingPackageKind;
          title?: string | null;
          group_size?: number;
          sessions_per_month?: number | null;
          session_minutes?: number | null;
          price?: number;
          price_basis?: CoachingPriceBasis;
          currency?: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coaching_packages_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      coaching_requests: {
        Row: {
          id: string;
          package_id: string;
          club_id: string;
          player_user_id: string;
          participants: number;
          note: string | null;
          status: CoachingRequestStatus;
          club_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          package_id: string;
          club_id?: string;
          player_user_id: string;
          participants: number;
          note?: string | null;
          status?: CoachingRequestStatus;
          club_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          package_id?: string;
          club_id?: string;
          player_user_id?: string;
          participants?: number;
          note?: string | null;
          status?: CoachingRequestStatus;
          club_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coaching_requests_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "coaching_packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coaching_requests_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coaching_requests_player_user_id_fkey";
            columns: ["player_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          id: string;
          court_id: string | null;
          starts_at: string;
          ends_at: string;
          status: GameStatus | null;
          created_by_user_id: string | null;
          booked_by_club: boolean;
          level_min: number | null;
          level_max: number | null;
          gender_category: string | null;
          notes: string | null;
          source_type: string | null;
        };
        Insert: {
          id?: string;
          court_id?: string | null;
          starts_at: string;
          ends_at: string;
          status?: GameStatus | null;
          created_by_user_id?: string | null;
          booked_by_club?: boolean;
          level_min?: number | null;
          level_max?: number | null;
          gender_category?: string | null;
          notes?: string | null;
          source_type?: string | null;
        };
        Update: {
          id?: string;
          court_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: GameStatus | null;
          created_by_user_id?: string | null;
          booked_by_club?: boolean;
          level_min?: number | null;
          level_max?: number | null;
          gender_category?: string | null;
          notes?: string | null;
          source_type?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Club = Database["public"]["Tables"]["clubs"]["Row"];

export type CourtSessionPrice =
  Database["public"]["Tables"]["court_session_prices"]["Row"];

export type CoachingPackage =
  Database["public"]["Tables"]["coaching_packages"]["Row"];

export type CoachingRequest =
  Database["public"]["Tables"]["coaching_requests"]["Row"];
