/**
 * Texture Engine
 *
 * Infers a relationship texture label from accumulated captures.
 * Only activates after 5+ captures for a person.
 *
 * V1 approach: keyword frequency in capture text + emotion distribution
 *
 * Texture labels:
 * - "Adventure buddy" — captures mention outdoor/travel/activity words
 * - "Deep talks" — captures are long (avg 200+ chars) with emotions: connected, grateful, peaceful
 * - "Always laughing" — captures mention funny/hilarious/laugh + emotion: joyful
 * - "Creative spark" — captures mention art/music/writing/project + emotion: inspired
 * - "Rock solid" — high capture frequency + emotions: grateful, connected, loved
 * - "Old soul" — captures mention nostalgia/remember/childhood + emotion: nostalgic
 * - "Growth partner" — captures mention goals/learning/challenge + emotion: proud, hopeful
 *
 * Labels are:
 * - Displayed as a subtle badge on the person profile below their name
 * - Never shown to the other person
 * - Dismissable or editable by the user
 * - Only ONE label per person (the strongest match)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type TextureLabel =
  | "adventure_buddy"
  | "deep_talks"
  | "always_laughing"
  | "creative_spark"
  | "rock_solid"
  | "old_soul"
  | "growth_partner";

export interface TextureInfo {
  label: TextureLabel;
  displayLabel: string;
  emoji: string;
  confidence: number;
}

interface TextureDefinition {
  label: TextureLabel;
  displayLabel: string;
  emoji: string;
  keywords: string[];
  emotions: string[];
  requiresLongContent: boolean;
}

// ─── Capture type used by this engine ────────────────────────────────────────

export interface CaptureInput {
  content: string;
  emotion?: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum captures required before texture inference activates. */
const MIN_CAPTURES = 5;

/** Minimum combined score to surface a texture label. */
const CONFIDENCE_THRESHOLD = 0.15;

/** Average content length threshold for "Deep talks". */
const DEEP_TALKS_AVG_LENGTH = 200;

/**
 * Texture definitions — each describes a relationship flavor along with
 * the keywords and emotions used for scoring.
 */
export const TEXTURE_DEFINITIONS: TextureDefinition[] = [
  {
    label: "adventure_buddy",
    displayLabel: "Adventure buddy",
    emoji: "\uD83C\uDFD4\uFE0F", // 🏔️
    keywords: [
      "hiking",
      "camping",
      "trail",
      "travel",
      "road trip",
      "beach",
      "mountain",
      "skiing",
      "surfing",
      "climb",
      "explore",
      "adventure",
      "outdoor",
      "kayak",
      "bike",
      "hike",
      "swim",
    ],
    emotions: [], // any emotion counts equally
    requiresLongContent: false,
  },
  {
    label: "deep_talks",
    displayLabel: "Deep talks",
    emoji: "\uD83D\uDCAD", // 💭
    keywords: [],
    emotions: ["connected", "grateful", "peaceful"],
    requiresLongContent: true,
  },
  {
    label: "always_laughing",
    displayLabel: "Always laughing",
    emoji: "\uD83D\uDE02", // 😂
    keywords: [
      "funny",
      "hilarious",
      "laugh",
      "laughing",
      "lol",
      "joke",
      "cracked up",
      "comedy",
      "silly",
      "goofy",
    ],
    emotions: ["joyful"],
    requiresLongContent: false,
  },
  {
    label: "creative_spark",
    displayLabel: "Creative spark",
    emoji: "\uD83C\uDFA8", // 🎨
    keywords: [
      "art",
      "music",
      "painting",
      "writing",
      "project",
      "design",
      "creative",
      "song",
      "poem",
      "studio",
      "gallery",
      "craft",
      "film",
      "photography",
    ],
    emotions: ["inspired"],
    requiresLongContent: false,
  },
  {
    label: "rock_solid",
    displayLabel: "Rock solid",
    emoji: "\uD83E\uDEA8", // 🪨
    keywords: [],
    emotions: ["grateful", "connected", "loved"],
    requiresLongContent: false,
  },
  {
    label: "old_soul",
    displayLabel: "Old soul",
    emoji: "\uD83D\uDD70\uFE0F", // 🕰️
    keywords: [
      "nostalgia",
      "remember when",
      "childhood",
      "old times",
      "back in the day",
      "throwback",
      "vintage",
      "memory lane",
      "growing up",
      "school days",
    ],
    emotions: ["nostalgic"],
    requiresLongContent: false,
  },
  {
    label: "growth_partner",
    displayLabel: "Growth partner",
    emoji: "\uD83C\uDF31", // 🌱
    keywords: [
      "goals",
      "learning",
      "challenge",
      "mentor",
      "career",
      "growth",
      "improve",
      "study",
      "practice",
      "training",
      "course",
      "skill",
      "workshop",
    ],
    emotions: ["proud", "hopeful"],
    requiresLongContent: false,
  },
];

