/**
 * Person Service
 *
 * CRUD operations for the persons table.
 * Uses authenticated user ID from Supabase session.
 *
 * Note: insert/update use `as any` casts because our hand-written Database
 * types don't fully satisfy Supabase's deeply-nested generics. Replace with
 * `supabase gen types typescript` output for strict typing once connected.
 */

import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import type { Person, PersonInsert, PersonUpdate } from "@/types/database";

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getPersons(): Promise<Person[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Person[];
}

export async function getPersonById(id: string): Promise<Person | null> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(error.message || "Database operation failed");
  }
  return data as Person;
}

// ─── Write ──────────────────────────────────────────────────────────────────

export async function createPerson(
  person: Omit<PersonInsert, "user_id">
): Promise<Person> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const row = { ...person, user_id: userId };
  const { data, error } = await supabase
    .from("persons")
    .insert(row as any)   // eslint-disable-line @typescript-eslint/no-explicit-any
    .select()
    .single();

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Person;
}

export async function updatePerson(
  id: string,
  updates: PersonUpdate
): Promise<Person> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from("persons") as any;
  const { data, error } = await query
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Database operation failed");
  return data as Person;
}

export async function deletePerson(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("persons")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message || "Database operation failed");
}
