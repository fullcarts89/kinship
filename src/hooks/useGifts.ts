/**
 * Gift Hooks
 *
 * React hooks for gifts — records of gifts the user gave to or received from
 * a person. Supabase first; local mock persistence fallback, matching the
 * established locallyCreated pattern (with delete tombstones, like usePersons).
 */

import { useState, useEffect, useCallback } from "react";
import * as giftService from "@/services/giftService";
import { loadCollection, saveCollection } from "@/lib/localStore";
import type { Gift, GiftInsert } from "@/types/database";

// ─── Module-level Mock Persistence ─────────────────────────────────────────
const locallyCreatedGifts: Gift[] = [];
const locallyDeletedGiftIds = new Set<string>();

let _hydration: Promise<void> | null = null;
function ensureHydrated(): Promise<void> {
  if (!_hydration) {
    _hydration = Promise.all([
      loadCollection<Gift>("gifts"),
      loadCollection<string>("deleted-gifts"),
    ]).then(([stored, deleted]) => {
      locallyCreatedGifts.push(...stored);
      deleted.forEach((id) => locallyDeletedGiftIds.add(id));
    });
  }
  return _hydration;
}

function persistGifts(): void {
  saveCollection("gifts", locallyCreatedGifts);
}

function persistDeletedGifts(): void {
  saveCollection("deleted-gifts", [...locallyDeletedGiftIds]);
}

/** Remove all locally created gifts (delete-account flow). */
export function clearLocalGifts(): void {
  locallyCreatedGifts.length = 0;
  locallyDeletedGiftIds.clear();
  persistGifts();
  persistDeletedGifts();
}

function upsertLocal(gift: Gift): void {
  const idx = locallyCreatedGifts.findIndex((g) => g.id === gift.id);
  if (idx >= 0) locallyCreatedGifts[idx] = gift;
  else locallyCreatedGifts.unshift(gift);
  persistGifts();
}

function removeLocal(id: string): void {
  const idx = locallyCreatedGifts.findIndex((g) => g.id === id);
  if (idx >= 0) locallyCreatedGifts.splice(idx, 1);
  locallyDeletedGiftIds.add(id);
  persistGifts();
  persistDeletedGifts();
}

// ─── useGifts (all people) ──────────────────────────────────────────────────

export function useGifts() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    await ensureHydrated();
    try {
      setIsLoading(true);
      const data = await giftService.getGifts();
      const localIds = new Set(locallyCreatedGifts.map((g) => g.id));
      const merged = [
        ...locallyCreatedGifts,
        ...data.filter((g) => !localIds.has(g.id)),
      ].filter((g) => !locallyDeletedGiftIds.has(g.id));
      setGifts(merged);
    } catch {
      setGifts(
        locallyCreatedGifts.filter((g) => !locallyDeletedGiftIds.has(g.id))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { gifts, isLoading, refetch: fetch };
}

// ─── usePersonGifts ─────────────────────────────────────────────────────────

export function usePersonGifts(personId: string) {
  const { gifts, isLoading, refetch } = useGifts();
  return {
    gifts: gifts.filter((g) => g.person_id === personId),
    isLoading,
    refetch,
  };
}

// ─── useCreateGift ──────────────────────────────────────────────────────────

export function useCreateGift() {
  const [isCreating, setIsCreating] = useState(false);

  const createGift = useCallback(
    async (gift: Omit<GiftInsert, "user_id">): Promise<Gift | null> => {
      await ensureHydrated();
      setIsCreating(true);
      try {
        const created = await giftService.createGift(gift);
        upsertLocal(created);
        return created;
      } catch {
        const newGift: Gift = {
          id: `gift-local-${Date.now()}`,
          user_id: "u1",
          person_id: gift.person_id,
          title: gift.title,
          direction: gift.direction,
          occasion: gift.occasion ?? null,
          note: gift.note ?? null,
          occurred_at: gift.occurred_at ?? new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        upsertLocal(newGift);
        return newGift;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createGift, isCreating };
}

// ─── useDeleteGift ──────────────────────────────────────────────────────────

export function useDeleteGift() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteGift = useCallback(async (id: string): Promise<void> => {
    await ensureHydrated();
    setIsDeleting(true);
    try {
      await giftService.deleteGift(id);
    } catch {
      // Tombstone locally so it stays gone even if the remote call failed.
    } finally {
      removeLocal(id);
      setIsDeleting(false);
    }
  }, []);

  return { deleteGift, isDeleting };
}