// ─── Module-level State ─────────────────────────────────────────────────────

/** personId -> { label, dismissedAt ISO string } */
let _dismissedTextures: Map<
  string,
  { label: TextureLabel; dismissedAt: string }
> = new Map();

/** Number of days before a dismissed texture can resurface. */
const DISMISS_COOLDOWN_DAYS = 30;

// ─── Scoring Helpers ────────────────────────────────────────────────────────

/**
 * Count how many times any keyword from the list appears across all
 * capture content. Uses case-insensitive matching. Multi-word keywords
 * (e.g. "road trip") are matched as substrings; single-word keywords
 * are matched at word boundaries to avoid false positives.
 */
function countKeywordMatches(
  captures: CaptureInput[],
  keywords: string[]
): number {
  if (keywords.length === 0) return 0;

  let totalMatches = 0;

  for (const capture of captures) {
    const lowerContent = capture.content.toLowerCase();

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();

      if (lowerKeyword.includes(" ")) {
        // Multi-word keyword: simple substring match
        if (lowerContent.includes(lowerKeyword)) {
          totalMatches++;
        }
      } else {
        // Single-word keyword: word boundary match
        const regex = new RegExp(`\\b${escapeRegExp(lowerKeyword)}\\b`, "gi");
        const matches = lowerContent.match(regex);
        if (matches) {
          totalMatches += matches.length;
        }
      }
    }
  }

  return totalMatches;
}

/**
 * Count how many captures have an emotion that appears in the
 * given emotions list.
 */
function countEmotionMatches(
  captures: CaptureInput[],
  emotions: string[]
): number {
  if (emotions.length === 0) return 0;

  let matches = 0;
  const emotionSet = new Set(emotions.map((e) => e.toLowerCase()));

  for (const capture of captures) {
    if (
      capture.emotion &&
      emotionSet.has(capture.emotion.toLowerCase())
    ) {
      matches++;
    }
  }

  return matches;
}

/** Compute the average content length across all captures. */
function averageContentLength(captures: CaptureInput[]): number {
  if (captures.length === 0) return 0;
  const totalLength = captures.reduce((sum, c) => sum + c.content.length, 0);
  return totalLength / captures.length;
}

/** Escape special regex characters in a string. */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Core Inference ─────────────────────────────────────────────────────────

/**
 * Infer the strongest texture label from a set of captures.
 *
 * Returns the best-matching TextureInfo if the confidence exceeds the
 * threshold (0.15), or null if:
 * - Fewer than 5 captures
 * - No texture meets the confidence threshold
 *
 * Scoring per texture definition:
 *   Standard textures:
 *     keyword_score = keyword_matches / captures.length
 *     emotion_score = emotion_matches / captures.length
 *     combined = (keyword_score * 0.6) + (emotion_score * 0.4)
 *
 *   "deep_talks" (no keywords, relies on content length + emotions):
 *     length_score = avgLength >= 200 ? 1.0 : avgLength / 200
 *     emotion_score = emotion_matches / captures.length
 *     combined = (length_score * 0.5) + (emotion_score * 0.5)
 *
 *   "rock_solid" (no keywords, relies on capture frequency + emotions):
 *     frequency_score = min(1.0, captures.length / 20)
 *     emotion_score = emotion_matches / captures.length
 *     combined = (frequency_score * 0.4) + (emotion_score * 0.6)
 *
 *   "adventure_buddy" (any emotion counts, keywords-only):
 *     keyword_score = keyword_matches / captures.length
 *     If emotions list is empty, use keyword_score alone:
 *     combined = keyword_score
 */
