/**
 * Person Hooks
 *
 * React hooks for person data. Signed in, they read and write the server
 * only and surface failures (see src/lib/dataMode.ts). In demo mode (no
 * backend) people live on the device alongside the bundled demo garden.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as personService from "@/services/personService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { isDemoMode, toError } from "@/lib/dataMode";
import { mockPeople } from "@/data/mock";
import { removeLocalMemoriesForPerson } from "@/hooks/useMemories";
import { removeLocalInteractionsForPerson } from "@/hooks/useInteractions";
import type { Person, PersonInsert, PersonUpdate } from "@/types/database";

// ─── Demo-mode Persistence ─────────────────────────────────────────────────
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
 * mock/demo data with the same id, which is how edits to demo people
 * survive in mock mode.
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

/** Remove all locally created people (used by the delete-account flow). */
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
    if (!isDemoMode) {
      try {
        setPersons(await personService.getPersons());
      } catch (err) {
        setError(toError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    await ensureHydrated();
    try {
      // Demo mode — merge locally created + demo data (local shadows demo)
      const localIds = new Set(locallyCreatedPeople.map((p) => p.id));
      setPersons(
        [
          ...locallyCreatedPeople,
          ...mockPeople.filter((p) => !localIds.has(p.id)),
        ].filter((p) => !isPersonDeleted(p.id))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createPerson = useCallback(
    async (person: Omit<PersonInsert, "user_id">): Promise<Person> => {
      if (!isDemoMode) {
        // Failures reach the caller; nothing is saved on the device.
        const created = await personService.createPerson(person);
        setPersons((prev) => [created, ...prev]);
        return created;
      }
      await ensureHydrated();
      const newPerson: Person = {
        id: `p-local-${Date.now()}`,
        user_id: "demo",
        name: person.name,
        photo_url: person.photo_url ?? null,
        relationship_type: person.relationship_type,
        birthday: person.birthday,
        phone: person.phone ?? null,
        email: person.email ?? null,
        created_at: new Date().toISOString(),
      };
      locallyCreatedPeople.unshift(newPerson);
      persistPeople();
      setPersons((prev) => [newPerson, ...prev]);
      return newPerson;
    },
    []
  );

  return { persons, isLoading, error, refetch: fetch, createPerson };
}

// ─── useUpdatePerson ────────────────────────────────────────────────────────

export function useUpdatePerson() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePerson = useCallback(
    async (id: string, updates: PersonUpdate): Promise<Person | null> => {
      setIsUpdating(true);
      try {
        if (!isDemoMode) return await personService.updatePerson(id, updates);
        await ensureHydrated();
        // Demo mode — apply the update to the local copy, shadowing
        // demo data when the person came from mock.
        const existing =
          locallyCreatedPeople.find((p) => p.id === id) ??
          mockPeople.find((p) => p.id === id);
        if (!existing) return null;
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
   * interactions. Signed in, the server deletes them (rows cascade via
   * FK) and a failure reaches the caller; in demo mode, local tombstones.
   */
  const deletePerson = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      if (!isDemoMode) {
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
    setIsLoading(true);
    setError(null);
    if (!isDemoMode) {
      try {
        const data = await personService.getPersonById(id);
        if (!cancelledRef.current) setPerson(data);
      } catch (err) {
        if (!cancelledRef.current) setError(toError(err));
      } finally {
        if (!cancelledRef.current) setIsLoading(false);
      }
      return;
    }
    await ensureHydrated();
    try {
      // Demo mode — check locally created people, then demo data
      if (!cancelledRef.current) {
        const local = isPersonDeleted(id)
          ? null
          : (locallyCreatedPeople.find((p) => p.id === id) ??
            mockPeople.find((p) => p.id === id) ??
            null);
        setPerson(local);
        setError(local ? null : new Error("Person not found"));
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
