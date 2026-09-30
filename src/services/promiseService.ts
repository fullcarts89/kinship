/**
 * Promise Service
 *
 * Supabase CRUD for promises — one-shot commitments the user made to a
 * person. Mirrors the patterns in personService/memoryService; failures
 * throw so hooks can surface them.
 */

import { supabase } from "@/lib/supabase";
import type { PersonPromise, PersonPromiseInsert, PersonPromiseUpdate } from "@/types/database";

async function getAuthUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getPromises(): Promise<PersonPromise[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("promises")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message || "Database operation failed");
  return data as PersonPromise[];
}

export async function countOpenPromisesForPerson(personId: string): Promise<number> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { count, error } = await supabase
    .from("promises")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("person_id", personId)
    .eq("status", "open");
  if (error) throw new Error(error.message || "Database operation failed");
  return count ?? 0;
}

export async function createPromise(
  promise: Omit<PersonPromiseInsert, "user_id">
): Promise<PersonPromise> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const row = { ...promise, user_id: userId };
  const { data, error } = await supabase
    .from("promises")
    .insert(row as never)
    .select()
    .single();
  if (error) throw new Error(error.message || "Database operation failed");
  return data as PersonPromise;
}

export async function updatePromise(
  id: string,
  updates: PersonPromiseUpdate
): Promise<PersonPromise> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from("promises") as any;
  const { data, error } = await query
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message || "Database operation failed");
  return data as PersonPromise;
}
