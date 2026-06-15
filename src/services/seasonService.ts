/**
 * Season Service — Supabase CRUD for Tending Seasons.
 * Hooks fall back to local mock persistence when these throw.
 */

import { supabase } from "@/lib/supabase";
import type {
  Season,
  SeasonInsert,
  SeasonUpdate,
  SeasonCommitment,
  SeasonCommitmentInsert,
} from "@/types/database";

async function getAuthUserId(): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getSeasons(): Promise<Season[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message || "Database operation failed");
  return data as Season[];
}

export async function getCommitments(seasonId: string): Promise<SeasonCommitment[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("season_commitments")
    .select("*")
    .eq("user_id", userId)
    .eq("season_id", seasonId);
  if (error) throw new Error(error.message || "Database operation failed");
  return data as SeasonCommitment[];
}

export async function createSeason(
  season: Omit<SeasonInsert, "user_id">,
  commitments: Omit<SeasonCommitmentInsert, "user_id" | "season_id">[]
): Promise<{ season: Season; commitments: SeasonCommitment[] }> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { data: seasonRow, error } = await supabase
    .from("seasons")
    .insert({ ...season, user_id: userId } as never)
    .select()
    .single();
  if (error) throw new Error(error.message || "Database operation failed");
  const created = seasonRow as Season;

  const rows = commitments.map((c) => ({
    ...c,
    season_id: created.id,
    user_id: userId,
  }));
  const { data: commitmentRows, error: cErr } = await supabase
    .from("season_commitments")
    .insert(rows as never)
    .select();
  if (cErr) throw new Error(cErr.message || "Database operation failed");
  return { season: created, commitments: commitmentRows as SeasonCommitment[] };
}

export async function updateSeason(id: string, updates: SeasonUpdate): Promise<Season> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from("seasons") as any;
  const { data, error } = await query
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message || "Database operation failed");
  return data as Season;
}

export async function replaceCommitments(
  seasonId: string,
  commitments: Omit<SeasonCommitmentInsert, "user_id" | "season_id">[]
): Promise<SeasonCommitment[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const userId = await getAuthUserId();
  const { error: delErr } = await supabase
    .from("season_commitments")
    .delete()
    .eq("season_id", seasonId)
    .eq("user_id", userId);
  if (delErr) throw new Error(delErr.message || "Database operation failed");
  const rows = commitments.map((c) => ({ ...c, season_id: seasonId, user_id: userId }));
  const { data, error } = await supabase
    .from("season_commitments")
    .insert(rows as never)
    .select();
  if (error) throw new Error(error.message || "Database operation failed");
  return data as SeasonCommitment[];
}
