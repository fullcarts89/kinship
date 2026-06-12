/**
 * Season Hooks
 *
 * Active-season state for Tending Seasons. Supabase first; local mock
 * persistence fallback. One active season at a time, app-enforced.
 */

import { useState, useEffect, useCallback } from "react";
import * as seasonService from "@/services/seasonService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { SEASON_LENGTH_DAYS, seasonNameFor, MAX_TENDED_PEOPLE } from "@/lib/seasonEngine";
import type { Season, SeasonCommitment, TendingRhythm } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────

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

/** Remove all local season data (delete-account flow). */
export function clearLocalSeasons(): void {
  localSeasons.length = 0;
  localCommitments.length = 0;
  persist();
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

  const refetch = useCallback(async () => {
    await ensureHydrated();
    setIsLoading(true);
    try {
      let seasons: Season[];
      try {
        seasons = await seasonService.getSeasons();
      } catch {
        seasons = [...localSeasons];
      }
      const active = seasons.find((s) => s.status === "active") ?? null;
      if (!active) {
        setSeason(null);
        setCommitments([]);
        setEndedSeason(null);
        return;
      }
      // A season past its end date surfaces as "ended" (retrospective
      // pending) rather than active — but stays untouched until the
      // user closes it themselves.
      const ended = Date.now() >= new Date(active.ends_at).getTime();
      setSeason(ended ? null : active);
      setEndedSeason(ended ? active : null);

      let cs: SeasonCommitment[];
      try {
        cs = await seasonService.getCommitments(active.id);
      } catch {
        cs = localCommitments.filter((c) => c.season_id === active.id);
      }
      setCommitments(cs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const beginSeason = useCallback(
    async (entries: BeginSeasonEntry[]): Promise<Season | null> => {
      await ensureHydrated();
      const capped = entries.slice(0, MAX_TENDED_PEOPLE);
      if (capped.length === 0) return null;
      const now = new Date();
      const ends = new Date(now.getTime() + SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000);
      const seasonInsert = {
        name: seasonNameFor(now),
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
      };
      try {
        const { season: created, commitments: cs } = await seasonService.createSeason(
          seasonInsert,
          capped.map((e) => ({ person_id: e.person_id, rhythm: e.rhythm }))
        );
        localSeasons.push(created);
        localCommitments.push(...cs);
        persist();
        await refetch();
        return created;
      } catch {
        const created: Season = {
          id: `s-local-${Date.now()}`,
          user_id: "u1",
          ...seasonInsert,
          status: "active",
          created_at: now.toISOString(),
        };
        const cs: SeasonCommitment[] = capped.map((e, i) => ({
          id: `sc-local-${Date.now()}-${i}`,
          season_id: created.id,
          user_id: "u1",
          person_id: e.person_id,
          rhythm: e.rhythm,
          created_at: now.toISOString(),
        }));
        localSeasons.push(created);
        localCommitments.push(...cs);
        persist();
        await refetch();
        return created;
      }
    },
    [refetch]
  );

  /** Mark a season completed (called from the retrospective). */
  const completeSeason = useCallback(
    async (seasonId: string): Promise<void> => {
      await ensureHydrated();
      try {
        await seasonService.updateSeason(seasonId, { status: "completed" });
      } catch {
        // mock mode
      }
      const idx = localSeasons.findIndex((s) => s.id === seasonId);
      if (idx >= 0) localSeasons[idx] = { ...localSeasons[idx], status: "completed" };
      persist();
      await refetch();
    },
    [refetch]
  );

  /** Replace the tended set / rhythms mid-season. */
  const updateCommitments = useCallback(
    async (seasonId: string, entries: BeginSeasonEntry[]): Promise<void> => {
      await ensureHydrated();
      const capped = entries.slice(0, MAX_TENDED_PEOPLE);
      try {
        const cs = await seasonService.replaceCommitments(
          seasonId,
          capped.map((e) => ({ person_id: e.person_id, rhythm: e.rhythm }))
        );
        for (let i = localCommitments.length - 1; i >= 0; i--) {
          if (localCommitments[i].season_id === seasonId) localCommitments.splice(i, 1);
        }
        localCommitments.push(...cs);
      } catch {
        for (let i = localCommitments.length - 1; i >= 0; i--) {
          if (localCommitments[i].season_id === seasonId) localCommitments.splice(i, 1);
        }
        localCommitments.push(
          ...capped.map((e, i) => ({
            id: `sc-local-${Date.now()}-${i}`,
            season_id: seasonId,
            user_id: "u1",
            person_id: e.person_id,
            rhythm: e.rhythm,
            created_at: new Date().toISOString(),
          }))
        );
      }
      persist();
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
    refetch,
    beginSeason,
    completeSeason,
    updateCommitments,
  };
}
