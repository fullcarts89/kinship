/**
 * Suggestion Engine
 *
 * Generates ranked, contextual suggestions based on available data.
 * Each suggestion has a type, a person, a user-facing reason, and a priority score.
 *
 * Suggestion types:
 * - birthday_upcoming: Person has a birthday within the next 7 days
 * - memory_resurface: A meaningful memory from 30+ days ago worth revisiting
 * - drift_reconnect: Person with high growth but low vitality (drifting)
 * - post_event_capture: Calendar shows recent event with this person (Tier 2)
 * - general_reach_out: Gentle suggestion based on vitality ranking
 *
 * Priority scoring:
 * - birthday_upcoming (within 3 days): 100
 * - birthday_upcoming (within 7 days): 80
 * - post_event_capture: 70
 * - drift_reconnect (vitality dormant, growth >= Mature): 60
 * - memory_resurface: 40
 * - general_reach_out: 20
 *
 * The engine returns the top N suggestions, deduped by person
 * (max one suggestion per person).
 *
 * Recency exclusion (INTL-02 / INTL-03):
 * - Persons contacted within the last 24 hours are excluded from all
 *   suggestion types EXCEPT birthday_upcoming (socially expected).
 *
 * Memory resurface minimum age (INTL-04):
 * - Memories must be at least 7 days old to be candidates for resurfacing.
 *
 * Personalized copy (INTL-05):
 * - Suggestion reason text varies by relationship type, growth stage,
 *   and vitality level — never static/repetitive for different people.
 *
 * TONE RULES:
 * - Never say "You haven't talked to..." or "Don't forget" or "Remember to"
 * - Never use the word "remind" or "reminder"
 * - Always frame as invitation: "You might enjoy...", "A moment worth...", etc.
 * - Birthday suggestions can be slightly more direct (socially expected)
 */

import type { Person, Memory, Interaction } from "@/types/database";
import { getGrowthInfo } from "@/lib/growthEngine";
import type { GrowthStage } from "@/lib/growthEngine";
import { getVitalityInfo } from "@/lib/vitalityEngine";
import type { VitalityLevel } from "@/lib/vitalityEngine";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SuggestionType =
  | "birthday_upcoming"
  | "memory_resurface"
  | "drift_reconnect"
  | "post_event_capture"
  | "general_reach_out";

export interface IntelligentSuggestion {
  id: string;
  type: SuggestionType;
  personId: string;
  personName: string;
  reason: string; // User-facing copy
  priority: number;
  metadata?: {
    memoryId?: string;
    birthdayDate?: string;
    calendarEventName?: string;
  };
}

export interface CalendarMatch {
  personId: string;
  personName: string;
  eventTitle: string;
  eventDate: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Hours within which a recently-contacted person is excluded from suggestions. */
const RECENCY_EXCLUSION_HOURS = 24;

/** Minimum age in days before a memory can be resurfaced. */
const MEMORY_RESURFACE_MIN_AGE_DAYS = 7;

/** Minimum age in days for a memory to qualify as an "old" memory worth revisiting. */
const MEMORY_RESURFACE_OLD_AGE_DAYS = 30;

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Calculate the number of days until a person's next birthday.
 * Handles year wrap-around (e.g. birthday in January when current month is December).
 * Returns null if the person has no birthday field.
 */
function daysUntilNextBirthday(birthday: string | undefined): number | null {
  if (!birthday) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Parse the birthday — may or may not have a year
  // Formats: "1990-03-15", "03-15", "0000-03-15"
  const parts = birthday.split("-");
  let month: number;
  let day: number;

  if (parts.length === 3) {
    // "YYYY-MM-DD"
    month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    day = parseInt(parts[2], 10);
  } else if (parts.length === 2) {
    // "MM-DD"
    month = parseInt(parts[0], 10) - 1;
    day = parseInt(parts[1], 10);
  } else {
    return null;
  }

  if (isNaN(month) || isNaN(day)) return null;

  // Calculate next occurrence of this birthday
  let nextBirthday = new Date(today.getFullYear(), month, day);

  // If the birthday already passed this year, use next year
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, month, day);
  }

  const diffMs = nextBirthday.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format the "in X days" part of a birthday suggestion.
 */
