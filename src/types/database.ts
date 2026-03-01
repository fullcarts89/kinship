/**
 * Database Schema Types
 *
 * Maps to the Supabase tables defined in the PRD.
 * Conforms to the Supabase JS client's GenericSchema shape
 * (Row, Insert, Update, Relationships on every table).
 *
 * Will be auto-generated from Supabase once connected.
 */

import type {
  RelationshipType,
  Emotion,
  InteractionType,
  SuggestionType,
  SuggestionStatus,
} from "./index";

// ─── Table Row Types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  relationship_type: RelationshipType;
  birthday?: string; // ISO date string, e.g. "1990-03-15" — year optional
  phone?: string | null;   // From device contacts import
  email?: string | null;   // From device contacts import
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  person_id: string;
  content: string;
  emotion: Emotion | null;
  photo_url: string | null;
  created_at: string;
}

/**
 * Interaction — a recorded touchpoint with a person.
 *
 * "Reflections" are interactions created through the Reflect flow.
 * They may include an optional note and emotion, adding warmth
 * beyond a bare type + timestamp. Reflections and auto-logged
 * interactions (from the reach-out flow) share the same table —
 * a reflection is simply an interaction with richer detail.
 */
export interface Interaction {
  id: string;
  user_id: string;
  person_id: string;
  type: InteractionType;
  note: string | null;
  emotion: Emotion | null;
  created_at: string;
}

export interface Suggestion {
  id: string;
  user_id: string;
  person_id: string;
  type: SuggestionType;
  status: SuggestionStatus;
  created_at: string;
}

// ─── Insert Types (omit server-generated fields) ─────────────────────────────

export type UserInsert = Omit<User, "id" | "created_at">;
export type PersonInsert = Omit<Person, "id" | "created_at">;
export type MemoryInsert = Omit<Memory, "id" | "created_at" | "photo_url"> & { photo_url?: string | null };
/**
 * InteractionInsert — note and emotion are optional since bare
 * interactions (e.g. from the reach-out flow) don't include them.
 * Reflections set them explicitly; everything else can omit them.
 */
export type InteractionInsert = Omit<Interaction, "id" | "created_at" | "note" | "emotion"> & {
  note?: string | null;
  emotion?: Emotion | null;
};
export type SuggestionInsert = Omit<Suggestion, "id" | "created_at">;

// ─── Update Types (all fields optional except id) ────────────────────────────

export type UserUpdate = Partial<Omit<User, "id" | "created_at">>;
export type PersonUpdate = Partial<Omit<Person, "id" | "user_id" | "created_at">>;
export type MemoryUpdate = Partial<Omit<Memory, "id" | "user_id" | "created_at">>;
export type InteractionUpdate = Partial<Omit<Interaction, "id" | "user_id" | "created_at">>;
export type SuggestionUpdate = Partial<Omit<Suggestion, "id" | "user_id" | "created_at">>;

// ─── Database Schema (Supabase GenericSchema) ───────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      persons: {
        Row: Person;
        Insert: PersonInsert;
        Update: PersonUpdate;
        Relationships: [];
      };
      memories: {
        Row: Memory;
        Insert: MemoryInsert;
        Update: MemoryUpdate;
        Relationships: [];
      };
      interactions: {
        Row: Interaction;
        Insert: InteractionInsert;
        Update: InteractionUpdate;
        Relationships: [];
      };
      suggestions: {
        Row: Suggestion;
        Insert: SuggestionInsert;
        Update: SuggestionUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
