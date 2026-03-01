/**
 * Person Hooks
 *
 * React hooks for person data. Attempts to read from Supabase first;
 * on failure, falls back to module-level mock data so the app works
 * in demo / development mode without a configured backend.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as personService from "@/services/personService";
import { mockPeople } from "@/data/mock";
import type { Person, PersonInsert } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────
const locallyCreatedPeople: Person[] = [];

// ─── usePersons ─────────────────────────────────────────────────────────────

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await personService.getPersons();
      // Always merge locally created people so saves persist across refetches
      const localIds = new Set(locallyCreatedPeople.map((p) => p.id));
      setPersons([...locallyCreatedPeople, ...data.filter((p) => !localIds.has(p.id))]);
    } catch {
      // Mock mode — merge locally created + mock data
      setPersons([...locallyCreatedPeople, ...mockPeople]);
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
        setPersons((prev) => [newPerson, ...prev]);
        return newPerson;
      }
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
