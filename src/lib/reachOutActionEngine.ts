/**
 * Reach-Out Action Engine
 *
 * Generates contextually ranked action options for the reach-out flow.
 * Actions vary between people based on:
 *   1. Interaction history — most-used channel becomes primary
 *   2. Relationship type — sensible defaults when no history
 *   3. Contact info availability — call/video only if phone exists
 *
 * Labels vary per relationship type and interaction context so the
 * reach-out screen never shows identical, static copy for every person.
 *
 * TONE RULES:
 * - Never guilt-inducing ("You haven't called in a while")
 * - Always invitational, warm, optional
 * - Garden metaphor when it fits naturally
 */

import type { Person, Interaction } from "@/types/database";
import type { InteractionType, RelationshipType } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReachOutAction {
  type: InteractionType;
  label: string;
  sublabel?: string;
  isPrimary: boolean;
}

// ─── Label Variations ───────────────────────────────────────────────────────

/**
 * Label pools per action type, keyed by relationship category.
 * The engine picks from these based on relationship type to ensure
 * the copy feels natural and varies between people.
 */
const messageLabels: Record<string, string[]> = {
  close: ["Send a message", "Drop them a note", "Say hello"],
  formal: ["Send a message", "Reach out", "Drop a line"],
  default: ["Send a message", "Say hello", "Send a note"],
};

const callLabels: Record<string, string[]> = {
  close: ["Give them a call", "Call and catch up", "Ring them"],
  formal: ["Give them a call", "Schedule a call", "Call to connect"],
  default: ["Give them a call", "Call and chat", "Ring them"],
};

const videoLabels: Record<string, string[]> = {
  close: ["Video chat", "Face-to-face call", "Video call"],
  formal: ["Video call", "Face-to-face call", "Schedule a video chat"],
  default: ["Video chat", "Video call", "Face-to-face call"],
};

const inPersonLabels: Record<string, string[]> = {
  close: ["Meet up", "Get together", "Plan something together"],
  formal: ["Meet in person", "Get together", "Plan a meetup"],
  default: ["Meet up", "Get together", "Meet in person"],
};

/**
 * Sublabel pools for the primary action.
 */
const primarySublabels = {
  mostUsed: [
    "Your favorite way to connect",
    "How you usually reach out",
    "Your go-to",
  ],
  defaultByRelationship: [
    "A warm way to reach out",
    "A gentle way to connect",
    "A nice way to start",
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map relationship types to a category for label selection.
 */
function getRelationshipCategory(type: RelationshipType): string {
  switch (type) {
    case "family":
    case "partner":
    case "friend":
      return "close";
    case "colleague":
    case "mentor":
      return "formal";
    default:
      return "default";
  }
}

/**
 * Pick a label from a pool using a deterministic-but-varying index.
 * Uses person name hash so the same person always gets the same label
 * (no random flicker on re-render) but different people get different labels.
 */
function pickLabel(pool: string[], personName: string): string {
  let hash = 0;
  for (let i = 0; i < personName.length; i++) {
    hash = (hash * 31 + personName.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

/**
 * Get action labels for a given type, relationship category, and person.
 */
function getLabelForAction(
  actionType: InteractionType,
  category: string,
  personName: string
): string {
  let pool: string[];
  switch (actionType) {
    case "call":
      pool = callLabels[category] ?? callLabels.default;
      break;
    case "video":
      pool = videoLabels[category] ?? videoLabels.default;
      break;
    case "in_person":
      pool = inPersonLabels[category] ?? inPersonLabels.default;
      break;
    case "message":
    default:
      pool = messageLabels[category] ?? messageLabels.default;
      break;
  }
  return pickLabel(pool, personName);
}

/**
 * Default channel ordering by relationship type (used when no history exists).
 */
function getDefaultPrimaryChannel(
  type: RelationshipType,
  hasPhone: boolean
): InteractionType {
  switch (type) {
    case "family":
      return hasPhone ? "call" : "message";
    case "partner":
      return hasPhone ? "call" : "message";
    case "friend":
      return "message";
    case "colleague":
      return "message";
    case "mentor":
      return "message";
    default:
      return "message";
  }
}

// ─── Main Engine ────────────────────────────────────────────────────────────

/**
 * Generate ordered, contextual reach-out action options for a person.
 *
 * The primary action is shown as a prominent button; secondary actions
 * are listed below. Labels vary by relationship type and history.
 *
 * @param person - The person being reached out to
 * @param interactions - All interactions with this person (for frequency analysis)
 * @returns Ordered array of ReachOutAction objects
 */
export function getReachOutActions(
  person: Person,
  interactions: Interaction[]
): ReachOutAction[] {
  const hasPhone = !!person.phone;
  const category = getRelationshipCategory(person.relationship_type);

  // ─── Determine primary channel from interaction history ──────────────
  const typeCounts = new Map<InteractionType, number>();
  for (const interaction of interactions) {
    typeCounts.set(
      interaction.type,
      (typeCounts.get(interaction.type) ?? 0) + 1
    );
  }

  // Find most-used channel (only consider available channels)
  let primaryType: InteractionType;
  let usedHistory = false;

  if (typeCounts.size > 0) {
    // Sort by count descending
    const sorted = [...typeCounts.entries()]
      .filter(([type]) => {
        // Filter out unavailable channels
        if ((type === "call" || type === "video") && !hasPhone) return false;
        // Only include actionable types
        return ["message", "call", "video", "in_person"].includes(type);
      })
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
      primaryType = sorted[0][0];
      usedHistory = true;
    } else {
      primaryType = getDefaultPrimaryChannel(
        person.relationship_type,
        hasPhone
      );
    }
  } else {
    primaryType = getDefaultPrimaryChannel(
      person.relationship_type,
      hasPhone
    );
  }

  // ─── Build action list ──────────────────────────────────────────────

  // All possible channels in display order (primary first, then others)
  const allChannels: InteractionType[] = [
    "message",
    "call",
    "video",
    "in_person",
  ];

  // Filter by availability
  const availableChannels = allChannels.filter((type) => {
    if ((type === "call" || type === "video") && !hasPhone) return false;
    return true;
  });

  // Build ordered list: primary first, then remaining
  const orderedChannels: InteractionType[] = [
    primaryType,
    ...availableChannels.filter((t) => t !== primaryType),
  ];

  // Generate actions with contextual labels
  const actions: ReachOutAction[] = orderedChannels.map((type, index) => {
    const isPrimary = index === 0;
    const label = getLabelForAction(type, category, person.name);

    let sublabel: string | undefined;
    if (isPrimary) {
      const sublabelPool = usedHistory
        ? primarySublabels.mostUsed
        : primarySublabels.defaultByRelationship;
      sublabel = pickLabel(sublabelPool, person.name + "_sublabel");
    }

    return {
      type,
      label,
      sublabel,
      isPrimary,
    };
  });

  return actions;
}
