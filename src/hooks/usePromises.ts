/**
 * Promise Hooks
 *
 * React hooks for promises — one-shot commitments the user made to a
 * person. Supabase first; local mock persistence fallback, matching the
 * established locallyCreated pattern. Resolved promises (kept/released)
 * stay in storage as status updates — no tombstones needed.
 */

import { useState, useEffect, useCallback } from "react";
import * as promiseService from "@/services/promiseService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import type { PersonPromise, PersonPromiseInsert, PersonPromiseUpdate } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────
const locallyCreatedPromises: PersonPromise[] = [];

let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = loadCollection<PersonPromise>("promises").then((stored) => {
      locallyCreatedPromises.push(...stored);
    });
  }
  return _hydration;
}

function persistPromises(): void {
  saveCollection("promises", locallyCreatedPromises);
}

/** Remove all locally created promises (delete-account flow). */
export function clearLocalPromises(): void {
  locallyCreatedPromises.length = 0;
  persistPromises();
}

function upsertLocal(promise: PersonPromise): void {
  const idx = locallyCreatedPromises.findIndex((p) => p.id === promise.id);
  if (idx >= 0) locallyCreatedPromises[idx] = promise;
  else locallyCreatedPromises.push(promise);
  persistPromises();
}

/** Max open promises per person — silently enforced, never surfaced. */
const MAX_OPEN_PER_PERSON = 7;

// ─── useOpenPromises (all people) ───────────────────────────────────────────

export function useOpenPromises() {
  const [promises, setPromises] = useState<PersonPromise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    await ensureHydrated();
    try {
      setIsLoading(true);
      const data = await promiseService.getPromises();
      const localIds = new Set(locallyCreatedPromises.map((p) => p.id));
      const merged = [
        ...locallyCreatedPromises,
        ...data.filter((p) => !localIds.has(p.id)),
      ];
      setPromises(merged.filter((p) => p.status === "open"));
    } catch {
      setPromises(locallyCreatedPromises.filter((p) => p.status === "open"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { promises, isLoading, refetch: fetch };
}

// ─── usePersonPromises ──────────────────────────────────────────────────────

export function usePersonPromises(personId: string) {
  const { promises, isLoading, refetch } = useOpenPromises();
  return {
    promises: promises.filter((p) => p.person_id === personId),
    isLoading,
    refetch,
  };
}

// ─── useCreatePromise ───────────────────────────────────────────────────────

export function useCreatePromise() {
  const [isCreating, setIsCreating] = useState(false);

  const createPromise = useCallback(
    async (
      promise: Omit<PersonPromiseInsert, "user_id">
    ): Promise<PersonPromise | null> => {
      await ensureHydrated();
      // Silent cap — oldest open promises surface first elsewhere
      const openForPerson = locallyCreatedPromises.filter(
        (p) => p.person_id === promise.person_id && p.status === "open"
      );
      if (openForPerson.length >= MAX_OPEN_PER_PERSON) return null;

      setIsCreating(true);
      try {
        const created = await promiseService.createPromise(promise);
        upsertLocal(created);
        return created;
      } catch {
        const newPromise: PersonPromise = {
          id: `pr-local-${Date.now()}`,
          user_id: "u1",
          person_id: promise.person_id,
          text: promise.text,
          due_hint: promise.due_hint ?? null,
          status: "open",
          source: promise.source,
          created_at: new Date().toISOString(),
          resolved_at: null,
        };
        upsertLocal(newPromise);
        return newPromise;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createPromise, isCreating };
}

// ─── useResolvePromise ──────────────────────────────────────────────────────

export function useResolvePromise() {
  const [isResolving, setIsResolving] = useState(false);

  /** Resolve as "kept" or "released". Both are terminal; neither is judged. */
  const resolvePromise = useCallback(
    async (id: string, status: "kept" | "released"): Promise<void> => {
      await ensureHydrated();
      setIsResolving(true);
      const updates: PersonPromiseUpdate = {
        status,
        resolved_at: new Date().toISOString(),
      };
      try {
        const updated = await promiseService.updatePromise(id, updates);
        upsertLocal(updated);
      } catch {
        const existing = locallyCreatedPromises.find((p) => p.id === id);
        if (existing) upsertLocal({ ...existing, ...updates });
      } finally {
        setIsResolving(false);
      }
    },
    []
  );

  return { resolvePromise, isResolving };
}
