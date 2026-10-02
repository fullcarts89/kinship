/**
 * Memory Hooks
 *
 * React hooks for memory data. Signed in, they read and write the server
 * only and surface failures (see src/lib/dataMode.ts). In demo mode (no
 * backend) memories live on the device alongside the bundled demo garden.
 */

import { useState, useEffect, useCallback } from "react";
import * as memoryService from "@/services/memoryService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { isDemoMode, toError } from "@/lib/dataMode";
import { mockMemories } from "@/data/mock";
import type { Memory, MemoryInsert, MemoryUpdate } from "@/types/database";

// ─── Demo-mode Persistence ─────────────────────────────────────────────────
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

/** Demo mode: locally created + demo memories (local shadows demo). */
function demoMemories(): Memory[] {
  const localIds = new Set(locallyCreatedMemories.map((m) => m.id));
  return [...locallyCreatedMemories, ...mockMemories.filter((m) => !localIds.has(m.id))].filter(
    (m) => !isDeleted(m)
  );
}

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        await ensureHydrated();
        setMemories(demoMemories());
      } else {
        setMemories(await memoryService.getMemories());
      }
    } catch (err) {
      setError(toError(err));
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
    setIsLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        await ensureHydrated();
        setMemories(demoMemories().filter((m) => m.person_id === personId));
      } else {
        setMemories(await memoryService.getMemoriesForPerson(personId));
      }
    } catch (err) {
      setError(toError(err));
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

  /** Signed in, a failed save rejects; nothing is kept on the device. */
  const createMemory = useCallback(
    async (memory: Omit<MemoryInsert, "user_id">): Promise<Memory> => {
      setIsCreating(true);
      setError(null);
      try {
        if (!isDemoMode) return await memoryService.createMemory(memory);
        await ensureHydrated();
        const newMemory: Memory = {
          id: `m-local-${Date.now()}`,
          user_id: "demo",
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
      } catch (err) {
        setError(toError(err));
        throw err;
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
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        await ensureHydrated();
        setMemory(demoMemories().find((m) => m.id === id) ?? null);
      } else {
        setMemory(await memoryService.getMemoryById(id));
      }
    } catch (err) {
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { memory, isLoading, error, refetch: fetch };
}

// ─── useUpdateMemory ────────────────────────────────────────────────────────

export function useUpdateMemory() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateMemory = useCallback(
    async (id: string, updates: MemoryUpdate): Promise<Memory | null> => {
      setIsUpdating(true);
      try {
        if (!isDemoMode) return await memoryService.updateMemory(id, updates);
        await ensureHydrated();
        // Demo mode — apply the update locally, shadowing demo data
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

  /** Signed in, a failed delete rejects and the memory stays. */
  const deleteMemory = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      if (!isDemoMode) {
        await memoryService.deleteMemory(id);
        return;
      }
      await ensureHydrated();
      removeLocalMemory(id);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteMemory, isDeleting };
}
