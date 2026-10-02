/**
 * useAIInsight
 *
 * Loads (or generates) the AI insight for a person's profile.
 * Resolves to null when AI isn't configured or has nothing specific to
 * say — the caller keeps showing the heuristic suggestion.
 */

import { useState, useEffect, useSyncExternalStore } from "react";
import { isAIEnabled, subscribeToAIConsent } from "@/lib/aiPreferences";
import {
  generatePersonInsight,
  isAIConfigured,
  type PersonInsight,
} from "@/lib/aiInsightService";
import type { Person, Memory, Interaction, PersonPromise } from "@/types/database";

export function useAIInsight(
  person: Person | null,
  memories: Memory[],
  interactions: Interaction[],
  promises: PersonPromise[] = []
): { insight: PersonInsight | null; isLoading: boolean } {
  const [insight, setInsight] = useState<PersonInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Re-run when the underlying signal changes (note added, memory saved).
  const signalKey = person
    ? `${person.id}:${person.notes?.length ?? 0}:${memories.length}:${interactions.length}:${promises.length}`
    : "";

  // Follow consent live: switching AI off elsewhere (Settings, sign-out)
  // removes the AI suggestion from screens that are already open.
  const aiEnabled = useSyncExternalStore(subscribeToAIConsent, isAIEnabled);

  useEffect(() => {
    if (!aiEnabled) {
      setInsight(null);
      setIsLoading(false);
      return;
    }
    if (!person || !isAIConfigured()) return;
    let cancelled = false;
    setIsLoading(true);
    generatePersonInsight({ person, memories, interactions, promises })
      .then((result) => {
        if (!cancelled) setInsight(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalKey, aiEnabled]);

  return { insight, isLoading };
}
