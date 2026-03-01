/**
 * Contact Utilities
 *
 * Shared helpers for loading device contacts, normalising phone numbers,
 * and detecting duplicates against existing garden people.
 *
 * This module is intentionally React-free so it can be reused from
 * components, screens, or services.
 *
 * IMPORTANT: expo-contacts MUST be loaded via lazy `require()` inside
 * a try/catch — a top-level import crashes in Expo Go.
 */

import type { Person } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContactEntry {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: string; // ISO date string, e.g. "1990-03-15" or "0000-03-15"
}

export interface AnnotatedContact extends ContactEntry {
  isDuplicate: boolean;
  matchedPersonName?: string;
}

// ─── Phone Normalisation ────────────────────────────────────────────────────

/**
 * Strip all non-digit characters, return last 10 digits.
 * Handles "+1 (555) 123-4567" → "5551234567".
 * Returns null when fewer than 7 digits (too short to match reliably).
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

// ─── Duplicate Index ────────────────────────────────────────────────────────

export interface DuplicateIndex {
  phones: Map<string, string>; // normalised phone → person display name
  emails: Map<string, string>; // lowercased email → person display name
  names: Map<string, string>; // lowercased trimmed name → person display name
}

/**
 * Build a lookup structure from existing garden people for O(1)
 * matching per device contact.
 */
export function buildDuplicateIndex(persons: Person[]): DuplicateIndex {
  const phones = new Map<string, string>();
  const emails = new Map<string, string>();
  const names = new Map<string, string>();

  for (const p of persons) {
    if (p.phone) {
      const norm = normalizePhone(p.phone);
      if (norm) phones.set(norm, p.name);
    }
    if (p.email) {
      emails.set(p.email.toLowerCase().trim(), p.name);
    }
    names.set(p.name.toLowerCase().trim(), p.name);
  }

  return { phones, emails, names };
}

/**
 * Check whether a single contact is already planted in the garden.
 *
 * Match priority:
 *   1. Normalised phone number (most reliable)
 *   2. Case-insensitive email
 *   3. Exact case-insensitive name (fallback for contacts without phone/email)
 */
export function checkDuplicate(
  contact: ContactEntry,
  index: DuplicateIndex
): { isDuplicate: boolean; matchedPersonName?: string } {
  // Phone match
  if (contact.phone) {
    const norm = normalizePhone(contact.phone);
    if (norm && index.phones.has(norm)) {
      return { isDuplicate: true, matchedPersonName: index.phones.get(norm) };
    }
  }

  // Email match
  if (contact.email) {
    const key = contact.email.toLowerCase().trim();
    if (index.emails.has(key)) {
      return { isDuplicate: true, matchedPersonName: index.emails.get(key) };
    }
  }

  // Name match (weakest — only used if contact has no phone or email)
  if (!contact.phone && !contact.email) {
    const key = contact.name.toLowerCase().trim();
    if (index.names.has(key)) {
      return { isDuplicate: true, matchedPersonName: index.names.get(key) };
    }
  }

  return { isDuplicate: false };
}

// ─── Contact Loading ────────────────────────────────────────────────────────

/**
 * Load all device contacts using a lazy require("expo-contacts").
 *
 * Returns { contacts, permissionDenied }.
 * • permissionDenied = true when the module can't load or the user declined.
 * • contacts will be an empty array when permission is denied.
 */
