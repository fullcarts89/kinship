/**
 * Person Hooks
 *
 * React hooks for person data.
 *
 * With Supabase configured, the server is the only source of truth: a
 * failed read surfaces as `error` and a failed write throws, so screens can
 * say so. Nothing is substituted — a signed-in user never sees demo people,
 * even offline.
 *
 * Without Supabase (demo mode), people come from the bundled demo garden
 * plus anything created on this device, persisted via localStore.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as personService from "@/services/personService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { toError } from "@/lib/utils";
import { mockPeople } from "@/data/mock";
import { removeLocalMemoriesForPerson } from "@/hooks/useMemories";
import { removeLocalInteractionsForPerson } from "@/hooks/useInteractions";
import type { Person, PersonInsert, PersonUpdate } from "@/types/database";

// ─── Demo-mode Local Persistence ────────────────────────────────────────────
// Only touched when Supabase isn't configured.
const locallyCreatedPeople: Person[] = [];

/** IDs of removed people — tombstones so demo data can't resurrect. */
const locallyDeletedPersonIds = new Set<string>();

/** Hydrate locally created people from disk exactly once per app launch. */
let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = Promise.all([
      loadCollection<Person>("people"),
      loadCollection<string>("deleted-people"),
    ]).then(([stored, deleted]) => {
      locallyCreatedPeople.push(...stored);
      deleted.forEach((id) => locallyDeletedPersonIds.add(id));
    });
  }
  return _hydration;
}

function persistDeletedPeople(): void {
  saveCollection("deleted-people", [...locallyDeletedPersonIds]);
}

function isPersonDeleted(id: string): boolean {
  return locallyDeletedPersonIds.has(id);
}

function persistPeople(): void {
  saveCollection("people", locallyCreatedPeople);
}

/**
 * Insert or replace a person in the local store. Local entries shadow
 * demo data with the same id, which is how edits to demo people survive
 * in demo mode.
 */
function upsertLocalPerson(person: Person): void {
  const idx = locallyCreatedPeople.findIndex((p) => p.id === person.id);
  if (idx >= 0) {
    locallyCreatedPeople[idx] = person;
  } else {
    locallyCreatedPeople.unshift(person);
  }
  persistPeople();
}

/** The demo garden: locally created people shadow demo people. */
function localGarden(): Person[] {
  const localIds = new Set(locallyCreatedPeople.map((p) => p.id));
  return [
    ...locallyCreatedPeople,
    ...mockPeople.filter((p) => !localIds.has(p.id)),
  ].filter((p) => !isPersonDeleted(p.id));
}

/** Remove all locally created people (sign-out and delete-account flows). */
export function clearLocalPeople(): void {
  locallyCreatedPeople.length = 0;
  locallyDeletedPersonIds.clear();
  persistPeople();
  persistDeletedPeople();
}

// ─── usePersons ─────────────────────────────────────────────────────────────

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        setPersons(await personService.getPersons());
      } else {
        await ensureHydrated();
        setPersons(localGarden());
      }
    } catch (err) {
      // Offline or signed out — show that, never stand-in data.
      setPersons([]);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  /** Plant a new person. Throws when the server can't be reached. */
  const createPerson = useCallback(
    async (person: Omit<PersonInsert, "user_id">): Promise<Person> => {
      let created: Person;
      if (isSupabaseConfigured) {
        created = await personService.createPerson(person);
      } else {
        await ensureHydrated();
        created = {
          id: `p-local-${Date.now()}`,
          user_id: "u1",
          name: person.name,
          photo_url: person.photo_url ?? null,
          relationship_type: person.relationship_type,
          birthday: person.birthday,
          phone: person.phone ?? null,
          email: person.email ?? null,
          interests: person.interests ?? null,
          notes: person.notes ?? null,
          created_at: new Date().toISOString(),
        };
        locallyCreatedPeople.unshift(created);
        persistPeople();
      }
      setPersons((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  return { persons, isLoading, error, refetch: fetch, createPerson };
}

// ─── useUpdatePerson ────────────────────────────────────────────────────────

export function useUpdatePerson() {
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Apply an update. Resolves to null when the person doesn't exist;
   * throws when the server can't be reached.
   */
  const updatePerson = useCallback(
    async (id: string, updates: PersonUpdate): Promise<Person | null> => {
      setIsUpdating(true);
      try {
        if (isSupabaseConfigured) {
          return await personService.updatePerson(id, updates);
        }
        // Demo mode — apply the update to the local copy, shadowing demo
        // data when the person came from the demo garden.
        await ensureHydrated();
        const existing =
          locallyCreatedPeople.find((p) => p.id === id) ??
          mockPeople.find((p) => p.id === id);
        if (!existing || isPersonDeleted(id)) return null;
        const updated: Person = { ...existing, ...updates };
        upsertLocalPerson(updated);
        return updated;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { updatePerson, isUpdating };
}

// ─── useDeletePerson ────────────────────────────────────────────────────────

export function useDeletePerson() {
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Remove a person from the garden, along with their memories and
   * interactions. On the server, rows cascade via FK and a failure throws;
   * in demo mode, local tombstones hide the person and their history.
   */
  const deletePerson = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      if (isSupabaseConfigured) {
        await personService.deletePerson(id);
        return;
      }
      await ensureHydrated();
      const idx = locallyCreatedPeople.findIndex((p) => p.id === id);
      if (idx >= 0) locallyCreatedPeople.splice(idx, 1);
      locallyDeletedPersonIds.add(id);
      persistPeople();
      persistDeletedPeople();
      await removeLocalMemoriesForPerson(id);
      await removeLocalInteractionsForPerson(id);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deletePerson, isDeleting };
}

// ─── usePerson ──────────────────────────────────────────────────────────────

export function usePerson(id: string) {
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const fetch = useCallback(async () => {
    // No id yet (e.g. waiting on a parent record) — nothing to look up.
    if (!id) {
      setPerson(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let data: Person | null;
      if (isSupabaseConfigured) {
        data = await personService.getPersonById(id);
      } else {
        await ensureHydrated();
        data = localGarden().find((p) => p.id === id) ?? null;
      }
      if (!cancelledRef.current) setPerson(data);
    } catch (err) {
      if (!cancelledRef.current) {
        setPerson(null);
        setError(toError(err));
      }
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cancelledRef.current = false;
    fetch();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetch]);

  return { person, isLoading, error, refetch: fetch };
}
