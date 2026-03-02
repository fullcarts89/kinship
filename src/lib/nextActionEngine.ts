/**
 * Next Best Action Engine
 *
 * Per-person prioritized waterfall that returns the single best next action
 * for the "Suggested next step" card on a person's Context tab.
 *
 * Priority order (first match wins):
 *   P1  Birthday within 3 days        → reach_out
 *   P2  Memory added within 1 hour    → none (enjoy moment, no CTA)
 *   P3  Brand-new person (0 data)     → add_memory
 *   P4  Birthday within 7 days        → reach_out
 *   P5  Dormant + mature (drift)      → reach_out
 *   P6  Has memories, no interactions → reach_out
 *   P7  Has interactions, no memories → add_memory
 *   P8  Vibrant vitality              → reflect
 *   P9  Dormant, early-stage          → add_memory
 *   P10 Default                       → reach_out
 *
 * TONE RULES (inherited from suggestionEngine):
 * - Never guilt / urgency / reminder language
 * - Always invitational, warm, optional
 * - Garden metaphor when natural
 */

import type { Person, Memory, Interaction } from "@/types/database";
import type { GrowthInfo } from "@/lib/growthEngine";
import type { VitalityInfo } from "@/lib/vitalityEngine";
import { simpleHash, daysUntilNextBirthday } from "@/lib/suggestionEngine";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NextActionType = "add_memory" | "reach_out" | "reflect" | "none";

export interface NextBestAction {
  type: NextActionType;
  headline: string;
  body: string | null;
  actionLabel: string | null;
  actionType: NextActionType;
}

export interface NextActionInput {
  person: Person;
  memories: Memory[];
  interactions: Interaction[];
  growthInfo: GrowthInfo;
  vitalityInfo: VitalityInfo;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minutes within which a just-added memory triggers the "enjoy" state. */
const JUST_ADDED_MEMORY_MINUTES = 60;

// ─── Copy Templates ─────────────────────────────────────────────────────────

type RelKey = "friend" | "family" | "partner" | "default";

interface CopySet {
  headline: string;
  body: string | null;
}

function relKey(type: string | undefined): RelKey {
  if (type === "friend" || type === "family" || type === "partner") return type;
  return "default";
}

function pick(templates: CopySet[], personId: string): CopySet {
  return templates[simpleHash(personId) % templates.length];
}

// --- P1 / P4: Birthday ---

const BIRTHDAY_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "{name}'s birthday is just around the corner", body: "A perfect moment to let them know you're thinking of them." },
    { headline: "A special day is coming up for {name}", body: "Even a simple note could mean the world." },
  ],
  family: [
    { headline: "{name}'s birthday is almost here", body: "A warm word from you would be a lovely gift." },
    { headline: "A birthday is approaching for {name}", body: "Family bonds grow stronger with small gestures." },
  ],
  partner: [
    { headline: "{name}'s birthday is almost here", body: "A perfect chance to celebrate what you share." },
    { headline: "A special day for {name} is coming", body: "You know exactly how to make it meaningful." },
  ],
  default: [
    { headline: "{name}'s birthday is just around the corner", body: "A small gesture could make their day." },
    { headline: "A special day is approaching for {name}", body: "It might be a lovely time to reach out." },
  ],
};

// --- P2: Just added a memory (enjoy / no CTA) ---

const ENJOY_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "Beautiful \u2014 that moment with {name} is saved", body: "Your garden together just grew a little." },
    { headline: "A new memory with {name}, safe and sound", body: "These small moments are what friendships are made of." },
  ],
  family: [
    { headline: "That moment with {name} is now part of your story", body: "Family roots grow deeper with each memory." },
    { headline: "Saved \u2014 a beautiful moment with {name}", body: "Your garden together keeps growing." },
  ],
  partner: [
    { headline: "A tender moment with {name}, captured", body: "Your story together just got a new chapter." },
    { headline: "That moment with {name} is yours to keep", body: "The garden you share is blooming." },
  ],
  default: [
    { headline: "That moment with {name} is now yours to keep", body: "Your garden together just grew a little." },
    { headline: "Saved \u2014 a beautiful memory with {name}", body: "Every memory is a seed worth planting." },
  ],
};

// --- P3: Brand-new person ---

const NEW_PERSON_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "Plant the first seed with {name}", body: "A memory is where every garden begins." },
    { headline: "Your garden with {name} is ready for its first seed", body: "What's a moment you'd love to hold onto?" },
  ],
  family: [
    { headline: "Start your garden with {name}", body: "Every family story begins with a single memory." },
    { headline: "Plant the first seed with {name}", body: "What's a moment together you treasure?" },
  ],
  partner: [
    { headline: "Begin your garden with {name}", body: "Capture the first moment that matters." },
    { headline: "Your story with {name} starts here", body: "What moment would you love to hold onto?" },
  ],
  default: [
    { headline: "Plant the first seed with {name}", body: "A memory is where every garden begins." },
    { headline: "Your garden with {name} is ready", body: "Start with a moment you'd like to remember." },
  ],
};

