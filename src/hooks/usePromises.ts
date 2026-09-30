/**
 * Promise Hooks
 *
 * React hooks for promises — one-shot commitments the user made to a
 * person. With Supabase configured, the server is the only source of
 * truth and failures surface (reads as `error`, writes by throwing).
 * Without Supabase (demo mode), promises persist on-device, matching the
 * established locallyCreated pattern. Resolved promises (kept/released)
 * stay in storage as status updates — no tombstones needed.
 */

import { useState, useEffect, useCallback } from "react";
import * as promiseService from "@/services/promiseService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { toError } from "@/lib/utils";
import type { PersonPromise, PersonPromiseInsert, PersonPromiseUpdate } from "@/types/database";

// ─── Demo-mode Local Persistence ────────────────────────────────────────────
// Only touched when Supabase isn't configured.
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

/** Remove all locally created promises (sign-out and delete-account flows). */
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
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let all: PersonPromise[];
      if (isSupabaseConfigured) {
        all = await promiseService.getPromises();
      } else {
        await ensureHydrated();
        all = locallyCreatedPromises;
      }
      setPromises(all.filter((p) => p.status === "open"));
    } catch (err) {
      setPromises([]);
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

  /**
   * Hold a promise. Resolves to null when the person already has the
   * maximum number of open promises; throws when the server can't be
   * reached.
   */
  const createPromise = useCallback(
    async (
      promise: Omit<PersonPromiseInsert, "user_id">
    ): Promise<PersonPromise | null> => {
      setIsCreating(true);
      try {
        if (isSupabaseConfigured) {
          // Silent cap — oldest open promises surface first elsewhere
          const openForPerson = await promiseService.countOpenPromisesForPerson(
            promise.person_id
          );
          if (openForPerson >= MAX_OPEN_PER_PERSON) return null;
          return await promiseService.createPromise(promise);
        }

        await ensureHydrated();
        const openForPerson = locallyCreatedPromises.filter(
          (p) => p.person_id === promise.person_id && p.status === "open"
        );
        if (openForPerson.length >= MAX_OPEN_PER_PERSON) return null;
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

  /**
   * Resolve as "kept" or "released". Both are terminal; neither is judged.
   * Throws when the server can't be reached.
   */
  const resolvePromise = useCallback(
    async (id: string, status: "kept" | "released"): Promise<void> => {
      setIsResolving(true);
      const updates: PersonPromiseUpdate = {
        status,
        resolved_at: new Date().toISOString(),
      };
      try {
        if (isSupabaseConfigured) {
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
