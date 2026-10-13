// The hand-off and its return check (plan §15; founder H10, H11, H18, K3,
// N6, I2), as plain steps that Today's actions and the tests share.
//
//   hand-off    Kinship opens Messages or Phone from a Moment: remembered on
//               this device before the other app opens, "acted" on the server
//               reason. Nothing is a contact yet: opening an app is not
//               reaching someone.
//   Yes         the one place a conversation is recorded: one contact event,
//               with what it was about and which kind of Moment led to it
//               (I2). The reason is done: a "Waiting on …" line it came from
//               doesn't keep asking (K3). "Anything worth remembering?"
//               afterwards is separate, and answering "nothing" changes none
//               of this.
//   Not yet     nothing is recorded; the reason may speak again while its
//               window lasts, on this device at once and on the server after
//               a sync (N6).
// An answer counts once: a second tap, a retry or a relaunch never records a
// second conversation.

import { isLocalReason, type Handoff, type ReasonType } from "@/features/today/todayModel";
import type { ReasonEvent } from "./reasons";
import type { ReasonLocal } from "./reasonLocal";
import type { ContactRepo } from "./repositories";

/** Which kind of Moment led to a conversation (contact_events.moment_type; content-free). */
export type MomentType = "birthday" | "good_news" | "starts_today" | "milestone" | "upcoming_event" | "event_followup" | "coming_up" | "waiting";

export function momentTypeOf(type: ReasonType | undefined): MomentType | null {
  if (!type) return null;
  if (type === "coming") return "coming_up";
  return type;
}

export interface ReturnLoopDeps {
  local: ReasonLocal;
  contacts: ContactRepo;
  /** The server's record of the reason (fire and forget; offline, the device's own record governs). */
  record: (reasonId: string, event: ReasonEvent, channel?: string) => void;
  now: () => Date;
}

/** What a Moment's reason gives its hand-off: the Moment detail's own words, "" for followUp kept ("ask nothing after"). */
export interface HandoffReason {
  id: string;
  type: ReasonType;
  ask?: string;
  about?: string | null;
  followUp?: string;
  itemId?: string | null;
}

/** The hand-off Kinship remembers for a reason, before the other app opens (Today's actions use exactly this). */
export function handoffFor(personId: string, channel: Handoff["channel"], r: HandoffReason): Omit<Handoff, "at" | "answered"> {
  return {
    reasonId: r.id, personId, channel, type: r.type, itemId: r.itemId ?? null,
    ask: r.ask || undefined, about: r.about || undefined,
    // "" is an answer: nothing to ask after a Waiting or a due promise's Yes (founder K3).
    followUp: r.followUp,
  };
}

/** Kinship opened a conversation from a Moment. Unset fields are left out ("" for followUp means "ask nothing after"). */
export async function handOff(d: ReturnLoopDeps, h: Omit<Handoff, "at" | "answered">): Promise<void> {
  const kept = Object.fromEntries(Object.entries(h).filter(([, v]) => v !== undefined)) as Omit<Handoff, "at" | "answered">;
  await d.local.handedOff({ ...kept, at: d.now().toISOString() });
  if (!isLocalReason(h.reasonId)) d.record(h.reasonId, "acted", h.channel);
}

/**
 * The one conversation a hand-off can become, by a key of the hand-off: a Yes
 * written twice (the app closed between writing it and keeping the answer)
 * is still one row. A UUID-shaped FNV-1a digest; not a secret, only stable.
 */
export function conversationId(h: Pick<Handoff, "reasonId" | "personId" | "at">): string {
  const text = `${h.reasonId}|${h.personId}|${h.at}`;
  const words = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map((seed) => {
    let x = seed >>> 0;
    for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 0x01000193) >>> 0;
    return x.toString(16).padStart(8, "0");
  }).join("");
  return `${words.slice(0, 8)}-${words.slice(8, 12)}-5${words.slice(13, 16)}-${((parseInt(words[16], 16) & 0x3) | 0x8).toString(16)}${words.slice(17, 20)}-${words.slice(20, 32)}`;
}

/**
 * The other app never opened: nothing was handed off. The Moment may speak
 * again, on this phone and, after a sync, whatever the server last heard
 * ("acted" was sent before the app opened).
 */
export async function cancelHandOff(d: ReturnLoopDeps, reasonId: string): Promise<void> {
  await d.local.cancel(reasonId, d.now().toISOString());
  if (!isLocalReason(reasonId)) d.record(reasonId, "return_not_yet");
}

/** The return check's answer. Null when nothing was waiting for one (or it was already answered). */
export async function answerReturn(d: ReturnLoopDeps, answer: "yes" | "not_yet"): Promise<Handoff | null> {
  // The conversation is written before the answer is kept (and only once, by its key). A "Not yet"
  // after a Yes that was written but not kept (the app closed in between) takes it back.
  const h = await d.local.answered(answer, d.now().toISOString(), (x) => answer === "yes" ? recordConversation(d, x) : unrecordConversation(d, x));
  if (!h) return null;
  if (!isLocalReason(h.reasonId)) d.record(h.reasonId, answer === "yes" ? "return_yes" : "return_not_yet");
  return h;
}

/**
 * A conversation recorded by mistake ("Not this", founder I2): it leaves the
 * trail, and a "Waiting on …" it answered may ask again, on this phone as
 * everywhere.
 */
export async function forgetConversation(d: Pick<ReturnLoopDeps, "local" | "contacts">, id: string): Promise<void> {
  const row = (await d.contacts.get(id)) as { memory_item_id?: unknown } | null;
  await d.contacts.forget(id);
  if (typeof row?.memory_item_id === "string") await d.local.reopenWaiting(row.memory_item_id);
}

async function unrecordConversation(d: ReturnLoopDeps, h: Handoff): Promise<void> {
  const id = conversationId(h);
  if (await d.contacts.get(id)) await d.contacts.forget(id);
}

async function recordConversation(d: ReturnLoopDeps, h: Handoff): Promise<void> {
  const id = conversationId(h);
  // Already written (or written and then "Not this"): never a second row, never a throw.
  if (await d.contacts.get(id, { includeDeleted: true })) return;
  const server = !isLocalReason(h.reasonId);
  {
    const moment = momentTypeOf(h.type);
    await d.contacts.confirm({
      id,
      person_id: h.personId,
      channel: h.channel,
      // When the conversation was: Kinship opened it then; the answer can come up to three days later.
      occurred_at: h.at,
      // A Moment made on this phone has no server reason: its kind says what was answered.
      // (A hand-off remembered by an older build carries neither: the user's own word.)
      source: server || moment ? "return_check" : "manual",
      ...(server ? { reason_id: h.reasonId } : {}),
      ...(moment ? { moment_type: moment } : {}),
      ...(h.itemId ? { memory_item_id: h.itemId } : {}),
    });
  }
}
