// Showing Up's three writes (PR #77 §5–§6; founder directive 2 Nov 2026), each on paths that already
// exist, so the truth model doesn't change:
//
//   keep it in mind   an intention is a Tell in the user's own words: a note kept exactly as written,
//                     never sent for understanding (status "skipped"), and the one promise it says,
//                     user-authored, its source that note's words, with the day the user picked. It shows
//                     under "You said you'd" and comes back on its day as the user's own promise does
//                     (RSN-06). It never repeats, escalates, counts or goes overdue.
//   bring it back     an idea grounded in a promise the user already made adds the day to that promise
//                     as the user's edit (their edit wins). Nothing new is written, so nothing doubles.
//   I did this        the user's own report that a promise of theirs was kept: the promise is resolved
//                     (it leaves "You said you'd" and stays in What Kinship knows). It is not contact: no
//                     conversation is recorded, and opening a channel never counts as either (T12).
//
// The evidence ladder stays five records apart; nothing here infers one from another.
import { track } from "@/platform/analytics";
import { useV2Session } from "@/providers/V2SessionProvider";
import { repositoriesFor } from "@/store/repositories";
import { StoreWriteError } from "@/store/userStore";

/** An intention's sentence is at most this long (it is one line, in the user's words). */
export const INTENTION_MAX = 280;

function timeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** The pure part of an intention: the sentence as kept, or why it can't be. */
export function intentionSentence(text: string): string {
  const s = text.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (!s) throw new StoreWriteError("say what you'd like to do");
  if (Array.from(s).length > INTENTION_MAX) throw new StoreWriteError("keep it to one line");
  return s;
}

export function useShowingUp() {
  const { store, understanding } = useV2Session();
  return {
    /** "Keep it in mind": the user's sentence as a note and the one promise it says, with their day. Returns what Undo removes. */
    keepInMind: async (i: { personId: string; sentence: string; day: string }): Promise<{ captureId: string; itemId: string }> => {
      const sentence = intentionSentence(i.sentence);
      const repos = repositoriesFor(store);
      const capture = await repos.captures.tell(sentence, { contextPersonId: i.personId, timeZone: timeZone() ?? undefined, aiEnabled: false });
      const item = await repos.memory.remember(
        { kind: "promise", person_id: i.personId, subject_type: "user", statement: sentence, detail: { due_date: i.day } },
        { captureId: capture.id as string, quote: sentence },
      );
      track("intention_saved", { mode: "new" });
      return { captureId: capture.id as string, itemId: item.id as string };
    },
    /** Undo of "Keep it in mind": the promise and its note go, as if never saved. */
    undoKeep: async (k: { captureId: string; itemId: string }): Promise<void> => {
      const repos = repositoriesFor(store);
      await repos.memory.retract(k.itemId);
      await repos.captures.remove(k.captureId);
    },
    /** "Bring it back on Saturday": the day added to the user's own promise, as their edit. */
    bringBackOn: async (itemId: string, day: string): Promise<void> => {
      await understanding.correct(itemId, { date: day });
      track("intention_saved", { mode: "day_added" });
    },
    /** "I did this" on the user's own promise: kept, not contact. */
    keptIt: async (itemId: string, surface: "moment" | "line" | "today" = "line"): Promise<void> => {
      const item = await repositoriesFor(store).memory.get(itemId);
      if (!item || item.kind !== "promise" || item.subject_type !== "user") throw new StoreWriteError("only your own promise can be kept");
      await repositoriesFor(store).memory.resolve(itemId);
      track("promise_kept", { surface });
    },
  };
}
