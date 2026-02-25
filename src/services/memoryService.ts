/**
 * Memory Service
 *
 * CRUD operations for the memories table.
 * Uses PLACEHOLDER_USER_ID until auth is connected.
 *
 * Note: insert uses `as any` cast because our hand-written Database types
 * don't fully satisfy Supabase's deeply-nested generics. Replace with
 * `supabase gen types typescript` output for strict typing once connected.
 */

import { supabase } from "@/lib/supabase";
import type { Memory, MemoryInsert } from "@/types/database";

const PLACEHOLDER_USER_ID = "u1";

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getMemories(): Promise<Memory[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", PLACEHOLDER_USER_ID)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Memory[];
}

export async function getMemoriesForPerson(
  personId: string
): Promise<Memory[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", PLACEHOLDER_USER_ID)
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Memory[];
}

export async function getRecentMemories(limit = 5): Promise<Memory[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", PLACEHOLDER_USER_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Memory[];
}

// ─── Write ──────────────────────────────────────────────────────────────────

export async function createMemory(
  memory: Omit<MemoryInsert, "user_id">
): Promise<Memory> {
  if (!supabase) throw new Error("Supabase not configured");

  const row = { ...memory, user_id: PLACEHOLDER_USER_ID };
  const { data, error } = await supabase
    .from("memories")
    .insert(row as any)   // eslint-disable-line @typescript-eslint/no-explicit-any
    .select()
    .single();

  if (error) throw error;
  return data as Memory;
}
