// Unsent Tells, kept quietly (founder native pass, F19/F21/F22).
//
// A draft belongs to where it was started: the general Tell on Today and
// People, or one person's page. It is never shown anywhere else, so words
// written about Ben can never appear as if they were about Tyler. Leaving the
// field collapses it; the words wait until the user comes back to them.

/** The Tell on Today and People, about no one in particular. */
export const GENERAL_DRAFT = "general";

export type Drafts = Readonly<Record<string, string>>;

/** The key for a Tell about someone, or the general one. */
export function draftKey(personId: string | null | undefined): string {
  return personId ? `person:${personId}` : GENERAL_DRAFT;
}

/** Sets one draft; an empty one is removed rather than kept. */
export function withDraft(drafts: Drafts, key: string, text: string): Drafts {
  const next = { ...drafts };
  if (text.trim()) next[key] = text;
  else delete next[key];
  return next;
}

/** Reads the saved drafts; anything unreadable is dropped, never guessed. */
export function parseDrafts(raw: string | null): Drafts {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, t] of Object.entries(v as Record<string, unknown>)) {
      if (typeof t === "string" && t.trim() && (k === GENERAL_DRAFT || k.startsWith("person:"))) out[k] = t;
    }
    return out;
  } catch {
    return {};
  }
}

/** One quiet line for a collapsed draft: what it is, then its first words. */
export function draftPreview(text: string, aboutName: string | null): string {
  const first = text.trim().replace(/\s+/gu, " ");
  return aboutName ? `Draft about ${aboutName} · ${first}` : `Draft · ${first}`;
}
