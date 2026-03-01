/**
 * Interaction Service
 *
 * CRUD operations for the interactions table.
 * Uses authenticated user ID from Supabase session.
 *
 * Note: insert uses `as any` cast because our hand-written Database types
 * don't fully satisfy Supabase's deeply-nested generics. Replace with
 * `supabase gen types typescript` output for strict typing once connected.
 */

import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import type { Interaction, InteractionInsert } from "@/types/database";

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getInteractionsForPerson(
  personId: string
): Promise<Interaction[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Interaction[];
}

export async function getLatestInteraction(
  personId: string
): Promise<Interaction | null> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Interaction | null;
}

export async function getAllInteractions(): Promise<Interaction[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Interaction[];
}

// ─── Write ──────────────────────────────────────────────────────────────────

export async function createInteraction(
  interaction: Omit<InteractionInsert, "user_id">
): Promise<Interaction> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const row = { ...interaction, user_id: userId };
  const { data, error } = await supabase
    .from("interactions")
    .insert(row as any)   // eslint-disable-line @typescript-eslint/no-explicit-any
    .select()
    .single();

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Interaction;
}
