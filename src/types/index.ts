/**
 * Shared application types
 */

import type { LucideIcon } from "lucide-react-native";

/**
 * Icon component type — compatible with lucide-react-native icons.
 *
 * Use this instead of `React.ComponentType<{ color: string; size: number }>`
 * to avoid TypeScript strict-mode issues with LucideProps.ColorValue.
 */
export type IconComponent = LucideIcon;

/** Relationship type options for a Person */
export type RelationshipType =
  | "friend"
  | "family"
  | "partner"
  | "colleague"
  | "mentor"
  | "acquaintance"
  | "neighbor"
  | "other";

/** Emotion chip options for memories */
export type Emotion =
  | "grateful"
  | "connected"
  | "curious"
  | "joyful"
  | "nostalgic"
  | "proud"
  | "peaceful"
  | "inspired"
  | "hopeful"
  | "loved";

/** Interaction types */
export type InteractionType =
  | "message"
  | "call"
  | "video"
  | "in_person"
  | "gift"
  | "letter"
  | "social_media"
  | "other";

/** Suggestion types from the intelligence engine */
export type SuggestionType =
  | "check_in"
  | "memory_resurface"
  | "activity_recommendation";

/** Suggestion status */
export type SuggestionStatus =
  | "pending"
  | "accepted"
  | "dismissed"
  | "completed";

/** Notification types */
export type NotificationType =
  | "check_in_suggestion"
  | "memory_resurface"
  | "milestone"
  | "gentle_nudge";
