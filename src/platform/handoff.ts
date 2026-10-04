// The hand-off to a real conversation (plan §15; E14). Kinship opens the
// channel and never sends anything: no body, nothing pasted.
//
// Numbers and addresses come from the person's contact on this phone, read
// at tap time, and are never stored or uploaded (people.contact_ref holds
// only the device's contact id). Opening a channel writes nothing; only the
// user's "Yes" to the return check records that they connected.

import { Linking, Platform } from "react-native";

export type HandoffChannel = "text" | "call" | "facetime" | "whatsapp" | "email";

export interface ContactRoutes {
  contactId: string | null;
  phones: string[];
  emails: string[];
}

/** Digits and a leading +, as dialers expect. */
export function dialable(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

/** The URL that opens a channel to this phone or address; null when it can't. */
export function urlFor(channel: HandoffChannel, value: string): string | null {
  if (channel === "email") return /^[^\s@]+@[^\s@]+$/.test(value.trim()) ? `mailto:${encodeURIComponent(value.trim())}` : null;
  const n = dialable(value);
  if (n.replace("+", "").length < 3) return null;
  switch (channel) {
    case "text":
      return `sms:${n}`;
    case "call":
      return `tel:${n}`;
    case "facetime":
      return `facetime:${n}`;
    case "whatsapp":
      // WhatsApp wants the international number without "+".
      return n.startsWith("+") ? `whatsapp://send?phone=${n.slice(1)}` : null;
  }
}

/** Which channels this person can be reached on from this phone. */
export function channelsFor(routes: ContactRoutes): HandoffChannel[] {
  const out: HandoffChannel[] = [];
  if (routes.phones.length) {
    out.push("text", "call");
    if (Platform.OS === "ios") out.push("facetime");
    if (routes.phones.some((p) => p.trim().startsWith("+"))) out.push("whatsapp");
  }
  if (routes.emails.length) out.push("email");
  return out;
}

export const CHANNEL_LABEL: Record<HandoffChannel, string> = {
  text: "Open Messages",
  call: "Call",
  facetime: "FaceTime",
  whatsapp: "WhatsApp",
  email: "Email",
};

function pickPhone(phones: { number?: string; label?: string; isPrimary?: boolean }[]): string[] {
  const ranked = [...phones].sort((a, b) => {
    const score = (p: { label?: string; isPrimary?: boolean }) =>
      (p.isPrimary ? 4 : 0) + (/iphone|mobile|cell/i.test(p.label ?? "") ? 2 : 0);
    return score(b) - score(a);
  });
  return ranked.map((p) => p.number ?? "").filter(Boolean);
}

/** Reads a person's numbers and addresses from their contact on this phone. */
export async function routesFor(contactId: string | null): Promise<ContactRoutes> {
  const empty = { contactId, phones: [], emails: [] };
  if (!contactId || Platform.OS === "web") return empty;
  try {
    const Contacts = await import("expo-contacts");
    const perm = await Contacts.getPermissionsAsync();
    const granted = perm.granted || (perm.canAskAgain && (await Contacts.requestPermissionsAsync()).granted);
    if (!granted) return empty;
    const c = await Contacts.getContactByIdAsync(contactId, [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails]);
    if (!c) return empty;
    return {
      contactId,
      phones: pickPhone(c.phoneNumbers ?? []),
      emails: (c.emails ?? []).map((e) => e.email ?? "").filter(Boolean),
    };
  } catch {
    return empty;
  }
}

/** The system contact picker (no permission needed to pick one). */
export async function pickContact(): Promise<ContactRoutes | null> {
  if (Platform.OS === "web") return null;
  try {
    const Contacts = await import("expo-contacts");
    const c = await Contacts.presentContactPickerAsync();
    if (!c?.id) return null;
    return {
      contactId: c.id,
      phones: pickPhone(c.phoneNumbers ?? []),
      emails: (c.emails ?? []).map((e) => e.email ?? "").filter(Boolean),
    };
  } catch {
    return null;
  }
}

/** Opens the channel. False when this phone can't (WhatsApp not installed, no number). */
export async function openChannel(channel: HandoffChannel, routes: ContactRoutes): Promise<boolean> {
  const value = channel === "email" ? routes.emails[0] : channel === "whatsapp"
    ? routes.phones.find((p) => p.trim().startsWith("+"))
    : routes.phones[0];
  const url = value ? urlFor(channel, value) : null;
  if (!url) return false;
  try {
    if (channel === "whatsapp" && !(await Linking.canOpenURL(url))) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
