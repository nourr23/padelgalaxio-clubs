export type AppRole = "player" | "coach" | "club" | "admin";

export type ClubEnvironment = "indoor" | "outdoor";

export type GameStatus =
  | "open"
  | "full"
  | "completed"
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
      games: {
        Row: {
          id: string;
          court_id: string | null;
          starts_at: string;
          ends_at: string;
          status: GameStatus | null;
        };
        Insert: {
          id?: string;
          court_id?: string | null;
          starts_at: string;
          ends_at: string;
          status?: GameStatus | null;
        };
        Update: {
          id?: string;
          court_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: GameStatus | null;
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
