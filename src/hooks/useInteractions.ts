/**
 * Interaction Hooks
 *
 * React hooks for interaction data. Falls back to mock data
 * when Supabase is not configured.
 *
 * In mock mode, locally-created interactions are stored in a module-level
 * array so they persist across hook instances and appear on refetch.
 */

import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as interactionService from "@/services/interactionService";
import {
  mockInteractions,
  getInteractionsForPerson as mockGetInteractionsForPerson,
  getLatestInteraction as mockGetLatestInteraction,
} from "@/data/mock";
import type { Interaction, InteractionInsert } from "@/types/database";

// ─── Shared local storage for mock mode ─────────────────────────────────────

let locallyCreatedInteractions: Interaction[] = [];
let localInteractionIdCounter = 300;

// ─── usePersonInteractions ──────────────────────────────────────────────────

export function usePersonInteractions(personId: string) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [latestInteraction, setLatestInteraction] =
    useState<Interaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Include locally-created interactions for this person
      const localForPerson = locallyCreatedInteractions.filter(
        (i) => i.person_id === personId
      );
      const mockForPerson = mockGetInteractionsForPerson(personId);
      const allInteractions = [...localForPerson, ...mockForPerson];
      setInteractions(allInteractions);

      // Latest = most recent by created_at
      const sorted = [...allInteractions].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLatestInteraction(sorted[0] ?? null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [allInteractions, latest] = await Promise.all([
        interactionService.getInteractionsForPerson(personId),
        interactionService.getLatestInteraction(personId),
      ]);
      setInteractions(allInteractions);
      setLatestInteraction(latest);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
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
      if (!isSupabaseConfigured) {
        // Create a local mock interaction so it shows up everywhere
        localInteractionIdCounter += 1;
        const created: Interaction = {
          id: `local-i${localInteractionIdCounter}`,
          user_id: "u1",
          person_id: interaction.person_id,
          type: interaction.type,
          note: interaction.note ?? null,
          emotion: interaction.emotion ?? null,
          created_at: new Date().toISOString(),
        };
        locallyCreatedInteractions = [created, ...locallyCreatedInteractions];
        return created;
      }

      try {
        setIsCreating(true);
        setError(null);
        const created =
          await interactionService.createInteraction(interaction);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createInteraction, isCreating, error };
}

// ─── useAllInteractions ────────────────────────────────────────────────────

/** Fetch all interactions (all people). Used for growth bootstrapping. */
export function useAllInteractions() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setInteractions([...locallyCreatedInteractions, ...mockInteractions]);
      setIsLoading(false);
      return;
    }

    // When Supabase is connected, this would call a "get all" service
    // For now, falls through to mock
    setInteractions([...locallyCreatedInteractions, ...mockInteractions]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { interactions, isLoading, refetch: fetch };
}
