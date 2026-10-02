/**
 * Interaction Hooks
 *
 * React hooks for interaction data. Signed in, they read and write the
 * server only and surface failures (see src/lib/dataMode.ts). In demo mode
 * (no backend) interactions live on the device alongside the demo garden.
 */

import { useState, useEffect, useCallback } from "react";
import * as interactionService from "@/services/interactionService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { isDemoMode, toError } from "@/lib/dataMode";
import { mockInteractions } from "@/data/mock";
import type { Interaction, InteractionInsert } from "@/types/database";

// ─── Demo-mode Persistence ─────────────────────────────────────────────────
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

/** Cascade helper: drop every interaction belonging to a removed person. */
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

/** Remove all locally created interactions (used by the delete-account flow). */
export function clearLocalInteractions(): void {
  locallyCreatedInteractions.length = 0;
  locallyDeletedInteractionIds.clear();
  persistInteractions();
  persistDeletedInteractions();
}

/** Demo mode: locally created + demo interactions (local shadows demo). */
function demoInteractions(): Interaction[] {
  const localIds = new Set(locallyCreatedInteractions.map((i) => i.id));
  return [
    ...locallyCreatedInteractions,
    ...mockInteractions.filter((i) => !localIds.has(i.id)),
  ].filter((i) => !isDeleted(i));
}

function newestFirst(a: Interaction, b: Interaction): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

// ─── usePersonInteractions ──────────────────────────────────────────────────

export function usePersonInteractions(personId: string) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [latestInteraction, setLatestInteraction] =
    useState<Interaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let forPerson: Interaction[];
      if (isDemoMode) {
        await ensureHydrated();
        forPerson = demoInteractions().filter((i) => i.person_id === personId);
      } else {
        forPerson = await interactionService.getInteractionsForPerson(personId);
      }
      const sorted = [...forPerson].sort(newestFirst);
      setInteractions(sorted);
      setLatestInteraction(sorted[0] ?? null);
    } catch (err) {
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

  /** Signed in, a failed save rejects; nothing is kept on the device. */
  const createInteraction = useCallback(
    async (interaction: Omit<InteractionInsert, "user_id">) => {
      setIsCreating(true);
      setError(null);
      try {
        if (!isDemoMode) return await interactionService.createInteraction(interaction);
        await ensureHydrated();
        const newInteraction: Interaction = {
          id: `i-local-${Date.now()}`,
          user_id: "demo",
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
      if (isDemoMode) {
        await ensureHydrated();
        setInteractions(demoInteractions());
      } else {
        setInteractions(await interactionService.getAllInteractions());
      }
    } catch (err) {
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

  /** Signed in, a failed delete rejects and the interaction stays. */
  const deleteInteraction = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      if (!isDemoMode) {
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
