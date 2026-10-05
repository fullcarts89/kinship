// The address book, read on this phone only (plan T8, E16; contract §7).
// Kinship reads names, nicknames and birthdays so the user can pick the
// people they care about. Nothing here uploads anything: the screen saves
// only the people the user picks (their name, the device's contact id and
// the contact's birthday). Numbers are never read here; the hand-off reads
// them at tap time (src/platform/handoff.ts).

import { Linking, Platform } from "react-native";
import type { DeviceContact } from "@/features/setup/setupModel";

/** "granted" may be the whole address book or, on iOS 18+, only the contacts the user shared. */
export type ContactsAccess =
  | { state: "granted"; limited: boolean }
  | { state: "undetermined" }
  | { state: "denied"; canAskAgain: boolean }
  | { state: "unavailable" };

type ContactsModule = typeof import("expo-contacts");

async function load(): Promise<ContactsModule | null> {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-contacts");
  } catch {
    return null;
  }
}

function accessOf(r: { status: string; granted: boolean; canAskAgain: boolean; accessPrivileges?: string }): ContactsAccess {
  if (r.granted) return { state: "granted", limited: r.accessPrivileges === "limited" };
  if (r.status === "undetermined") return { state: "undetermined" };
  return { state: "denied", canAskAgain: r.canAskAgain };
}

export async function contactsAccess(): Promise<ContactsAccess> {
  const C = await load();
  if (!C) return { state: "unavailable" };
  try {
    return accessOf(await C.getPermissionsAsync());
  } catch {
    return { state: "unavailable" };
  }
}

/** Asks once (the system's prompt). Never asks again after a no. */
export async function requestContactsAccess(): Promise<ContactsAccess> {
  const C = await load();
  if (!C) return { state: "unavailable" };
  try {
    const now = await C.getPermissionsAsync();
    if (now.granted || !now.canAskAgain) return accessOf(now);
    return accessOf(await C.requestPermissionsAsync());
  } catch {
    return { state: "unavailable" };
  }
}

/** iOS 18+, limited access: lets the user share more contacts. Returns false where it doesn't exist. */
export async function shareMoreContacts(): Promise<boolean> {
  const C = await load();
  if (!C || Platform.OS !== "ios") return false;
  try {
    await C.presentAccessPickerAsync();
    return true;
  } catch {
    return false;
  }
}

/** Settings, for someone who said no and has changed their mind. */
export function openAppSettings(): void {
  void Linking.openSettings().catch(() => undefined);
}

/** Every contact this phone lets Kinship read: name, nickname, birthday. */
export async function readContacts(): Promise<DeviceContact[]> {
  const C = await load();
  if (!C) return [];
  const { data } = await C.getContactsAsync({
    fields: [C.Fields.Name, C.Fields.FirstName, C.Fields.LastName, C.Fields.Nickname, C.Fields.Birthday],
    sort: C.SortTypes.FirstName,
  });
  const out: DeviceContact[] = [];
  for (const c of data) {
    if (!c.id) continue;
    const name = (c.name || [c.firstName, c.lastName].filter(Boolean).join(" ")).trim();
    if (!name) continue;
    const b = c.birthday;
    out.push({
      id: c.id,
      name,
      nickname: c.nickname ?? null,
      // expo-contacts months start at 0, like JavaScript's Date.
      birthday: b && typeof b.day === "number" && typeof b.month === "number"
        ? { day: b.day, month: b.month + 1, year: typeof b.year === "number" ? b.year : null }
        : null,
    });
  }
  return out;
}
