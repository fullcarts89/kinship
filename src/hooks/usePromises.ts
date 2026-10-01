/**
 * Promise Hooks
 *
 * React hooks for promises — one-shot commitments the user made to a
 * person. Signed in, they read and write the server only and surface
 * failures (see src/lib/dataMode.ts); in demo mode (no backend) promises
 * live on the device. Resolved promises (kept/released) stay in storage as
 * status updates — no tombstones needed.
 */

import { useState, useEffect, useCallback } from "react";
import * as promiseService from "@/services/promiseService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { isDemoMode, toError } from "@/lib/dataMode";
import type { PersonPromise, PersonPromiseInsert, PersonPromiseUpdate } from "@/types/database";

// ─── Demo-mode Persistence ─────────────────────────────────────────────────
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

/** Every promise for the current mode: the server's, or the device's in demo mode. */
async function allPromises(): Promise<PersonPromise[]> {
  if (!isDemoMode) return promiseService.getPromises();
  await ensureHydrated();
  return [...locallyCreatedPromises];
}

// ─── useOpenPromises (all people) ───────────────────────────────────────────

export function useOpenPromises() {
  const [promises, setPromises] = useState<PersonPromise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const all = await allPromises();
      setPromises(all.filter((p) => p.status === "open"));
    } catch (err) {
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { promises, isLoading, error, refetch: fetch };
}

// ─── usePersonPromises ──────────────────────────────────────────────────────

export function usePersonPromises(personId: string) {
  const { promises, isLoading, error, refetch } = useOpenPromises();
  return {
    promises: promises.filter((p) => p.person_id === personId),
    isLoading,
    error,
    refetch,
  };
}

// ─── useCreatePromise ───────────────────────────────────────────────────────

export function useCreatePromise() {
  const [isCreating, setIsCreating] = useState(false);

  /** Signed in, a failed save rejects; nothing is kept on the device. */
  const createPromise = useCallback(
    async (
      promise: Omit<PersonPromiseInsert, "user_id">
    ): Promise<PersonPromise | null> => {
      setIsCreating(true);
      try {
        // Silent cap — oldest open promises surface first elsewhere
        const openForPerson = (await allPromises()).filter(
          (p) => p.person_id === promise.person_id && p.status === "open"
        );
        if (openForPerson.length >= MAX_OPEN_PER_PERSON) return null;

        if (!isDemoMode) return await promiseService.createPromise(promise);
        const newPromise: PersonPromise = {
          id: `pr-local-${Date.now()}`,
          user_id: "demo",
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

  /**
   * Resolve as "kept" or "released". Both are terminal; neither is judged.
   * Signed in, a failed update rejects and the promise stays open.
   */
  const resolvePromise = useCallback(
    async (id: string, status: "kept" | "released"): Promise<void> => {
      setIsResolving(true);
      const updates: PersonPromiseUpdate = {
        status,
        resolved_at: new Date().toISOString(),
      };
      try {
        if (!isDemoMode) {
          await promiseService.updatePromise(id, updates);
          return;
        }
        await ensureHydrated();
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
