/**
 * Season Hooks
 *
 * Active-season state for Tending Seasons. With Supabase configured, the
 * server is the only source of truth and failures surface (reads as
 * `error`, writes by throwing). Without Supabase (demo mode), seasons
 * persist on-device. One active season at a time, app-enforced.
 */

import { useState, useEffect, useCallback } from "react";
import * as seasonService from "@/services/seasonService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { toError } from "@/lib/utils";
import { SEASON_LENGTH_DAYS, seasonNameFor, MAX_TENDED_PEOPLE } from "@/lib/seasonEngine";
import type { Season, SeasonCommitment, TendingRhythm } from "@/types/database";

// ─── Demo-mode Local Persistence ────────────────────────────────────────────
// Only touched when Supabase isn't configured.

const localSeasons: Season[] = [];
const localCommitments: SeasonCommitment[] = [];

let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = Promise.all([
      loadCollection<Season>("seasons"),
      loadCollection<SeasonCommitment>("season-commitments"),
    ]).then(([seasons, commitments]) => {
      localSeasons.push(...seasons);
      localCommitments.push(...commitments);
    });
  }
  return _hydration;
}

function persist(): void {
  saveCollection("seasons", localSeasons);
  saveCollection("season-commitments", localCommitments);
}

/** Remove all local season data (sign-out and delete-account flows). */
export function clearLocalSeasons(): void {
  localSeasons.length = 0;
  localCommitments.length = 0;
  persist();
}

function replaceLocalCommitments(seasonId: string, next: SeasonCommitment[]): void {
  for (let i = localCommitments.length - 1; i >= 0; i--) {
    if (localCommitments[i].season_id === seasonId) localCommitments.splice(i, 1);
  }
  localCommitments.push(...next);
}

export interface BeginSeasonEntry {
  person_id: string;
  rhythm: TendingRhythm;
}

// ─── useActiveSeason ────────────────────────────────────────────────────────

export function useActiveSeason() {
  const [season, setSeason] = useState<Season | null>(null);
  const [commitments, setCommitments] = useState<SeasonCommitment[]>([]);
  const [endedSeason, setEndedSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let seasons: Season[];
      if (isSupabaseConfigured) {
        seasons = await seasonService.getSeasons();
      } else {
        await ensureHydrated();
        seasons = [...localSeasons];
      }
      const active = seasons.find((s) => s.status === "active") ?? null;
      if (!active) {
        setSeason(null);
        setCommitments([]);
        setEndedSeason(null);
        return;
      }

      const cs = isSupabaseConfigured
        ? await seasonService.getCommitments(active.id)
        : localCommitments.filter((c) => c.season_id === active.id);

      // A season past its end date surfaces as "ended" (retrospective
      // pending) rather than active — but stays untouched until the
      // user closes it themselves.
      const ended = Date.now() >= new Date(active.ends_at).getTime();
      setSeason(ended ? null : active);
      setEndedSeason(ended ? active : null);
      setCommitments(cs);
    } catch (err) {
      setSeason(null);
      setCommitments([]);
      setEndedSeason(null);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Begin a season. Throws when the server can't be reached. */
  const beginSeason = useCallback(
    async (entries: BeginSeasonEntry[]): Promise<Season | null> => {
      const capped = entries.slice(0, MAX_TENDED_PEOPLE);
      if (capped.length === 0) return null;
      const now = new Date();
      const ends = new Date(now.getTime() + SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000);
      const seasonInsert = {
        name: seasonNameFor(now),
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
      };

      let created: Season;
      if (isSupabaseConfigured) {
        ({ season: created } = await seasonService.createSeason(
          seasonInsert,
          capped.map((e) => ({ person_id: e.person_id, rhythm: e.rhythm }))
        ));
      } else {
        await ensureHydrated();
        created = {
          id: `s-local-${Date.now()}`,
          user_id: "u1",
          ...seasonInsert,
          status: "active",
          created_at: now.toISOString(),
        };
        localSeasons.push(created);
        localCommitments.push(
          ...capped.map((e, i) => ({
            id: `sc-local-${Date.now()}-${i}`,
            season_id: created.id,
            user_id: "u1",
            person_id: e.person_id,
            rhythm: e.rhythm,
            created_at: now.toISOString(),
          }))
        );
        persist();
      }
      await refetch();
      return created;
    },
    [refetch]
  );

  /**
   * Mark a season completed (called from the retrospective). Throws when
   * the server can't be reached.
   */
  const completeSeason = useCallback(
    async (seasonId: string): Promise<void> => {
      if (isSupabaseConfigured) {
        await seasonService.updateSeason(seasonId, { status: "completed" });
      } else {
        await ensureHydrated();
        const idx = localSeasons.findIndex((s) => s.id === seasonId);
        if (idx >= 0) localSeasons[idx] = { ...localSeasons[idx], status: "completed" };
        persist();
      }
      await refetch();
    },
    [refetch]
  );

  /**
   * Replace the tended set / rhythms mid-season. Throws when the server
   * can't be reached.
   */
  const updateCommitments = useCallback(
    async (seasonId: string, entries: BeginSeasonEntry[]): Promise<void> => {
      const capped = entries.slice(0, MAX_TENDED_PEOPLE);
      if (isSupabaseConfigured) {
        await seasonService.replaceCommitments(
          seasonId,
          capped.map((e) => ({ person_id: e.person_id, rhythm: e.rhythm }))
        );
      } else {
        await ensureHydrated();
        replaceLocalCommitments(
          seasonId,
          capped.map((e, i) => ({
            id: `sc-local-${Date.now()}-${i}`,
            season_id: seasonId,
            user_id: "u1",
            person_id: e.person_id,
            rhythm: e.rhythm,
            created_at: new Date().toISOString(),
          }))
        );
        persist();
      }
      await refetch();
    },
    [refetch]
  );

  return {
    season,
    commitments,
    /** A season whose end date passed — retrospective pending. */
    endedSeason,
    isLoading,
    error,
    refetch,
    beginSeason,
    completeSeason,
    updateCommitments,
  };
}
