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
      categories: {
        Row: {
          code: Database["public"]["Enums"]["team_category"]
          description: string | null
          display_name: string
          is_mixed: boolean
          is_queens: boolean
          max_rating: number | null
          min_rating: number | null
          numeric_value: number
          short_label: string
          sort_order: number
        }
        Insert: {
          code: Database["public"]["Enums"]["team_category"]
          description?: string | null
          display_name: string
          is_mixed?: boolean
          is_queens?: boolean
          max_rating?: number | null
          min_rating?: number | null
          numeric_value?: number
          short_label: string
          sort_order: number
        }
        Update: {
          code?: Database["public"]["Enums"]["team_category"]
          description?: string | null
          display_name?: string
          is_mixed?: boolean
          is_queens?: boolean
          max_rating?: number | null
          min_rating?: number | null
          numeric_value?: number
          short_label?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_change_suggestions: {
        Row: {
          created_at: string
          current_category: Database["public"]["Enums"]["team_category"] | null
          evidence_points: number | null
          evidence_wins_vs_higher: number | null
          id: string
          profile_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["category_change_status"]
          suggested_category: Database["public"]["Enums"]["team_category"]
        }
        Insert: {
          created_at?: string
          current_category?: Database["public"]["Enums"]["team_category"] | null
          evidence_points?: number | null
          evidence_wins_vs_higher?: number | null
          id?: string
          profile_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["category_change_status"]
          suggested_category: Database["public"]["Enums"]["team_category"]
        }
        Update: {
          created_at?: string
          current_category?: Database["public"]["Enums"]["team_category"] | null
          evidence_points?: number | null
          evidence_wins_vs_higher?: number | null
          id?: string
          profile_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["category_change_status"]
          suggested_category?: Database["public"]["Enums"]["team_category"]
        }
        Relationships: [
          {
            foreignKeyName: "category_change_suggestions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "category_change_suggestions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_change_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "category_change_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          active: boolean
          country: string
          created_at: string
          id: string
          name: string
          region: string | null
          slug: string
        }
        Insert: {
          active?: boolean
          country?: string
          created_at?: string
          id?: string
          name: string
          region?: string | null
          slug: string
        }
        Update: {
          active?: boolean
          country?: string
          created_at?: string
          id?: string
          name?: string
          region?: string | null
          slug?: string
        }
        Relationships: []
      }
      club_communities: {
        Row: {
          club_id: string
          community_id: string
          created_at: string
          is_primary: boolean
        }
        Insert: {
          club_id: string
          community_id: string
          created_at?: string
          is_primary?: boolean
        }
        Update: {
          club_id?: string
          community_id?: string
          created_at?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "club_communities_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_communities_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          city: string
          city_id: string | null
          country: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
        }
        Insert: {
          city: string
          city_id?: string | null
          country?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
        }
        Update: {
          city?: string
          city_id?: string | null
          country?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          city: string
          city_id: string | null
          country: string
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          rating: number
          slug: string
        }
        Insert: {
          city: string
          city_id?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          rating?: number
          slug: string
        }
        Update: {
          city?: string
          city_id?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          rating?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          profile_id: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          community_id: string
          joined_at?: string
          profile_id: string
          role?: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          community_id?: string
          joined_at?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "community_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          confirmed_by_one: boolean
          confirmed_by_two: boolean
          court_number: number
          created_at: string
          ended_at: string | null
          id: string
          registration_one_id: string
          registration_two_id: string
          round_number: number
          scheduled_at: string | null
          score_one: number | null
          score_two: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          updated_at: string
        }
        Insert: {
          confirmed_by_one?: boolean
          confirmed_by_two?: boolean
          court_number: number
          created_at?: string
          ended_at?: string | null
          id?: string
          registration_one_id: string
          registration_two_id: string
          round_number: number
          scheduled_at?: string | null
          score_one?: number | null
          score_two?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          updated_at?: string
        }
        Update: {
          confirmed_by_one?: boolean
          confirmed_by_two?: boolean
          court_number?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          registration_one_id?: string
          registration_two_id?: string
          round_number?: number
          scheduled_at?: string | null
          score_one?: number | null
          score_two?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_registration_one_id_fkey"
            columns: ["registration_one_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_registration_two_id_fkey"
            columns: ["registration_two_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          profile_id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          profile_id: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_points: {
        Row: {
          awarded_at: string
          category: Database["public"]["Enums"]["team_category"] | null
          community_id: string
          id: string
          points: number
          position: number
          profile_id: string
          tournament_id: string
          weight_applied: number
        }
        Insert: {
          awarded_at?: string
          category?: Database["public"]["Enums"]["team_category"] | null
          community_id: string
          id?: string
          points: number
          position: number
          profile_id: string
          tournament_id: string
          weight_applied: number
        }
        Update: {
          awarded_at?: string
          category?: Database["public"]["Enums"]["team_category"] | null
          community_id?: string
          id?: string
          points?: number
          position?: number
          profile_id?: string
          tournament_id?: string
          weight_applied?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_points_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_points_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "player_points_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string
          gender: Database["public"]["Enums"]["gender_kind"] | null
          id: string
          rating: number
          skill_category: Database["public"]["Enums"]["team_category"] | null
          skill_level: Database["public"]["Enums"]["skill_level"]
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          gender?: Database["public"]["Enums"]["gender_kind"] | null
          id: string
          rating?: number
          skill_category?: Database["public"]["Enums"]["team_category"] | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          gender?: Database["public"]["Enums"]["gender_kind"] | null
          id?: string
          rating?: number
          skill_category?: Database["public"]["Enums"]["team_category"] | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          tier: Database["public"]["Enums"]["sponsor_tier"]
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          tier?: Database["public"]["Enums"]["sponsor_tier"]
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          tier?: Database["public"]["Enums"]["sponsor_tier"]
          website?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          left_at: string | null
          profile_id: string
          team_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          profile_id: string
          team_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_ranking_by_sum"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_ranking_official"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_points: {
        Row: {
          awarded_at: string
          category: Database["public"]["Enums"]["team_category"]
          community_id: string
          id: string
          points: number
          position: number
          team_id: string
          tournament_id: string
          weight_applied: number
        }
        Insert: {
          awarded_at?: string
          category: Database["public"]["Enums"]["team_category"]
          community_id: string
          id?: string
          points: number
          position: number
          team_id: string
          tournament_id: string
          weight_applied?: number
        }
        Update: {
          awarded_at?: string
          category?: Database["public"]["Enums"]["team_category"]
          community_id?: string
          id?: string
          points?: number
          position?: number
          team_id?: string
          tournament_id?: string
          weight_applied?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_points_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_ranking_by_sum"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_ranking_official"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category: Database["public"]["Enums"]["team_category"] | null
          created_at: string
          dissolved_at: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_community_id: string
          rating: number
          slug: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["team_category"] | null
          created_at?: string
          dissolved_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_community_id: string
          rating?: number
          slug: string
        }
        Update: {
          category?: Database["public"]["Enums"]["team_category"] | null
          created_at?: string
          dissolved_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_community_id?: string
          rating?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_primary_community_id_fkey"
            columns: ["primary_community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          confirmed_at: string | null
          id: string
          payment_amount: number
          payment_provider_ref: string | null
          player_id: string | null
          player_one_id: string | null
          player_two_id: string | null
          registered_at: string
          registered_by: string
          status: Database["public"]["Enums"]["registration_status"]
          team_id: string | null
          tournament_id: string
        }
        Insert: {
          confirmed_at?: string | null
          id?: string
          payment_amount?: number
          payment_provider_ref?: string | null
          player_id?: string | null
          player_one_id?: string | null
          player_two_id?: string | null
          registered_at?: string
          registered_by: string
          status?: Database["public"]["Enums"]["registration_status"]
          team_id?: string | null
          tournament_id: string
        }
        Update: {
          confirmed_at?: string | null
          id?: string
          payment_amount?: number
          payment_provider_ref?: string | null
          player_id?: string | null
          player_one_id?: string | null
          player_two_id?: string | null
          registered_at?: string
          registered_by?: string
          status?: Database["public"]["Enums"]["registration_status"]
          team_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_player_one_id_fkey"
            columns: ["player_one_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player_one_id_fkey"
            columns: ["player_one_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_player_two_id_fkey"
            columns: ["player_two_id"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tournament_registrations_player_two_id_fkey"
            columns: ["player_two_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "player_ranking_casual"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tournament_registrations_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_ranking_by_sum"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tournament_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_ranking_official"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "tournament_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_sponsors: {
        Row: {
          created_at: string
          exposure: Json
          slot: Database["public"]["Enums"]["sponsor_slot"]
          sponsor_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          exposure?: Json
          slot?: Database["public"]["Enums"]["sponsor_slot"]
          sponsor_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          exposure?: Json
          slot?: Database["public"]["Enums"]["sponsor_slot"]
          sponsor_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_sponsors_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_sponsors_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          allows_pro: boolean
          banner_url: string | null
          category: Database["public"]["Enums"]["team_category"] | null
          category_kind: Database["public"]["Enums"]["category_kind"]
          city_id: string | null
          club_id: string
          competition_unit: Database["public"]["Enums"]["competition_unit"]
          created_at: string
          description: string | null
          ends_at: string
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_player_category_value: number | null
          max_teams: number
          min_sum: number | null
          min_teams: number
          name: string
          pairing_mode: Database["public"]["Enums"]["pairing_mode"] | null
          price_per_team: number
          registration_deadline: string
          rotation_games: number
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["tournament_status"]
          tier: Database["public"]["Enums"]["tournament_tier"]
          weight: number
        }
        Insert: {
          allows_pro?: boolean
          banner_url?: string | null
          category?: Database["public"]["Enums"]["team_category"] | null
          category_kind?: Database["public"]["Enums"]["category_kind"]
          city_id?: string | null
          club_id: string
          competition_unit?: Database["public"]["Enums"]["competition_unit"]
          created_at?: string
          description?: string | null
          ends_at: string
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_player_category_value?: number | null
          max_teams?: number
          min_sum?: number | null
          min_teams?: number
          name: string
          pairing_mode?: Database["public"]["Enums"]["pairing_mode"] | null
          price_per_team?: number
          registration_deadline: string
          rotation_games?: number
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["tournament_status"]
          tier?: Database["public"]["Enums"]["tournament_tier"]
          weight?: number
        }
        Update: {
          allows_pro?: boolean
          banner_url?: string | null
          category?: Database["public"]["Enums"]["team_category"] | null
          category_kind?: Database["public"]["Enums"]["category_kind"]
          city_id?: string | null
          club_id?: string
          competition_unit?: Database["public"]["Enums"]["competition_unit"]
          created_at?: string
          description?: string | null
          ends_at?: string
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_player_category_value?: number | null
          max_teams?: number
          min_sum?: number | null
          min_teams?: number
          name?: string
          pairing_mode?: Database["public"]["Enums"]["pairing_mode"] | null
          price_per_team?: number
          registration_deadline?: string
          rotation_games?: number
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          tier?: Database["public"]["Enums"]["tournament_tier"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_ranking_live: {
        Row: {
          active_teams: number | null
          avg_elo_top5: number | null
          city_name: string | null
          community_id: string | null
          community_name: string | null
          community_points: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_primary_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ranking_casual: {
        Row: {
          avatar_url: string | null
          casual_points: number | null
          category: Database["public"]["Enums"]["team_category"] | null
          display_name: string | null
          gender: Database["public"]["Enums"]["gender_kind"] | null
          profile_id: string | null
          tournaments_played_12mo: number | null
        }
        Relationships: []
      }
      team_ranking_by_sum: {
        Row: {
          absolute_points: number | null
          community_id: string | null
          community_name: string | null
          elo_rating: number | null
          team_id: string | null
          team_name: string | null
          team_sum: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_primary_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      team_ranking_official: {
        Row: {
          absolute_points: number | null
          category: Database["public"]["Enums"]["team_category"] | null
          city_name: string | null
          community_id: string | null
          community_name: string | null
          elo_rating: number | null
          team_id: string | null
          team_logo_url: string | null
          team_name: string | null
          tournaments_played_12mo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_primary_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      category_value: {
        Args: { cat: Database["public"]["Enums"]["team_category"] }
        Returns: number
      }
      is_queens_category: {
        Args: { cat: Database["public"]["Enums"]["team_category"] }
        Returns: boolean
      }
      unaccent_safe: { Args: { input: string }; Returns: string }
    }
    Enums: {
      category_change_status:
        | "suggested"
        | "approved"
        | "rejected"
        | "auto_applied"
      category_kind:
        | "estandar"
        | "suma"
        | "mixto_estandar"
        | "mixto_suma"
        | "queens_estandar"
        | "queens_suma"
        | "casual"
      competition_unit: "team" | "player"
      gender_kind: "male" | "female" | "nonbinary" | "prefer_not_to_say"
      match_status: "scheduled" | "in_progress" | "completed" | "disputed"
      member_role: "owner" | "admin" | "member"
      notification_type:
        | "tournament_open"
        | "tournament_starting"
        | "match_scheduled"
        | "match_result"
        | "team_invite"
        | "category_change_suggested"
        | "announcement"
        | "payment_received"
      pairing_mode: "fixed" | "random" | "mixed"
      registration_status:
        | "pending_payment"
        | "confirmed"
        | "waitlist"
        | "cancelled"
      skill_level: "beginner" | "intermediate" | "advanced" | "pro"
      sponsor_slot: "title" | "official" | "partner"
      sponsor_tier: "platform" | "community" | "tournament"
      team_category:
        | "libre"
        | "primera"
        | "segunda"
        | "tercera"
        | "cuarta"
        | "quinta"
        | "sexta"
        | "septima"
        | "queens_libre"
        | "queens_a"
        | "queens_b"
        | "queens_c"
        | "queens_d"
        | "queens_e"
      tournament_format:
        | "americano_fijo"
        | "americano_random"
        | "liguilla_casual"
        | "liga"
        | "express"
        | "eliminacion"
      tournament_status:
        | "draft"
        | "open"
        | "in_progress"
        | "finished"
        | "cancelled"
      tournament_tier: "competitivo" | "casual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_change_status: [
        "suggested",
        "approved",
        "rejected",
        "auto_applied",
      ],
      category_kind: [
        "estandar",
        "suma",
        "mixto_estandar",
        "mixto_suma",
        "queens_estandar",
        "queens_suma",
        "casual",
      ],
      competition_unit: ["team", "player"],
      gender_kind: ["male", "female", "nonbinary", "prefer_not_to_say"],
      match_status: ["scheduled", "in_progress", "completed", "disputed"],
      member_role: ["owner", "admin", "member"],
      notification_type: [
        "tournament_open",
        "tournament_starting",
        "match_scheduled",
        "match_result",
        "team_invite",
        "category_change_suggested",
        "announcement",
        "payment_received",
      ],
      pairing_mode: ["fixed", "random", "mixed"],
      registration_status: [
        "pending_payment",
        "confirmed",
        "waitlist",
        "cancelled",
      ],
      skill_level: ["beginner", "intermediate", "advanced", "pro"],
      sponsor_slot: ["title", "official", "partner"],
      sponsor_tier: ["platform", "community", "tournament"],
      team_category: [
        "libre",
        "primera",
        "segunda",
        "tercera",
        "cuarta",
        "quinta",
        "sexta",
        "septima",
        "queens_libre",
        "queens_a",
        "queens_b",
        "queens_c",
        "queens_d",
        "queens_e",
      ],
      tournament_format: [
        "americano_fijo",
        "americano_random",
        "liguilla_casual",
        "liga",
        "express",
        "eliminacion",
      ],
      tournament_status: [
        "draft",
        "open",
        "in_progress",
        "finished",
        "cancelled",
      ],
      tournament_tier: ["competitivo", "casual"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
