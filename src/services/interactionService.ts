/**
 * Interaction Service
 *
 * CRUD operations for the interactions table.
 * Uses PLACEHOLDER_USER_ID until auth is connected.
 *
 * Note: insert uses `as any` cast because our hand-written Database types
 * don't fully satisfy Supabase's deeply-nested generics. Replace with
 * `supabase gen types typescript` output for strict typing once connected.
 */

import { supabase } from "@/lib/supabase";
import type { Interaction, InteractionInsert } from "@/types/database";

const PLACEHOLDER_USER_ID = "u1";

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getInteractionsForPerson(
  personId: string
): Promise<Interaction[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", PLACEHOLDER_USER_ID)
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Interaction[];
}

export async function getLatestInteraction(
  personId: string
): Promise<Interaction | null> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", PLACEHOLDER_USER_ID)
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Interaction | null;
}

// ─── Write ──────────────────────────────────────────────────────────────────

export async function createInteraction(
  interaction: Omit<InteractionInsert, "user_id">
): Promise<Interaction> {
  if (!supabase) throw new Error("Supabase not configured");

  const row = { ...interaction, user_id: PLACEHOLDER_USER_ID };
  const { data, error } = await supabase
    .from("interactions")
    .insert(row as any)   // eslint-disable-line @typescript-eslint/no-explicit-any
    .select()
    .single();

  if (error) throw error;
  return data as Interaction;
}
