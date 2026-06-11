/**
 * Interaction Hooks
 *
 * React hooks for interaction data. Attempts to read from Supabase first;
 * on failure, falls back to module-level mock data so the app works
 * in demo / development mode without a configured backend.
 */

import { useState, useEffect, useCallback } from "react";
import * as interactionService from "@/services/interactionService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { mockInteractions } from "@/data/mock";
import type { Interaction, InteractionInsert } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────
const locallyCreatedInteractions: Interaction[] = [];

/** Hydrate locally created interactions from disk exactly once per app launch. */
let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = loadCollection<Interaction>("interactions").then((stored) => {
      locallyCreatedInteractions.push(...stored);
    });
  }
  return _hydration;
}

function persistInteractions(): void {
  saveCollection("interactions", locallyCreatedInteractions);
}

/** Remove all locally created interactions (used by the delete-account flow). */
export function clearLocalInteractions(): void {
  locallyCreatedInteractions.length = 0;
  persistInteractions();
}

// ─── usePersonInteractions ──────────────────────────────────────────────────

export function usePersonInteractions(personId: string) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [latestInteraction, setLatestInteraction] =
    useState<Interaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    await ensureHydrated();
    try {
      setIsLoading(true);
      setError(null);
      const [allInteractions, latest] = await Promise.all([
        interactionService.getInteractionsForPerson(personId),
        interactionService.getLatestInteraction(personId),
      ]);
      // Always merge locally created interactions so saves persist across refetches
      const localForPerson = locallyCreatedInteractions.filter((i) => i.person_id === personId);
      const localIds = new Set(localForPerson.map((i) => i.id));
      const merged = [...localForPerson, ...allInteractions.filter((i) => !localIds.has(i.id))];
      const sorted = merged.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setInteractions(sorted);
      setLatestInteraction(sorted[0] ?? null);
    } catch {
      // Mock mode — merge locally created + mock data, filtered by person
      const allMock = [...locallyCreatedInteractions, ...mockInteractions].filter(
        (i) => i.person_id === personId
      );
      const sorted = allMock.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setInteractions(sorted);
      setLatestInteraction(sorted[0] ?? null);
      setError(null);
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

  const createInteraction = useCallback(
    async (interaction: Omit<InteractionInsert, "user_id">) => {
      await ensureHydrated();
      try {
        setIsCreating(true);
        setError(null);
        const created =
          await interactionService.createInteraction(interaction);
        return created;
      } catch {
        // Mock mode — Supabase not configured
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
    await ensureHydrated();
    try {
      setIsLoading(true);
      setError(null);
      const data = await interactionService.getAllInteractions();
      // Always merge locally created interactions so saves persist across refetches
      const localIds = new Set(locallyCreatedInteractions.map((i) => i.id));
      setInteractions([...locallyCreatedInteractions, ...data.filter((i) => !localIds.has(i.id))]);
    } catch {
      // Mock mode — merge locally created + mock data
      setInteractions([...locallyCreatedInteractions, ...mockInteractions]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { interactions, isLoading, error, refetch: fetch };
}