export function inferTexture(captures: CaptureInput[]): TextureInfo | null {
  if (captures.length < MIN_CAPTURES) return null;

  let bestScore = 0;
  let bestDefinition: TextureDefinition | null = null;

  for (const definition of TEXTURE_DEFINITIONS) {
    let score = 0;

    if (definition.label === "deep_talks") {
      // Deep talks: content length is the primary signal
      const avgLen = averageContentLength(captures);
      const lengthScore = avgLen >= DEEP_TALKS_AVG_LENGTH ? 1.0 : avgLen / DEEP_TALKS_AVG_LENGTH;
      const emotionScore =
        countEmotionMatches(captures, definition.emotions) / captures.length;

      score = lengthScore * 0.5 + emotionScore * 0.5;
    } else if (definition.label === "rock_solid") {
      // Rock solid: capture frequency + emotion distribution
      const frequencyScore = Math.min(1.0, captures.length / 20);
      const emotionScore =
        countEmotionMatches(captures, definition.emotions) / captures.length;

      score = frequencyScore * 0.4 + emotionScore * 0.6;
    } else if (definition.emotions.length === 0) {
      // Keywords-only texture (e.g. adventure_buddy with any emotion)
      const keywordScore =
        countKeywordMatches(captures, definition.keywords) / captures.length;

      score = keywordScore;
    } else {
      // Standard texture: weighted keyword + emotion
      const keywordScore =
        countKeywordMatches(captures, definition.keywords) / captures.length;
      const emotionScore =
        countEmotionMatches(captures, definition.emotions) / captures.length;

      score = keywordScore * 0.6 + emotionScore * 0.4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDefinition = definition;
    }
  }

  if (bestDefinition === null || bestScore < CONFIDENCE_THRESHOLD) {
    return null;
  }

  return {
    label: bestDefinition.label,
    displayLabel: bestDefinition.displayLabel,
    emoji: bestDefinition.emoji,
    confidence: Math.min(1.0, bestScore),
  };
}

// ─── Dismiss / Re-show Logic ────────────────────────────────────────────────

/**
 * Dismiss a texture label for a person. The label will not be shown again
 * for 30 days, after which it may resurface if the data still supports it.
 */
export function dismissTexture(
  personId: string,
  label: TextureLabel
): void {
  _dismissedTextures.set(personId, {
    label,
    dismissedAt: new Date().toISOString(),
  });
}

/**
 * Check whether a texture label has been dismissed for a person
 * and the 30-day cooldown has not yet elapsed.
 */
export function isTextureDismissed(
  personId: string,
  label: TextureLabel
): boolean {
  const entry = _dismissedTextures.get(personId);
  if (!entry || entry.label !== label) return false;

  const dismissedDate = new Date(entry.dismissedAt);
  const now = new Date();
  const daysSinceDismissal =
    (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceDismissal < DISMISS_COOLDOWN_DAYS;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the relationship texture for a person, accounting for dismissals.
 *
 * Returns null if:
 * - Not enough captures (< 5)
 * - No texture meets the confidence threshold
 * - The inferred texture was dismissed and the cooldown hasn't elapsed
 */
export function getTextureForPerson(
  personId: string,
  captures: CaptureInput[]
): TextureInfo | null {
  const texture = inferTexture(captures);
  if (texture === null) return null;

  if (isTextureDismissed(personId, texture.label)) {
    return null;
  }

  return texture;
}