// --- P5: Drift (dormant + mature) ---

const DRIFT_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "Your friendship with {name} has deep roots", body: "A small moment could be meaningful." },
    { headline: "You and {name} share something special", body: "It might be nice to tend to it." },
  ],
  family: [
    { headline: "Your bond with {name} runs deep", body: "A gentle hello could brighten both your days." },
    { headline: "Family roots with {name} are strong", body: "Even a small gesture can nurture them." },
  ],
  partner: [
    { headline: "Your connection with {name} is beautiful", body: "Even a small gesture nurtures it." },
    { headline: "You and {name} share deep roots", body: "A tender moment could feel wonderful." },
  ],
  default: [
    { headline: "Your garden with {name} is well-rooted", body: "You might enjoy tending to it." },
    { headline: "The bond with {name} has grown beautifully", body: "A gentle moment could be meaningful." },
  ],
};

// --- P6: Has memories, no interactions ---

const EARLY_REACH_OUT_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "You've planted seeds with {name}", body: "A hello might help them bloom." },
    { headline: "Your memories with {name} are growing", body: "Saying hi could be the water they need." },
  ],
  family: [
    { headline: "You've captured moments with {name}", body: "Reaching out could bring them to life." },
    { headline: "Seeds are planted with {name}", body: "A warm hello could make them bloom." },
  ],
  partner: [
    { headline: "You've been collecting moments with {name}", body: "Why not bring them into the present?" },
    { headline: "Your garden with {name} has seeds waiting", body: "A warm word could help them grow." },
  ],
  default: [
    { headline: "You've planted seeds with {name}", body: "A simple hello could help them bloom." },
    { headline: "Moments with {name} are taking root", body: "Reaching out might feel just right." },
  ],
};

// --- P7: Has interactions, no memories ---

const CAPTURE_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "You've been connecting with {name}", body: "Capture a moment before it fades." },
    { headline: "Your conversations with {name} have been flowing", body: "A memory could make one last." },
  ],
  family: [
    { headline: "You've been in touch with {name}", body: "Save a moment that matters to you." },
    { headline: "Time with {name} deserves to be remembered", body: "What's a moment you'd love to keep?" },
  ],
  partner: [
    { headline: "You've been sharing time with {name}", body: "Capture something beautiful from it." },
    { headline: "Your time with {name} is worth remembering", body: "Save a moment that made you smile." },
  ],
  default: [
    { headline: "You've been connecting with {name}", body: "A memory could make it last." },
    { headline: "Your time with {name} deserves a seed", body: "Capture a moment worth keeping." },
  ],
};

// --- P8: Vibrant → reflect ---

const REFLECT_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "Your garden with {name} is thriving", body: "Take a moment to appreciate how it's grown." },
    { headline: "Things are blooming with {name}", body: "A gentle reflection could deepen the roots." },
  ],
  family: [
    { headline: "Your bond with {name} feels vibrant", body: "It might feel nice to pause and savor it." },
    { headline: "{name} is flourishing in your garden", body: "A moment of reflection could be nourishing." },
  ],
  partner: [
    { headline: "Your connection with {name} is radiant", body: "Pause and take in the beauty of it." },
    { headline: "The garden you share with {name} is in full bloom", body: "Reflect on what makes it so alive." },
  ],
  default: [
    { headline: "Your garden with {name} feels alive", body: "A moment of reflection could be meaningful." },
    { headline: "Things are growing beautifully with {name}", body: "Pause and appreciate the bloom." },
  ],
};

// --- P9: Dormant, early-stage ---

const DORMANT_EARLY_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "Your garden with {name} could use a seed", body: "A memory is a gentle way to begin." },
    { headline: "The soil is ready for {name}", body: "Plant a moment and watch what grows." },
  ],
  family: [
    { headline: "Nurture your garden with {name}", body: "A memory could be the perfect start." },
    { headline: "Your bond with {name} is waiting to grow", body: "Start with a moment that matters." },
  ],
  partner: [
    { headline: "Your garden with {name} is quiet", body: "A small memory could gently wake it." },
    { headline: "Plant a seed in your garden with {name}", body: "Even a small moment can grow into something." },
  ],
  default: [
    { headline: "Your garden with {name} could use some tending", body: "A memory is a gentle way to begin." },
    { headline: "The soil with {name} is ready", body: "Plant a moment and see what grows." },
  ],
};

// --- P10: Default (healthy/resting) ---

