/**
 * Memory Service
 *
 * CRUD operations for the memories table.
 * Uses authenticated user ID from Supabase session.
 *
 * Note: insert uses `as any` cast because our hand-written Database types
 * don't fully satisfy Supabase's deeply-nested generics. Replace with
 * `supabase gen types typescript` output for strict typing once connected.
 */

import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import type { Memory, MemoryInsert, MemoryUpdate } from "@/types/database";

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getMemories(): Promise<Memory[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Memory[];
}

export async function getMemoriesForPerson(
  personId: string
): Promise<Memory[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Memory[];
}

export async function getRecentMemories(limit = 5): Promise<Memory[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Memory[];
}

// ─── Write ──────────────────────────────────────────────────────────────────

export async function createMemory(
  memory: Omit<MemoryInsert, "user_id">
): Promise<Memory> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const row = { ...memory, user_id: userId };
  const { data, error } = await supabase
    .from("memories")
    .insert(row as any)   // eslint-disable-line @typescript-eslint/no-explicit-any
    .select()
    .single();

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Memory;
}

export async function updateMemory(
  id: string,
  updates: MemoryUpdate
): Promise<Memory> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from("memories") as any;
  const { data, error } = await query
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Memory;
}

export async function deleteMemory(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message || "Database operation failed");
}
