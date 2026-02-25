/**
 * Person Service
 *
 * CRUD operations for the persons table.
 * Uses PLACEHOLDER_USER_ID until auth is connected.
 *
 * Note: insert/update use `as any` casts because our hand-written Database
 * types don't fully satisfy Supabase's deeply-nested generics. Replace with
 * `supabase gen types typescript` output for strict typing once connected.
 */

import { supabase } from "@/lib/supabase";
import type { Person, PersonInsert, PersonUpdate } from "@/types/database";

const PLACEHOLDER_USER_ID = "u1";

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getPersons(): Promise<Person[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", PLACEHOLDER_USER_ID)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Person[];
}

export async function getPersonById(id: string): Promise<Person | null> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("id", id)
    .eq("user_id", PLACEHOLDER_USER_ID)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return data as Person;
}

// ─── Write ──────────────────────────────────────────────────────────────────

export async function createPerson(
  person: Omit<PersonInsert, "user_id">
): Promise<Person> {
  if (!supabase) throw new Error("Supabase not configured");

  const row = { ...person, user_id: PLACEHOLDER_USER_ID };
  const { data, error } = await supabase
    .from("persons")
    .insert(row as any)   // eslint-disable-line @typescript-eslint/no-explicit-any
    .select()
    .single();

  if (error) throw error;
  return data as Person;
}

export async function updatePerson(
  id: string,
  updates: PersonUpdate
): Promise<Person> {
  if (!supabase) throw new Error("Supabase not configured");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from("persons") as any;
  const { data, error } = await query
    .update(updates)
    .eq("id", id)
    .eq("user_id", PLACEHOLDER_USER_ID)
    .select()
    .single();

  if (error) throw error;
  return data as Person;
}

export async function deletePerson(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase
    .from("persons")
    .delete()
    .eq("id", id)
    .eq("user_id", PLACEHOLDER_USER_ID);

  if (error) throw error;
}
