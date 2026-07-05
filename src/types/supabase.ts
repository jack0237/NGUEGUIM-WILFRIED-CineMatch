export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
        ]
      }
      group_swipes: {
        Row: {
          action: 'like' | 'dislike'
          group_id: string
          id: string
          movie_genre_ids: number[]
          movie_id: number
          movie_poster_path: string | null
          movie_release_date: string | null
          movie_title: string
          movie_vote_average: number
          swiped_at: string
          user_id: string
        }
        Insert: {
          action: 'like' | 'dislike'
          group_id: string
          id?: string
          movie_genre_ids?: number[]
          movie_id: number
          movie_poster_path?: string | null
          movie_release_date?: string | null
          movie_title: string
          movie_vote_average?: number
          swiped_at?: string
          user_id: string
        }
        Update: {
          action?: 'like' | 'dislike'
          group_id?: string
          id?: string
          movie_genre_ids?: number[]
          movie_id?: number
          movie_poster_path?: string | null
          movie_release_date?: string | null
          movie_title?: string
          movie_vote_average?: number
          swiped_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'group_swipes_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
        ]
      }
      swipe_history: {
        Row: {
          action: 'like' | 'dislike'
          id: string
          movie_genre_ids: number[]
          movie_id: number
          movie_poster_path: string | null
          movie_release_date: string | null
          movie_title: string
          movie_vote_average: number
          swiped_at: string
          user_id: string
        }
        Insert: {
          action: 'like' | 'dislike'
          id?: string
          movie_genre_ids?: number[]
          movie_id: number
          movie_poster_path?: string | null
          movie_release_date?: string | null
          movie_title: string
          movie_vote_average?: number
          swiped_at?: string
          user_id: string
        }
        Update: {
          action?: 'like' | 'dislike'
          id?: string
          movie_genre_ids?: number[]
          movie_id?: number
          movie_poster_path?: string | null
          movie_release_date?: string | null
          movie_title?: string
          movie_vote_average?: number
          swiped_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_group: {
        Args: { p_name: string }
        Returns: Database['public']['Tables']['groups']['Row']
      }
      join_group: {
        Args: { p_code: string }
        Returns: Database['public']['Tables']['groups']['Row']
      }
      is_group_member: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      get_group_members: {
        Args: { p_group_id: string }
        Returns: {
          user_id: string
          username: string | null
          avatar_url: string | null
          joined_at: string
          swipe_count: number
        }[]
      }
      get_group_matches: {
        Args: { p_group_id: string }
        Returns: {
          movie_id: number
          movie_title: string
          movie_poster_path: string | null
          movie_vote_average: number
          movie_release_date: string | null
          movie_genre_ids: number[]
          matched_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Row']

export type SwipeHistory = Tables<'swipe_history'>
export type Profile = Tables<'profiles'>
export type SwipeAction = 'like' | 'dislike'
export type Group = Tables<'groups'>
export type GroupSwipe = Tables<'group_swipes'>
export type GroupMemberInfo =
  DefaultSchema['Functions']['get_group_members']['Returns'][number]
export type GroupMatch =
  DefaultSchema['Functions']['get_group_matches']['Returns'][number]
