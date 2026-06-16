/**
 * Gift Service
 *
 * Supabase CRUD for gifts — records of gifts the user gave to or received
 * from a person. Mirrors the patterns in promiseService/personService;
 * hooks fall back to local mock persistence when these throw.
 */

import { supabase } from "@/lib/supabase";
import type { Gift, GiftInsert } from "@/types/database";

async function getAuthUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getGifts(): Promise<Gift[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("gifts")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message || "Database operation failed");
  return data as Gift[];
}

export async function createGift(
  gift: Omit<GiftInsert, "user_id">
): Promise<Gift> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const row = { ...gift, user_id: userId };
  const { data, error } = await supabase
    .from("gifts")
    .insert(row as never)
    .select()
    .single();
  if (error) throw new Error(error.message || "Database operation failed");
  return data as Gift;
}

export async function deleteGift(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { error } = await supabase
    .from("gifts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message || "Database operation failed");
}
