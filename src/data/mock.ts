/**
 * Mock Data for Demo & Development
 *
 * Provides realistic sample data for all screens.
 * Used as fallback when Supabase is not configured.
 *
 * Display formatters are canonical in @/lib/formatters and re-exported here
 * for backward compatibility with existing screen imports.
 */

import type { Person, Memory, Interaction, Suggestion } from "@/types/database";

// ─── Re-export formatters (canonical source: @/lib/formatters) ──────────────

export {
  formatRelativeDate,
  formatEmotionLabel,
  relationshipLabels,
  emotionList,
  relationshipTypes,
} from "@/lib/formatters";

// ─── People ──────────────────────────────────────────────────────────────────

export const mockPeople: Person[] = [
  {
    id: "p1",
    user_id: "u1",
    name: "Sarah Miller",
    photo_url: null,
    relationship_type: "friend",
    birthday: "1994-03-01",
    phone: "(555) 123-4567",
    email: "sarah.miller@email.com",
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "p2",
    user_id: "u1",
    name: "James Chen",
    photo_url: null,
    relationship_type: "colleague",
    created_at: "2026-01-20T14:30:00Z",
  },
  {
    id: "p3",
    user_id: "u1",
    name: "Mom",
    photo_url: null,
    relationship_type: "family",
    birthday: "1968-07-22",
    phone: "(555) 987-6543",
    created_at: "2026-02-01T09:00:00Z",
  },
  {
    id: "p4",
    user_id: "u1",
    name: "Alex Rivera",
    photo_url: null,
    relationship_type: "friend",
    birthday: "1996-12-03",
    created_at: "2026-02-05T16:45:00Z",
  },
  {
    id: "p5",
    user_id: "u1",
    name: "Dr. Patel",
    photo_url: null,
    relationship_type: "mentor",
    created_at: "2026-02-10T11:20:00Z",
  },
];

// ─── Memories ────────────────────────────────────────────────────────────────

export const mockMemories: Memory[] = [
  {
    id: "m1",
    user_id: "u1",
    person_id: "p1",
    content: "Had an amazing brunch at that new cafe downtown. Sarah told me about her promotion — so proud of her!",
    emotion: "joyful",
    photo_url: null,
    occurred_at: "2026-02-19T12:00:00Z",
    created_at: "2026-02-20T12:00:00Z",
  },
  {
    id: "m2",
    user_id: "u1",
    person_id: "p3",
    content: "Mom sent her famous banana bread recipe. Spent the afternoon baking together over video call.",
    emotion: "grateful",
    photo_url: null,
    occurred_at: "2026-02-17T15:00:00Z",
    created_at: "2026-02-18T15:00:00Z",
  },
  {
    id: "m3",
    user_id: "u1",
    person_id: "p2",
    content: "James shared a great article on sustainable design. Led to a 2-hour conversation about our future plans.",
    emotion: "inspired",
    photo_url: null,
    occurred_at: "2026-02-14T10:30:00Z",
    created_at: "2026-02-15T10:30:00Z",
  },
  {
    id: "m4",
    user_id: "u1",
    person_id: "p4",
    content: "Went hiking at Runyon Canyon. Alex showed me a hidden trail I'd never seen before.",
    emotion: "connected",
    photo_url: null,
    occurred_at: "2026-02-11T09:00:00Z",
    created_at: "2026-02-12T09:00:00Z",
  },
  {
    id: "m5",
    user_id: "u1",
    person_id: "p5",
    content: "Dr. Patel gave incredible advice about navigating career transitions. Feeling more confident about the path ahead.",
    emotion: "hopeful",
    photo_url: null,
    occurred_at: "2026-02-07T14:00:00Z",
    created_at: "2026-02-08T14:00:00Z",
  },
];

// ─── Interactions ────────────────────────────────────────────────────────────

export const mockInteractions: Interaction[] = [
  { id: "i1", user_id: "u1", person_id: "p1", type: "in_person",    note: null, emotion: null, created_at: "2026-02-20T12:00:00Z" },
  { id: "i2", user_id: "u1", person_id: "p3", type: "video",        note: null, emotion: null, created_at: "2026-02-18T15:00:00Z" },
  { id: "i3", user_id: "u1", person_id: "p2", type: "message",      note: "Chatted about the weekend plans", emotion: "connected", created_at: "2026-02-15T10:30:00Z" },
  { id: "i4", user_id: "u1", person_id: "p4", type: "in_person",    note: null, emotion: null, created_at: "2026-02-12T09:00:00Z" },
  { id: "i5", user_id: "u1", person_id: "p5", type: "call",         note: null, emotion: null, created_at: "2026-02-08T14:00:00Z" },
  { id: "i6", user_id: "u1", person_id: "p1", type: "message",      note: null, emotion: null, created_at: "2026-02-05T08:00:00Z" },
  { id: "i7", user_id: "u1", person_id: "p3", type: "call",         note: null, emotion: null, created_at: "2026-01-28T10:00:00Z" },
];

// ─── Suggestions ─────────────────────────────────────────────────────────────

export const mockSuggestions: Suggestion[] = [
  {
    id: "s1",
    user_id: "u1",
    person_id: "p2",
    type: "check_in",
    status: "pending",
    created_at: "2026-02-24T08:00:00Z",
  },
  {
    id: "s2",
    user_id: "u1",
    person_id: "p4",
    type: "check_in",
    status: "pending",
    created_at: "2026-02-24T08:00:00Z",
  },
  {
    id: "s3",
    user_id: "u1",
    person_id: "p1",
    type: "memory_resurface",
    status: "pending",
    created_at: "2026-02-24T08:00:00Z",
  },
];

// ─── Mock Helpers ────────────────────────────────────────────────────────────

export function getPersonById(id: string): Person | undefined {
  return mockPeople.find((p) => p.id === id);
}

export function getMemoriesForPerson(personId: string): Memory[] {
  return mockMemories.filter((m) => m.person_id === personId);
}

export function getInteractionsForPerson(personId: string): Interaction[] {
  return mockInteractions.filter((i) => i.person_id === personId);
}

export function getLatestInteraction(personId: string): Interaction | undefined {
  return getInteractionsForPerson(personId).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}