function formatBirthdayTiming(daysUntil: number): string {
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

/**
 * Determine if a memory is "meaningful" — has emotion or long content.
 * Mirrors the growthEngine definition.
 */
function isMeaningfulMemory(memory: Memory): boolean {
  return memory.emotion !== null || memory.content.length >= 140;
}

/**
 * Get the age of a memory in days from today.
 */
function memoryAgeDays(memory: Memory): number {
  const now = Date.now();
  const created = new Date(memory.created_at).getTime();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

/**
 * Truncate a string to a max length, appending "..." if truncated.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

/**
 * Build a set of person IDs that have been contacted within the given window.
 * Used to exclude recently-contacted persons from suggestions (INTL-02/03).
 */
function getRecentlyContactedPersonIds(
  interactions: Interaction[],
  hoursWindow: number
): Set<string> {
  const cutoff = Date.now() - hoursWindow * 60 * 60 * 1000;
  const recentIds = new Set<string>();

  for (const interaction of interactions) {
    const interactionTime = new Date(interaction.created_at).getTime();
    if (interactionTime >= cutoff) {
      recentIds.add(interaction.person_id);
    }
  }

  return recentIds;
}

// ─── Personalized Copy (INTL-05) ────────────────────────────────────────────

/**
 * Drift reconnect copy variations based on relationship type.
 * All framed as gentle invitations — never guilt, never urgency.
 */
const DRIFT_COPY_BY_RELATIONSHIP: Record<string, string[]> = {
  friend: [
    "Your friendship with {name} has deep roots. A small moment could be meaningful.",
    "You and {name} share something special. It might be nice to tend to it.",
  ],
  family: [
    "Your bond with {name} runs deep. A gentle hello could brighten both your days.",
    "Family roots with {name} are strong. Even a small gesture can nurture them.",
  ],
  colleague: [
    "You and {name} have built something solid. A brief check-in could feel nice.",
    "Your connection with {name} is well-rooted. A small hello goes a long way.",
  ],
  mentor: [
    "Your time with {name} has been rich. They might enjoy hearing from you.",
    "The wisdom you share with {name} is worth tending to. A brief note could mean a lot.",
  ],
  partner: [
    "Your connection with {name} is beautiful. Even a small gesture nurtures it.",
    "You and {name} share deep roots. A tender moment could feel wonderful.",
  ],
  default: [
    "Your garden with {name} is well-rooted. You might enjoy tending to it.",
    "The bond with {name} has grown beautifully. A gentle moment could be meaningful.",
  ],
};

/**
 * General reach-out copy variations that use vitality and growth context.
 * Indexed by vitality level, with name placeholder.
 */
const GENERAL_COPY_BY_CONTEXT: Record<VitalityLevel, Record<string, string[]>> = {
  vibrant: {
    friend: [
      "Things are going well with {name}. Enjoy the connection.",
      "{name} is thriving in your garden. A warm thought to carry with you.",
    ],
    family: [
      "Your bond with {name} feels vibrant. Savor it.",
      "{name} is flourishing in your garden. What a beautiful thing.",
    ],
    default: [
      "{name} is doing well in your garden. A lovely connection.",
      "Your garden with {name} feels alive and warm.",
    ],
  },
  healthy: {
    friend: [
      "You and {name} have a good rhythm going. Keep it up.",
      "{name} might enjoy a spontaneous hello from you.",
    ],
    family: [
      "A moment with {name} could be the highlight of your day.",
      "{name} would probably love to hear from you.",
    ],
    default: [
      "You might enjoy a moment with {name}.",
      "{name} could be a wonderful person to connect with today.",
    ],
  },
  resting: {
    friend: [
      "A small hello to {name} could brighten both your days.",
      "You and {name} share good memories. A note might feel nice.",
    ],
    family: [
      "A gentle moment with {name} could mean a lot to both of you.",
      "{name} might enjoy hearing what you've been up to.",
    ],
    colleague: [
      "{name} might appreciate a quick check-in. No pressure.",
      "A brief hello to {name} could be a welcome surprise.",
    ],
    default: [
      "You might enjoy reaching out to {name}. No pressure at all.",
      "A gentle thought for {name} could be a nice way to start.",
    ],
  },
  dormant: {
    friend: [
      "Your friendship with {name} has deep roots. A small gesture could be lovely.",
      "When the time feels right, {name} might enjoy hearing from you.",
    ],
    family: [
      "A warm hello to {name} — even a small one — could mean the world.",
      "Your bond with {name} is patient and lasting. Reach out when it feels right.",
    ],
    default: [
      "Your garden with {name} is resting quietly. A small moment could gently wake it.",
      "When you have a quiet moment, {name} might be nice to think of.",
    ],
  },
};

/**
 * Generate personalized copy for a drift reconnect suggestion.
 * Uses relationship type + person name for variation.
 */
function getDriftCopy(person: Person): string {
  const relType = person.relationship_type ?? "default";
  const templates = DRIFT_COPY_BY_RELATIONSHIP[relType] ?? DRIFT_COPY_BY_RELATIONSHIP.default;
  // Pick deterministically based on person ID hash to avoid changing every render
  const index = simpleHash(person.id) % templates.length;
  return templates[index].replace("{name}", person.name);
}

/**
 * Generate personalized copy for a general reach-out suggestion.
 * Uses vitality level + relationship type + person name for variation.
 */
function getGeneralCopy(person: Person, vitalityLevel: VitalityLevel): string {
  const relType = person.relationship_type ?? "default";
  const levelCopy = GENERAL_COPY_BY_CONTEXT[vitalityLevel];
  const templates = levelCopy[relType] ?? levelCopy.default;
  const index = simpleHash(person.id) % templates.length;
  return templates[index].replace("{name}", person.name);
}

/**
 * Simple deterministic hash from string to positive integer.
 * Used for stable template selection that doesn't change between renders.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ─── Suggestion Generators ──────────────────────────────────────────────────

/**
 * Generate birthday suggestions for persons whose birthday is within 7 days.
 * NOTE: Birthday suggestions are NOT subject to recency exclusion — birthdays
 * are socially expected and should always surface.
 */
function generateBirthdaySuggestions(
  persons: Person[]
): IntelligentSuggestion[] {
  const suggestions: IntelligentSuggestion[] = [];

  for (const person of persons) {
    const daysUntil = daysUntilNextBirthday(person.birthday);
    if (daysUntil === null || daysUntil > 7) continue;

    const timing = formatBirthdayTiming(daysUntil);
    const priority = daysUntil <= 3 ? 100 : 80;

    suggestions.push({
      id: `suggestion-birthday_upcoming-${person.id}`,
      type: "birthday_upcoming",
      personId: person.id,
      personName: person.name,
      reason: `${person.name}'s birthday is ${timing}. A perfect moment to reach out.`,
      priority,
      metadata: {
        birthdayDate: person.birthday,
      },
    });
  }

  return suggestions;
}

/**
 * Generate memory resurface suggestions for meaningful memories from 30+ days ago.
 * Memories must be at least MEMORY_RESURFACE_MIN_AGE_DAYS old (INTL-04).
 * Picks the most recent meaningful old memory per person.
 */
function generateMemoryResurfaceSuggestions(
  persons: Person[],
  memories: Memory[],
  recentlyContactedIds: Set<string>
): IntelligentSuggestion[] {
  const suggestions: IntelligentSuggestion[] = [];

  // Build a lookup of person names by ID
  const personNameMap = new Map<string, string>();
  for (const person of persons) {
    personNameMap.set(person.id, person.name);
  }

  // Group meaningful old memories by person, keeping the most recent per person
  const bestMemoryByPerson = new Map<string, Memory>();

  for (const memory of memories) {
    const age = memoryAgeDays(memory);

    // INTL-04: Memory must be at least 7 days old to be eligible
    if (age < MEMORY_RESURFACE_MIN_AGE_DAYS) continue;

    // Original threshold: only resurface memories 30+ days old
    if (age < MEMORY_RESURFACE_OLD_AGE_DAYS) continue;

    if (!isMeaningfulMemory(memory)) continue;

    // INTL-02/03: Skip persons contacted recently
    if (recentlyContactedIds.has(memory.person_id)) continue;

    const existing = bestMemoryByPerson.get(memory.person_id);
    if (!existing) {
      bestMemoryByPerson.set(memory.person_id, memory);
    } else {
      // Keep the most recent meaningful old memory
      const existingDate = new Date(existing.created_at).getTime();
      const currentDate = new Date(memory.created_at).getTime();
      if (currentDate > existingDate) {
        bestMemoryByPerson.set(memory.person_id, memory);
      }
    }
  }

  for (const [personId, memory] of bestMemoryByPerson) {
    const personName = personNameMap.get(personId);
    if (!personName) continue;

    const preview = truncate(memory.content, 60);

    suggestions.push({
      id: `suggestion-memory_resurface-${personId}`,
      type: "memory_resurface",
      personId,
      personName,
      reason: `A moment worth revisiting with ${personName}: "${preview}"`,
      priority: 40,
      metadata: {
        memoryId: memory.id,
      },
    });
  }

  return suggestions;
}

/**
 * Generate drift reconnect suggestions for persons with high growth
 * (>= mature, i.e. 10+ points) but low vitality (dormant, i.e. score < 0.35).
 * These are well-established relationships that have gone quiet.
 */
function generateDriftSuggestions(
  persons: Person[],
  memories: Memory[],
  interactions: Interaction[],
  recentlyContactedIds: Set<string>
): IntelligentSuggestion[] {
  const suggestions: IntelligentSuggestion[] = [];

  // Group memories and interactions by person for vitality calculation
  const memoriesByPerson = new Map<string, Memory[]>();
  const interactionsByPerson = new Map<string, Interaction[]>();

  for (const memory of memories) {
    const list = memoriesByPerson.get(memory.person_id) ?? [];
    list.push(memory);
    memoriesByPerson.set(memory.person_id, list);
  }

  for (const interaction of interactions) {
    const list = interactionsByPerson.get(interaction.person_id) ?? [];
    list.push(interaction);
    interactionsByPerson.set(interaction.person_id, list);
  }

  for (const person of persons) {
    // INTL-02/03: Skip persons contacted recently
    if (recentlyContactedIds.has(person.id)) continue;

    const growthInfo = getGrowthInfo(person.id);

    // Only consider persons at mature stage or above (10+ points)
    if (growthInfo.points < 10) continue;

    const personMemories = memoriesByPerson.get(person.id) ?? [];
    const personInteractions = interactionsByPerson.get(person.id) ?? [];
    const vitalityInfo = getVitalityInfo(personMemories, personInteractions);

    // Only suggest if vitality is dormant (score < 0.35)
    if (vitalityInfo.score >= 0.35) continue;

    suggestions.push({
      id: `suggestion-drift_reconnect-${person.id}`,
      type: "drift_reconnect",
      personId: person.id,
      personName: person.name,
      reason: getDriftCopy(person),
      priority: 60,
    });
  }

  return suggestions;
}

/**
 * Generate suggestions from calendar matches (post-event capture).
 * These prompt the user to record a memory after seeing someone recently.
 */
function generateCalendarSuggestions(
  calendarMatches: CalendarMatch[] | undefined,
  recentlyContactedIds: Set<string>
): IntelligentSuggestion[] {
  if (!calendarMatches || calendarMatches.length === 0) return [];

  const suggestions: IntelligentSuggestion[] = [];

  // Dedupe by person — keep the first match per person
  const seenPersons = new Set<string>();

  for (const match of calendarMatches) {
    if (seenPersons.has(match.personId)) continue;
    // INTL-02/03: Skip persons contacted recently
    if (recentlyContactedIds.has(match.personId)) continue;
    seenPersons.add(match.personId);

    // Include the event name for context — helps the user recall the moment
    const eventSnippet =
      match.eventTitle.length > 30
        ? match.eventTitle.slice(0, 27).trimEnd() + "..."
        : match.eventTitle;

    suggestions.push({
      id: `suggestion-post_event_capture-${match.personId}`,
      type: "post_event_capture",
      personId: match.personId,
      personName: match.personName,
      reason: `Capture a memory from "${eventSnippet}" with ${match.personName}`,
      priority: 70,
      metadata: {
        calendarEventName: match.eventTitle,
      },
    });
  }

  return suggestions;
}

/**
 * Generate general reach-out suggestions for persons not already covered
 * by higher-priority suggestion types. Sorted by lowest vitality first
 * so the most "resting" relationships surface first.
 *
 * INTL-05: Uses personalized copy based on relationship type and vitality.
 */
function generateGeneralSuggestions(
  persons: Person[],
  memories: Memory[],
  interactions: Interaction[],
  excludePersonIds: Set<string>,
  recentlyContactedIds: Set<string>
): IntelligentSuggestion[] {
  // Group memories and interactions by person for vitality calculation
  const memoriesByPerson = new Map<string, Memory[]>();
  const interactionsByPerson = new Map<string, Interaction[]>();

  for (const memory of memories) {
    const list = memoriesByPerson.get(memory.person_id) ?? [];
    list.push(memory);
    memoriesByPerson.set(memory.person_id, list);
  }

  for (const interaction of interactions) {
    const list = interactionsByPerson.get(interaction.person_id) ?? [];
    list.push(interaction);
    interactionsByPerson.set(interaction.person_id, list);
  }

  // Calculate vitality for each eligible person
  const personVitality: { person: Person; score: number; level: VitalityLevel }[] = [];

  for (const person of persons) {
    if (excludePersonIds.has(person.id)) continue;
    // INTL-02/03: Skip persons contacted recently
    if (recentlyContactedIds.has(person.id)) continue;

    const personMemories = memoriesByPerson.get(person.id) ?? [];
    const personInteractions = interactionsByPerson.get(person.id) ?? [];
    const vitalityInfo = getVitalityInfo(personMemories, personInteractions);

    personVitality.push({ person, score: vitalityInfo.score, level: vitalityInfo.level });
  }

  // Sort by lowest vitality first (most in need of gentle attention)
  personVitality.sort((a, b) => a.score - b.score);

  return personVitality.map(({ person, level }) => ({
    id: `suggestion-general_reach_out-${person.id}`,
    type: "general_reach_out" as SuggestionType,
    personId: person.id,
    personName: person.name,
    reason: getGeneralCopy(person, level),
    priority: 20,
  }));
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Generate ranked suggestions based on available data.
 *
 * 1. Computes 24-hour recency exclusion set (INTL-02/03)
 * 2. Generates all suggestion types (birthday exempt from exclusion)
 * 3. Flattens into a single array
 * 4. Sorts by priority descending
 * 5. Dedupes by personId (keeps highest-priority suggestion per person)
 * 6. Returns top N
 */
export function generateSuggestions(
  persons: Person[],
  memories: Memory[],
  interactions: Interaction[],
  calendarMatches?: CalendarMatch[],
  limit: number = 5
): IntelligentSuggestion[] {
  // INTL-02/03: Build 24-hour recency exclusion set
  const recentlyContactedIds = getRecentlyContactedPersonIds(
    interactions,
    RECENCY_EXCLUSION_HOURS
  );

  // 1. Generate all suggestion types
  // Birthday suggestions are NOT subject to recency exclusion
  const birthdaySuggestions = generateBirthdaySuggestions(persons);
  const memoryResurfaceSuggestions = generateMemoryResurfaceSuggestions(
    persons,
    memories,
    recentlyContactedIds
  );
  const driftSuggestions = generateDriftSuggestions(
    persons,
    memories,
    interactions,
    recentlyContactedIds
  );
  const calendarSuggestions = generateCalendarSuggestions(
    calendarMatches,
    recentlyContactedIds
  );

  // Collect personIds already covered by higher-priority types
  // so general suggestions don't duplicate them
  const coveredPersonIds = new Set<string>();
  for (const s of birthdaySuggestions) coveredPersonIds.add(s.personId);
  for (const s of memoryResurfaceSuggestions) coveredPersonIds.add(s.personId);
  for (const s of driftSuggestions) coveredPersonIds.add(s.personId);
  for (const s of calendarSuggestions) coveredPersonIds.add(s.personId);

  const generalSuggestions = generateGeneralSuggestions(
    persons,
    memories,
    interactions,
    coveredPersonIds,
    recentlyContactedIds
  );

  // 2. Flatten into a single array
  const allSuggestions: IntelligentSuggestion[] = [
    ...birthdaySuggestions,
    ...memoryResurfaceSuggestions,
    ...driftSuggestions,
    ...calendarSuggestions,
    ...generalSuggestions,
  ];

  // 3. Sort by priority descending (stable sort preserves insertion order for ties)
  allSuggestions.sort((a, b) => b.priority - a.priority);

  // 4. Dedupe by personId — keep the highest-priority suggestion per person
  const seenPersonIds = new Set<string>();
  const deduped: IntelligentSuggestion[] = [];

  for (const suggestion of allSuggestions) {
    if (seenPersonIds.has(suggestion.personId)) continue;
    seenPersonIds.add(suggestion.personId);
    deduped.push(suggestion);
  }

  // 5. Return top N
  return deduped.slice(0, limit);
}
