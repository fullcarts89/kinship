/**
 * Display Formatters & Label Maps
 *
 * Pure display utilities extracted from mock data.
 * Shared by both mock-data fallback and Supabase-backed hooks.
 */

import type { Emotion, RelationshipType } from "@/types";

// ─── Date Formatting ────────────────────────────────────────────────────────

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// ─── Emotion Helpers ────────────────────────────────────────────────────────

export function formatEmotionLabel(emotion: Emotion): string {
  return emotion.charAt(0).toUpperCase() + emotion.slice(1);
}

export const emotionList: Emotion[] = [
  "grateful",
  "connected",
  "curious",
  "joyful",
  "nostalgic",
  "proud",
  "peaceful",
  "inspired",
  "hopeful",
  "loved",
];

// ─── Emotion Emojis ────────────────────────────────────────────────────────

export const emotionEmojis: Record<string, string> = {
  grateful: "\uD83D\uDE4F",
  connected: "\uD83D\uDCAB",
  curious: "\uD83D\uDD2E",
  joyful: "\uD83D\uDE0A",
  nostalgic: "\uD83C\uDF05",
  proud: "\u2B50",
  peaceful: "\uD83C\uDF38",
  inspired: "\u2728",
  hopeful: "\uD83C\uDF31",
  loved: "\uD83D\uDC9B",
};

// ─── Relationship Helpers ───────────────────────────────────────────────────

export const relationshipLabels: Record<RelationshipType, string> = {
  friend: "Friend",
  family: "Family",
  partner: "Partner",
  colleague: "Coworker",
  mentor: "Mentor",
  acquaintance: "Acquaintance",
  neighbor: "Neighbor",
  other: "Other",
};

export const relationshipTypes: RelationshipType[] = [
  "friend",
  "family",
  "partner",
  "colleague",
  "neighbor",
  "mentor",
  "acquaintance",
];
