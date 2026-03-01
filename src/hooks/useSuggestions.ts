/**
 * Suggestions Hook
 *
 * React hook that generates ranked, contextual suggestions for the
 * home screen and Garden Walk. Wraps the suggestion engine with
 * data from existing hooks.
 *
 * Usage:
 *   const suggestions = useSuggestions(3);
 *   // Returns IntelligentSuggestion[] — top N suggestions
 */

import { useMemo, useState, useEffect } from "react";
import {
  generateSuggestions,
  type IntelligentSuggestion,
  type CalendarMatch,
} from "@/lib/suggestionEngine";
import { getRecentCalendarMatches } from "@/lib/calendarEngine";
import type { Person, Memory, Interaction } from "@/types/database";

// ─── useSuggestions ──────────────────────────────────────────────────────────

/**
 * Generate ranked suggestions from persons, memories, interactions,
 * and (optionally) calendar matches.
 *
 * Calendar matches are fetched asynchronously on mount and whenever
 * the persons list changes. If calendar access is denied or unavailable,
 * suggestions are generated without calendar data.
 */
export function useSuggestions(
  persons: Person[],
  memories: Memory[],
  interactions: Interaction[],
  limit: number = 3
): IntelligentSuggestion[] {
  const [calendarMatches, setCalendarMatches] = useState<CalendarMatch[]>([]);

  // Fetch calendar matches when persons change
  useEffect(() => {
    if (persons.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const matches = await getRecentCalendarMatches(persons);
        if (!cancelled) {
          setCalendarMatches(matches);
        }
      } catch {
        // Calendar access denied or unavailable — continue without
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [persons]);

  // Generate and memoize suggestions
  return useMemo(
    () =>
      generateSuggestions(persons, memories, interactions, calendarMatches, limit),
    [persons, memories, interactions, calendarMatches, limit]
  );
}
