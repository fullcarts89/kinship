/**
 * Memory Hooks
 *
 * React hooks for memory data. Attempts to read from Supabase first;
 * on failure, falls back to module-level mock data so the app works
 * in demo / development mode without a configured backend.
 */

import { useState, useEffect, useCallback } from "react";
import * as memoryService from "@/services/memoryService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { mockMemories } from "@/data/mock";
import type { Memory, MemoryInsert, MemoryUpdate } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────
const locallyCreatedMemories: Memory[] = [];

/** IDs of deleted memories — tombstones so demo data can't resurrect. */
const locallyDeletedMemoryIds = new Set<string>();

/** Hydrate locally created memories from disk exactly once per app launch. */
let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = Promise.all([
      loadCollection<Memory>("memories"),
      loadCollection<string>("deleted-memories"),
    ]).then(([stored, deleted]) => {
      locallyCreatedMemories.push(...stored);
      deleted.forEach((id) => locallyDeletedMemoryIds.add(id));
    });
  }
  return _hydration;
}

function persistMemories(): void {
  saveCollection("memories", locallyCreatedMemories);
}

function persistDeletedMemories(): void {
  saveCollection("deleted-memories", [...locallyDeletedMemoryIds]);
}

function isDeleted(m: Memory): boolean {
  return locallyDeletedMemoryIds.has(m.id);
}

/** Insert or replace a memory locally (local entries shadow mock data). */
function upsertLocalMemory(memory: Memory): void {
  const idx = locallyCreatedMemories.findIndex((m) => m.id === memory.id);
  if (idx >= 0) {
    locallyCreatedMemories[idx] = memory;
  } else {
    locallyCreatedMemories.unshift(memory);
  }
  persistMemories();
}

function removeLocalMemory(id: string): void {
  const idx = locallyCreatedMemories.findIndex((m) => m.id === id);
  if (idx >= 0) locallyCreatedMemories.splice(idx, 1);
  locallyDeletedMemoryIds.add(id);
  persistMemories();
  persistDeletedMemories();
}

/** Cascade helper: drop every memory belonging to a removed person. */
export async function removeLocalMemoriesForPerson(personId: string): Promise<void> {
  await ensureHydrated();
  for (let i = locallyCreatedMemories.length - 1; i >= 0; i--) {
    if (locallyCreatedMemories[i].person_id === personId) {
      locallyDeletedMemoryIds.add(locallyCreatedMemories[i].id);
      locallyCreatedMemories.splice(i, 1);
    }
  }
  for (const m of mockMemories) {
    if (m.person_id === personId) locallyDeletedMemoryIds.add(m.id);
  }
  persistMemories();
  persistDeletedMemories();
}

/** Remove all locally created memories (used by the delete-account flow). */
export function clearLocalMemories(): void {
  locallyCreatedMemories.length = 0;
  locallyDeletedMemoryIds.clear();
  persistMemories();
  persistDeletedMemories();
}

// ─── useMemories (all) ─────────────────────────────────────────────────────

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    await ensureHydrated();
    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getMemories();
      // Always merge locally created memories so saves persist across refetches
      const localIds = new Set(locallyCreatedMemories.map((m) => m.id));
      setMemories(
        [...locallyCreatedMemories, ...data.filter((m) => !localIds.has(m.id))].filter(
          (m) => !isDeleted(m)
        )
      );
    } catch {
      // Mock mode — merge locally created + mock data (local shadows mock)
      const localIds = new Set(locallyCreatedMemories.map((m) => m.id));
      setMemories(
        [...locallyCreatedMemories, ...mockMemories.filter((m) => !localIds.has(m.id))].filter(
          (m) => !isDeleted(m)
        )
      );
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
    await ensureHydrated();
    try {
      setIsLoading(true);
      setError(null);
      const data = await memoryService.getMemoriesForPerson(personId);
      // Always merge locally created memories so saves persist across refetches
      const localForPerson = locallyCreatedMemories.filter((m) => m.person_id === personId);
      const localIds = new Set(localForPerson.map((m) => m.id));
      setMemories(
        [...localForPerson, ...data.filter((m) => !localIds.has(m.id))].filter(
          (m) => !isDeleted(m)
        )
      );
    } catch {
      // Mock mode — merge and filter by person (local shadows mock)
      const localIds = new Set(locallyCreatedMemories.map((m) => m.id));
      setMemories(
        [...locallyCreatedMemories, ...mockMemories.filter((m) => !localIds.has(m.id))].filter(
          (m) => m.person_id === personId && !isDeleted(m)
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
      await ensureHydrated();
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
        persistMemories();
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
    await ensureHydrated();
    try {
      setIsLoading(true);
      // Placeholder for future Supabase lookup
      throw new Error("mock mode");
    } catch {
      // Mock mode — search locally created + mock data
      const found =
        [...locallyCreatedMemories, ...mockMemories].find(
          (m) => m.id === id && !isDeleted(m)
        ) ?? null;
      setMemory(found);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { memory, isLoading, refetch: fetch };
}

// ─── useUpdateMemory ────────────────────────────────────────────────────────

export function useUpdateMemory() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateMemory = useCallback(
    async (id: string, updates: MemoryUpdate): Promise<Memory | null> => {
      await ensureHydrated();
      setIsUpdating(true);
      try {
        const updated = await memoryService.updateMemory(id, updates);
        upsertLocalMemory(updated);
        return updated;
      } catch {
        // Mock mode — apply the update locally, shadowing demo data
        const existing =
          locallyCreatedMemories.find((m) => m.id === id) ??
          mockMemories.find((m) => m.id === id);
        if (!existing || locallyDeletedMemoryIds.has(id)) return null;
        const updated: Memory = { ...existing, ...updates };
        upsertLocalMemory(updated);
        return updated;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { updateMemory, isUpdating };
}

// ─── useDeleteMemory ────────────────────────────────────────────────────────

export function useDeleteMemory() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMemory = useCallback(async (id: string): Promise<void> => {
    await ensureHydrated();
    setIsDeleting(true);
    try {
      try {
        await memoryService.deleteMemory(id);
      } catch {
        // Mock mode — the tombstone below is the deletion
      }
      removeLocalMemory(id);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteMemory, isDeleting };
}