export async function loadDeviceContacts(): Promise<{
  contacts: ContactEntry[];
  permissionDenied: boolean;
  accessLimited: boolean;
  error?: string;
}> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let ExpoContacts: any;
  try {
    ExpoContacts = require("expo-contacts");
  } catch (e: any) {
    return { contacts: [], permissionDenied: true, accessLimited: false, error: `Module load failed: ${e?.message}` };
  }

  try {
    const permResponse = await ExpoContacts.requestPermissionsAsync();
    const { status, accessPrivileges } = permResponse;
    if (status !== "granted") {
      return { contacts: [], permissionDenied: true, accessLimited: false, error: `Permission: ${status}, access: ${accessPrivileges ?? "unknown"}` };
    }

    const isLimited = accessPrivileges === "limited";

    // Fetch ALL contacts — include Name/FirstName fields explicitly
    // and skip SortTypes (not always available) — we sort locally instead
    const { data } = await ExpoContacts.getContactsAsync({
      fields: [
        ExpoContacts.Fields.Name,
        ExpoContacts.Fields.FirstName,
        ExpoContacts.Fields.LastName,
        ExpoContacts.Fields.PhoneNumbers,
        ExpoContacts.Fields.Emails,
        ExpoContacts.Fields.Birthday,
      ],
    });

    if (!data || !Array.isArray(data)) {
      return { contacts: [], permissionDenied: false, accessLimited: isLimited, error: `getContactsAsync returned: ${typeof data}` };
    }

    const contacts: ContactEntry[] = data
      .map((c: any) => {
        // Build display name — use `name` first, fall back to firstName + lastName
        const displayName = (
          c.name ||
          [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ") ||
          ""
        ).trim();

        if (!displayName) return null;

        // Convert expo-contacts birthday { day, month (0-indexed), year }
        let birthday: string | undefined;
        if (c.birthday) {
          const { year, month, day } = c.birthday;
          if (month != null && day != null) {
            const m = String(month + 1).padStart(2, "0");
            const d = String(day).padStart(2, "0");
            birthday = year ? `${year}-${m}-${d}` : `0000-${m}-${d}`;
          }
        }

        return {
          id: c.id || String(Math.random()),
          name: displayName,
          phone: c.phoneNumbers?.[0]?.number,
          email: c.emails?.[0]?.email,
          birthday,
        };
      })
      .filter(Boolean) as ContactEntry[];

    // Sort locally by name (ascending, case-insensitive)
    contacts.sort((a, b) => a.name.localeCompare(b.name));

    return { contacts, permissionDenied: false, accessLimited: isLimited };
  } catch (e: any) {
    return { contacts: [], permissionDenied: false, accessLimited: false, error: `Fetch failed: ${e?.message}` };
  }
}

// ─── Annotation Helper ──────────────────────────────────────────────────────

/**
 * Annotate a list of device contacts with duplicate status.
 * Non-duplicates appear first, duplicates sorted to the bottom.
 */
export function annotateContacts(
  contacts: ContactEntry[],
  persons: Person[]
): AnnotatedContact[] {
  const index = buildDuplicateIndex(persons);

  const annotated: AnnotatedContact[] = contacts.map((c) => {
    const { isDuplicate, matchedPersonName } = checkDuplicate(c, index);
    return { ...c, isDuplicate, matchedPersonName };
  });

  // Stable sort: non-duplicates first, then duplicates
  return annotated.sort((a, b) => {
    if (a.isDuplicate === b.isDuplicate) return 0;
    return a.isDuplicate ? 1 : -1;
  });
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

/** Format a birthday ISO string for display preview (e.g. "Mar 15") */
export function formatBirthdayPreview(birthday: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const parts = birthday.split("-");
  if (parts.length < 3) return birthday;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${months[monthIdx] ?? "?"} ${day}`;
}

/** Get initials from a name (e.g. "Sarah Miller" → "SM") */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Pending Import (module-level shared state) ─────────────────────────────

/**
 * Module-level store for passing a selected contact from the Import
 * Contacts screen to the Add Person tab.
 *
 * Route params don't reliably reach tab routes in Expo Router, so we
 * use the same module-level shared state pattern as locallyCreatedPeople.
 */
let pendingImportContact: ContactEntry | null = null;

/** Set a contact to be pre-filled in the Add Person flow */
export function setPendingImport(contact: ContactEntry): void {
  pendingImportContact = contact;
}

/** Consume the pending import (returns and clears it) */
export function consumePendingImport(): ContactEntry | null {
  const c = pendingImportContact;
  pendingImportContact = null;
  return c;
}
