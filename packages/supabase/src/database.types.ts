/**
 * Tipos placeholder hasta que se conecte el proyecto Supabase real y
 * se generen con `pnpm --filter @padel-pulse/supabase gen:types`.
 *
 * Mantener sincronizado con `supabase/migrations/0001_init.sql` mientras tanto.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          city: string | null;
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
          rating: number;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          city?: string | null;
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'pro';
          rating?: number;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      communities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          city: string;
          country: string;
          owner_id: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          city: string;
          country?: string;
          owner_id: string;
          rating?: number;
        };
        Update: Partial<Database['public']['Tables']['communities']['Insert']>;
        Relationships: [];
      };
      community_members: {
        Row: {
          community_id: string;
          profile_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          community_id: string;
          profile_id: string;
          role?: 'owner' | 'admin' | 'member';
        };
        Update: Partial<Database['public']['Tables']['community_members']['Insert']>;
        Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          slug: string;
          name: string;
          city: string;
          country: string;
          logo_url: string | null;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          city: string;
          country?: string;
          logo_url?: string | null;
          owner_id: string;
        };
        Update: Partial<Database['public']['Tables']['clubs']['Insert']>;
        Relationships: [];
      };
      tournaments: {
        Row: {
          id: string;
          slug: string;
          name: string;
          format: 'americano' | 'mexicano' | 'league';
          status: 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
          gender: 'mixed' | 'male' | 'female';
          club_id: string;
          starts_at: string;
          ends_at: string;
          registration_deadline: string;
          price_per_pair: number;
          max_pairs: number;
          rotation_games: number;
          description: string | null;
          banner_url: string | null;
          sponsor_name: string | null;
          sponsor_logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          format?: 'americano' | 'mexicano' | 'league';
          status?: 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
          gender?: 'mixed' | 'male' | 'female';
          club_id: string;
          starts_at: string;
          ends_at: string;
          registration_deadline: string;
          price_per_pair?: number;
          max_pairs?: number;
          rotation_games?: number;
          description?: string | null;
          banner_url?: string | null;
          sponsor_name?: string | null;
          sponsor_logo_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>;
        Relationships: [];
      };
      tournament_pairs: {
        Row: {
          id: string;
          tournament_id: string;
          community_id: string;
          player_one_id: string;
          player_two_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          community_id: string;
          player_one_id: string;
          player_two_id: string;
        };
        Update: Partial<Database['public']['Tables']['tournament_pairs']['Insert']>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          tournament_id: string;
          round_number: number;
          court_number: number;
          pair_one_id: string;
          pair_two_id: string;
          score_pair_one: number | null;
          score_pair_two: number | null;
          status: 'scheduled' | 'in_progress' | 'completed' | 'disputed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round_number: number;
          court_number: number;
          pair_one_id: string;
          pair_two_id: string;
          score_pair_one?: number | null;
          score_pair_two?: number | null;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'disputed';
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