const DEFAULT_COPY: Record<RelKey, CopySet[]> = {
  friend: [
    { headline: "A moment with {name} could brighten your day", body: null },
    { headline: "{name} might enjoy hearing from you", body: "No pressure \u2014 just when the time feels right." },
  ],
  family: [
    { headline: "A warm hello to {name} could mean a lot", body: null },
    { headline: "{name} would love to hear from you", body: "Even a quick note goes a long way." },
  ],
  partner: [
    { headline: "A tender moment with {name} awaits", body: null },
    { headline: "You and {name} \u2014 always worth reaching for", body: "A small gesture can say so much." },
  ],
  default: [
    { headline: "A moment with {name} could be lovely", body: null },
    { headline: "You might enjoy connecting with {name}", body: "When the time feels right." },
  ],
};

// ─── Engine ─────────────────────────────────────────────────────────────────

function fill(copy: CopySet, name: string): CopySet {
  return {
    headline: copy.headline.replace("{name}", name),
    body: copy.body ? copy.body.replace("{name}", name) : null,
  };
}

function mostRecentMemoryMinutesAgo(memories: Memory[]): number | null {
  if (memories.length === 0) return null;
  let latest = 0;
  for (const m of memories) {
    const t = new Date(m.occurred_at || m.created_at).getTime();
    if (t > latest) latest = t;
  }
  return (Date.now() - latest) / (1000 * 60);
}

export function getNextBestAction(input: NextActionInput): NextBestAction {
  const { person, memories, interactions, growthInfo, vitalityInfo } = input;
  const rel = relKey(person.relationship_type);
  const birthday = daysUntilNextBirthday(person.birthday);

  // P1: Birthday within 3 days
  if (birthday !== null && birthday <= 3) {
    const copy = fill(pick(BIRTHDAY_COPY[rel], person.id), person.name);
    return { type: "reach_out", headline: copy.headline, body: copy.body, actionLabel: "Reach out", actionType: "reach_out" };
  }

  // P2: Memory added within 1 hour → celebrate, no CTA
  const minutesAgo = mostRecentMemoryMinutesAgo(memories);
  if (minutesAgo !== null && minutesAgo < JUST_ADDED_MEMORY_MINUTES) {
    const copy = fill(pick(ENJOY_COPY[rel], person.id), person.name);
    return { type: "none", headline: copy.headline, body: copy.body, actionLabel: null, actionType: "none" };
  }

  // P3: Brand-new person (no memories, no interactions)
  if (memories.length === 0 && interactions.length === 0) {
    const copy = fill(pick(NEW_PERSON_COPY[rel], person.id), person.name);
    return { type: "add_memory", headline: copy.headline, body: copy.body, actionLabel: "Capture a moment", actionType: "add_memory" };
  }

  // P4: Birthday within 7 days
  if (birthday !== null && birthday <= 7) {
    const copy = fill(pick(BIRTHDAY_COPY[rel], person.id), person.name);
    return { type: "reach_out", headline: copy.headline, body: copy.body, actionLabel: "Reach out", actionType: "reach_out" };
  }

  // P5: Dormant vitality + mature growth (drift)
  if (vitalityInfo.level === "dormant" && growthInfo.points >= 10) {
    const copy = fill(pick(DRIFT_COPY[rel], person.id), person.name);
    return { type: "reach_out", headline: copy.headline, body: copy.body, actionLabel: "Reach out", actionType: "reach_out" };
  }

  // P6: Has memories but no interactions (early stage)
  if (memories.length > 0 && interactions.length === 0) {
    const copy = fill(pick(EARLY_REACH_OUT_COPY[rel], person.id), person.name);
    return { type: "reach_out", headline: copy.headline, body: copy.body, actionLabel: "Say hello", actionType: "reach_out" };
  }

  // P7: Has interactions but no memories
  if (interactions.length > 0 && memories.length === 0) {
    const copy = fill(pick(CAPTURE_COPY[rel], person.id), person.name);
    return { type: "add_memory", headline: copy.headline, body: copy.body, actionLabel: "Capture a moment", actionType: "add_memory" };
  }

  // P8: Vibrant vitality → reflect
  if (vitalityInfo.level === "vibrant") {
    const copy = fill(pick(REFLECT_COPY[rel], person.id), person.name);
    return { type: "reflect", headline: copy.headline, body: copy.body, actionLabel: "Reflect", actionType: "reflect" };
  }

  // P9: Dormant vitality, early-stage (< 10 points)
  if (vitalityInfo.level === "dormant") {
    const copy = fill(pick(DORMANT_EARLY_COPY[rel], person.id), person.name);
    return { type: "add_memory", headline: copy.headline, body: copy.body, actionLabel: "Capture a moment", actionType: "add_memory" };
  }

  // P10: Default (healthy / resting)
  const copy = fill(pick(DEFAULT_COPY[rel], person.id), person.name);
  return { type: "reach_out", headline: copy.headline, body: copy.body, actionLabel: "Reach out", actionType: "reach_out" };
}
