/**
 * Memory Selection Utility
 *
 * Determines the best memory to surface in the Reach-Out Bridge screen.
 * Prioritizes recency, emotional richness, and content depth.
 *
 * Also generates warm context labels for display above memory cards,
 * following the garden metaphor (never gap-shaming, never urgent).
 */

import type { Memory } from "@/types/database";
import type { Emotion } from "@/types";

// ─── Emotion Display Names ─────────────────────────────────────────────────
// Converts raw enum values to noun forms that read naturally in context labels.

const emotionDisplayNames: Record<Emotion, string> = {
  grateful: "gratitude",
  connected: "connection",
  curious: "curiosity",
  joyful: "joy",
  nostalgic: "nostalgia",
  proud: "pride",
  peaceful: "peace",
  inspired: "inspiration",
  hopeful: "hope",
  loved: "love",
};

// ─── getBestMemoryForReachOut ───────────────────────────────────────────────

/**
 * Select the most meaningful memory to surface in the reach-out bridge.
 *
 * Priority logic (deterministic):
 * 1. Most recently created (created_at descending)
 * 2. Prefer memories with an emotion set (more emotionally rich)
 * 3. Among ties, prefer longer content (more context for the user)
 * 4. If no memories exist, return null
 *
 * Note: Memory type has no image field — emotion presence is used
 * as the secondary signal instead.
 */
export function getBestMemoryForReachOut(memories: Memory[]): Memory | null {
  if (memories.length === 0) return null;

  const sorted = [...memories].sort((a, b) => {
    // Primary: most recent first
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    if (dateA !== dateB) return dateB - dateA;

    // Secondary: prefer memories with emotion set
    const emotionA = a.emotion ? 1 : 0;
    const emotionB = b.emotion ? 1 : 0;
    if (emotionA !== emotionB) return emotionB - emotionA;

    // Tertiary: prefer longer content
    return b.content.length - a.content.length;
  });

  return sorted[0];
}

// ─── getMemoryContextLabel ─────────────────────────────────────────────────

/**
 * Generate a warm, human context label for a surfaced memory.
 *
 * Rules:
 * - Recent memory (< 7 days): "From your recent time together"
 * - Has emotion: "From a shared moment of {emotion noun}"
 * - Default: "From a shared moment"
 */
export function getMemoryContextLabel(memory: Memory): string {
  const now = new Date();
  const created = new Date(memory.created_at);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return "From your recent time together";
  }

  if (memory.emotion) {
    const displayName = emotionDisplayNames[memory.emotion];
    return `From a shared moment of ${displayName}`;
  }

  return "From a shared moment";
}
