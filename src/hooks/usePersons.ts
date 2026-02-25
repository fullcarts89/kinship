/**
 * Person Hooks
 *
 * React hooks for person data. Falls back to mock data
 * when Supabase is not configured.
 *
 * In mock mode, locally-created people are stored in a module-level
 * array so they persist across hook instances (different tabs) and
 * appear on refetch.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as personService from "@/services/personService";
import { mockPeople, getPersonById as mockGetPersonById } from "@/data/mock";
import type { Person, PersonInsert } from "@/types/database";

// ─── Shared local storage for mock mode ─────────────────────────────────────
// Persists across all hook instances so every tab sees newly-added people.

let locallyCreatedPeople: Person[] = [];
let localIdCounter = 100;

function getAllMockPeople(): Person[] {
  return [...locallyCreatedPeople, ...mockPeople];
}

// ─── usePersons ─────────────────────────────────────────────────────────────

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPersons(getAllMockPeople());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await personService.getPersons();
      setPersons(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createPerson = useCallback(
    async (person: Omit<PersonInsert, "user_id">) => {
      if (!isSupabaseConfigured) {
        // Create a local mock person so it shows up everywhere
        localIdCounter += 1;
        const created: Person = {
          id: `local-${localIdCounter}`,
          user_id: "u1",
          name: person.name,
          photo_url: person.photo_url ?? null,
          relationship_type: person.relationship_type,
          created_at: new Date().toISOString(),
        };
        locallyCreatedPeople = [created, ...locallyCreatedPeople];
        setPersons(getAllMockPeople());
        return created;
      }

      const created = await personService.createPerson(person);
      setPersons((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  return { persons, isLoading, error, refetch: fetch, createPerson };
}

// ─── usePerson ──────────────────────────────────────────────────────────────

export function usePerson(id: string) {
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Check locally-created people first, then mock data
      const local = locallyCreatedPeople.find((p) => p.id === id);
      setPerson(local ?? mockGetPersonById(id) ?? null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await personService.getPersonById(id);
      if (!cancelledRef.current) setPerson(data);
    } catch (err) {
      if (!cancelledRef.current)
        setError(err instanceof Error ? err : new Error(String(err)));
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
