/**
 * Interaction Hooks
 *
 * React hooks for interaction data.
 *
 * With Supabase configured, the server is the only source of truth: a
 * failed read surfaces as `error` and a failed write throws. Nothing is
 * substituted for a signed-in user's history.
 *
 * Without Supabase (demo mode), interactions come from the bundled demo
 * data plus anything created on this device, persisted via localStore.
 */

import { useState, useEffect, useCallback } from "react";
import * as interactionService from "@/services/interactionService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { toError } from "@/lib/utils";
import { mockInteractions } from "@/data/mock";
import type { Interaction, InteractionInsert } from "@/types/database";

// ─── Demo-mode Local Persistence ────────────────────────────────────────────
// Only touched when Supabase isn't configured.
const locallyCreatedInteractions: Interaction[] = [];

/** IDs of deleted interactions — tombstones so demo data can't resurrect. */
const locallyDeletedInteractionIds = new Set<string>();

/** Hydrate locally created interactions from disk exactly once per app launch. */
let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = Promise.all([
      loadCollection<Interaction>("interactions"),
      loadCollection<string>("deleted-interactions"),
    ]).then(([stored, deleted]) => {
      locallyCreatedInteractions.push(...stored);
      deleted.forEach((id) => locallyDeletedInteractionIds.add(id));
    });
  }
  return _hydration;
}

function persistInteractions(): void {
  saveCollection("interactions", locallyCreatedInteractions);
}

function persistDeletedInteractions(): void {
  saveCollection("deleted-interactions", [...locallyDeletedInteractionIds]);
}

function isDeleted(i: Interaction): boolean {
  return locallyDeletedInteractionIds.has(i.id);
}

/** Demo-mode interactions: local entries shadow demo data with the same id. */
function localInteractions(): Interaction[] {
  const localIds = new Set(locallyCreatedInteractions.map((i) => i.id));
  return [
    ...locallyCreatedInteractions,
    ...mockInteractions.filter((i) => !localIds.has(i.id)),
  ].filter((i) => !isDeleted(i));
}

function newestFirst(a: Interaction, b: Interaction): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

/** Cascade helper (demo mode): drop every interaction belonging to a removed person. */
export async function removeLocalInteractionsForPerson(personId: string): Promise<void> {
  await ensureHydrated();
  for (let i = locallyCreatedInteractions.length - 1; i >= 0; i--) {
    if (locallyCreatedInteractions[i].person_id === personId) {
      locallyDeletedInteractionIds.add(locallyCreatedInteractions[i].id);
      locallyCreatedInteractions.splice(i, 1);
    }
  }
  for (const it of mockInteractions) {
    if (it.person_id === personId) locallyDeletedInteractionIds.add(it.id);
  }
  persistInteractions();
  persistDeletedInteractions();
}

/** Remove all locally created interactions (sign-out and delete-account flows). */
export function clearLocalInteractions(): void {
  locallyCreatedInteractions.length = 0;
  locallyDeletedInteractionIds.clear();
  persistInteractions();
  persistDeletedInteractions();
}

// ─── usePersonInteractions ──────────────────────────────────────────────────

export function usePersonInteractions(personId: string) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [latestInteraction, setLatestInteraction] =
    useState<Interaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!personId) {
      setInteractions([]);
      setLatestInteraction(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let forPerson: Interaction[];
      if (isSupabaseConfigured) {
        forPerson = await interactionService.getInteractionsForPerson(personId);
      } else {
        await ensureHydrated();
        forPerson = localInteractions().filter((i) => i.person_id === personId);
      }
      const sorted = [...forPerson].sort(newestFirst);
      setInteractions(sorted);
      setLatestInteraction(sorted[0] ?? null);
    } catch (err) {
      setInteractions([]);
      setLatestInteraction(null);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { interactions, latestInteraction, isLoading, error, refetch: fetch };
}

// ─── useCreateInteraction ───────────────────────────────────────────────────

export function useCreateInteraction() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /** Log an interaction. Throws when the server can't be reached. */
  const createInteraction = useCallback(
    async (interaction: Omit<InteractionInsert, "user_id">): Promise<Interaction> => {
      setIsCreating(true);
      setError(null);
      try {
        if (isSupabaseConfigured) {
          return await interactionService.createInteraction(interaction);
        }
        await ensureHydrated();
        const newInteraction: Interaction = {
          id: `i-local-${Date.now()}`,
          user_id: "u1",
          person_id: interaction.person_id,
          type: interaction.type,
          note: interaction.note ?? null,
          emotion: interaction.emotion ?? null,
          created_at: new Date().toISOString(),
        };
        locallyCreatedInteractions.unshift(newInteraction);
        persistInteractions();
        return newInteraction;
      } catch (err) {
        setError(toError(err));
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createInteraction, isCreating, error };
}

// ─── useAllInteractions ────────────────────────────────────────────────────

/** Fetch all interactions (all people). Used for growth bootstrapping and suggestions. */
export function useAllInteractions() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        setInteractions(await interactionService.getAllInteractions());
      } else {
        await ensureHydrated();
        setInteractions(localInteractions());
      }
    } catch (err) {
      setInteractions([]);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { interactions, isLoading, error, refetch: fetch };
}

// ─── useDeleteInteraction ───────────────────────────────────────────────────

export function useDeleteInteraction() {
  const [isDeleting, setIsDeleting] = useState(false);

  /** Remove an interaction. Throws when the server can't be reached. */
  const deleteInteraction = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      if (isSupabaseConfigured) {
        await interactionService.deleteInteraction(id);
        return;
      }
      await ensureHydrated();
      const idx = locallyCreatedInteractions.findIndex((i) => i.id === id);
      if (idx >= 0) locallyCreatedInteractions.splice(idx, 1);
      locallyDeletedInteractionIds.add(id);
      persistInteractions();
      persistDeletedInteractions();
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteInteraction, isDeleting };
}
