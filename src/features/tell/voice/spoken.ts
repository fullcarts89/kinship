// Which unsent Tells were spoken (E18). A note whose words came, in whole or
// part, from listening on the phone is kept with source "voice" and
// transcript_meta {on_device, locale, duration_s} (captures schema). The audio
// itself is never kept anywhere: only how long the user spoke.
//
// Per draft (drafts.ts keys), in memory only: a draft the user empties by hand
// goes back to being typed; one restored after a failed Keep stays spoken.

export interface TranscriptMeta {
  on_device: true;
  locale: string;
  duration_s: number;
}

const spoken = new Map<string, TranscriptMeta>();

/** Words heard on the phone went into this draft. */
export function noteSpoken(key: string, locale: string, seconds: number): void {
  const was = spoken.get(key);
  const duration = Math.max(0, Math.round((was?.duration_s ?? 0) + seconds));
  spoken.set(key, { on_device: true, locale, duration_s: duration });
}

/** How this draft was spoken, if it was. */
export function spokenMeta(key: string): TranscriptMeta | null {
  return spoken.get(key) ?? null;
}

/** Kept, or emptied by hand: the next words here start typed. */
export function forgetSpoken(key: string): void {
  spoken.delete(key);
}

/** Puts heard words after what's already written, with one space between. */
export function withSpoken(draft: string, heard: string, max: number): string {
  const said = heard.trim();
  if (!said) return draft;
  const before = draft.replace(/\s+$/u, "");
  const joined = before ? `${before}${/\n$/u.test(draft) ? "\n" : " "}${said}` : said;
  return [...joined].slice(0, max).join("");
}
