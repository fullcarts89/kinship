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

/** Kinship opened a conversation from a Moment. */
export async function handOff(d: ReturnLoopDeps, h: Omit<Handoff, "at" | "answered">): Promise<void> {
  await d.local.handedOff({ ...h, at: d.now().toISOString() });
  if (!isLocalReason(h.reasonId)) d.record(h.reasonId, "acted", h.channel);
}

/** The return check's answer. Null when nothing was waiting for one (or it was already answered). */
export async function answerReturn(d: ReturnLoopDeps, answer: "yes" | "not_yet"): Promise<Handoff | null> {
  const h = await d.local.answered(answer, d.now().toISOString());
  if (!h) return null;
  const server = !isLocalReason(h.reasonId);
  if (server) d.record(h.reasonId, answer === "yes" ? "return_yes" : "return_not_yet");
  if (answer === "yes") {
    const moment = momentTypeOf(h.type);
    await d.contacts.confirm({
      person_id: h.personId,
      channel: h.channel,
      // A Moment made on this phone has no server reason: its kind says what was answered.
      // (A hand-off remembered by an older build carries neither: the user's own word.)
      source: server || moment ? "return_check" : "manual",
      ...(server ? { reason_id: h.reasonId } : {}),
      ...(moment ? { moment_type: moment } : {}),
      ...(h.itemId ? { memory_item_id: h.itemId } : {}),
    });
  }
  return h;
}
