/**
 * Memory Hooks
 *
 * React hooks for memory data. Falls back to mock data
 * when Supabase is not configured.
 *
 * In mock mode, locally-created memories are stored in a module-level
 * array so they persist across hook instances and appear on refetch.
 */

import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as memoryService from "@/services/memoryService";
import {
  mockMemories,
  getMemoriesForPerson as mockGetMemoriesForPerson,
} from "@/data/mock";
import type { Memory, MemoryInsert } from "@/types/database";

// ─── Shared local storage for mock mode ─────────────────────────────────────

let locallyCreatedMemories: Memory[] = [];
let localMemoryIdCounter = 200;

function getAllMockMemories(): Memory[] {
  return [...locallyCreatedMemories, ...mockMemories];
}

// ─── useMemories (all) ─────────────────────────────────────────────────────

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setMemories(getAllMockMemories());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getMemories();
      setMemories(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
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
    if (!isSupabaseConfigured) {
      // Include locally-created memories for this person
      const localForPerson = locallyCreatedMemories.filter(
        (m) => m.person_id === personId
      );
      const mockForPerson = mockGetMemoriesForPerson(personId);
      setMemories([...localForPerson, ...mockForPerson]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getMemoriesForPerson(personId);
      setMemories(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
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
    async (memory: Omit<MemoryInsert, "user_id">) => {
      if (!isSupabaseConfigured) {
        // Create a local mock memory so it shows up everywhere
        localMemoryIdCounter += 1;
        const created: Memory = {
          id: `local-m${localMemoryIdCounter}`,
          user_id: "u1",
          person_id: memory.person_id,
          content: memory.content,
          emotion: memory.emotion ?? null,
          created_at: new Date().toISOString(),
        };
        locallyCreatedMemories = [created, ...locallyCreatedMemories];
        return created;
      }

      try {
        setIsCreating(true);
        setError(null);
        const created = await memoryService.createMemory(memory);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createMemory, isCreating, error };
}
