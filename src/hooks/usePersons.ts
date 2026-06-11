/**
 * Person Hooks
 *
 * React hooks for person data. Attempts to read from Supabase first;
 * on failure, falls back to module-level mock data so the app works
 * in demo / development mode without a configured backend.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as personService from "@/services/personService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { mockPeople } from "@/data/mock";
import type { Person, PersonInsert, PersonUpdate } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────
const locallyCreatedPeople: Person[] = [];

/** Hydrate locally created people from disk exactly once per app launch. */
let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = loadCollection<Person>("people").then((stored) => {
      locallyCreatedPeople.push(...stored);
    });
  }
  return _hydration;
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
  persistPeople();
}

// ─── usePersons ─────────────────────────────────────────────────────────────

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    await ensureHydrated();
    try {
      setIsLoading(true);
      setError(null);
      const data = await personService.getPersons();
      // Always merge locally created people so saves persist across refetches
      const localIds = new Set(locallyCreatedPeople.map((p) => p.id));
      setPersons([...locallyCreatedPeople, ...data.filter((p) => !localIds.has(p.id))]);
    } catch {
      // Mock mode — merge locally created + mock data (local shadows mock)
      const localIds = new Set(locallyCreatedPeople.map((p) => p.id));
      setPersons([
        ...locallyCreatedPeople,
        ...mockPeople.filter((p) => !localIds.has(p.id)),
      ]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createPerson = useCallback(
    async (person: Omit<PersonInsert, "user_id">): Promise<Person> => {
      await ensureHydrated();
      try {
        const created = await personService.createPerson(person);
        locallyCreatedPeople.unshift(created);
        setPersons((prev) => [created, ...prev]);
        return created;
      } catch {
        // Mock mode — Supabase not configured or auth failed
        const newPerson: Person = {
          id: `p-local-${Date.now()}`,
          user_id: "u1",
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
      }
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
      await ensureHydrated();
      setIsUpdating(true);
      try {
        const updated = await personService.updatePerson(id, updates);
        upsertLocalPerson(updated);
        return updated;
      } catch {
        // Mock mode — apply the update to the local copy, shadowing
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

// ─── usePerson ──────────────────────────────────────────────────────────────

export function usePerson(id: string) {
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const fetch = useCallback(async () => {
    await ensureHydrated();
    try {
      setIsLoading(true);
      setError(null);
      const data = await personService.getPersonById(id);
      if (!cancelledRef.current) setPerson(data);
    } catch {
      // Mock fallback — check locally created people, then mock data
      if (!cancelledRef.current) {
        const local =
          locallyCreatedPeople.find((p) => p.id === id) ??
          mockPeople.find((p) => p.id === id) ??
          null;
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
