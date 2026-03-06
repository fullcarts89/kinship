/**
 * Memory Hooks
 *
 * React hooks for memory data. Attempts to read from Supabase first;
 * on failure, falls back to module-level mock data so the app works
 * in demo / development mode without a configured backend.
 */

import { useState, useEffect, useCallback } from "react";
import * as memoryService from "@/services/memoryService";
import { mockMemories } from "@/data/mock";
import type { Memory, MemoryInsert } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────
const locallyCreatedMemories: Memory[] = [];

// ─── useMemories (all) ─────────────────────────────────────────────────────

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getMemories();
      // Always merge locally created memories so saves persist across refetches
      const localIds = new Set(locallyCreatedMemories.map((m) => m.id));
      setMemories([...locallyCreatedMemories, ...data.filter((m) => !localIds.has(m.id))]);
    } catch {
      // Mock mode — merge locally created + mock data
      setMemories([...locallyCreatedMemories, ...mockMemories]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { memories, isLoading, error, refetch: fetch };
}

// ─── usePersonMemories ──────────────────────────────────────────────────────

export function usePersonMemories(personId: string) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getMemoriesForPerson(personId);
      // Always merge locally created memories so saves persist across refetches
      const localForPerson = locallyCreatedMemories.filter((m) => m.person_id === personId);
      const localIds = new Set(localForPerson.map((m) => m.id));
      setMemories([...localForPerson, ...data.filter((m) => !localIds.has(m.id))]);
    } catch {
      // Mock mode — merge and filter by person
      setMemories(
        [...locallyCreatedMemories, ...mockMemories].filter(
          (m) => m.person_id === personId
        )
      );
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { memories, isLoading, error, refetch: fetch };
}

// ─── useCreateMemory ────────────────────────────────────────────────────────

export function useCreateMemory() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMemory = useCallback(
    async (memory: Omit<MemoryInsert, "user_id">): Promise<Memory> => {
      try {
        setIsCreating(true);
        setError(null);
        const created = await memoryService.createMemory(memory);
        return created;
      } catch {
        // Mock mode — Supabase not configured
        const newMemory: Memory = {
          id: `m-local-${Date.now()}`,
          user_id: "u1",
          person_id: memory.person_id,
          content: memory.content,
          emotion: memory.emotion ?? null,
          photo_url: memory.photo_url ?? null,
          occurred_at: memory.occurred_at ?? new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        locallyCreatedMemories.unshift(newMemory);
        return newMemory;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createMemory, isCreating, error };
}

// ─── useMemory (single by ID) ──────────────────────────────────────────────

export function useMemory(id: string) {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      // Placeholder for future Supabase lookup
      throw new Error("mock mode");
    } catch {
      // Mock mode — search locally created + mock data
      const found =
        [...locallyCreatedMemories, ...mockMemories].find(
          (m) => m.id === id
        ) ?? null;
      setMemory(found);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { memory, isLoading };
}
