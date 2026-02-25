/**
 * Person Photo Hook
 *
 * Stores friend photos in a module-level Map for session persistence.
 * Follows the same pattern as locallyCreatedPeople in usePersons.ts.
 *
 * Photos persist across component remounts and tab switches within
 * the same app session. They do NOT persist across app restarts —
 * that will require AsyncStorage or backend storage in a future phase.
 */

import { useState, useCallback } from "react";

// ─── Session-level photo storage ────────────────────────────────────────────
// Shared across all hook instances so every screen sees the same photo.

const personPhotos = new Map<string, string>();

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePersonPhoto(personId: string) {
  const [photoUri, setPhotoUri] = useState<string | null>(
    personPhotos.get(personId) ?? null
  );

  const setPhoto = useCallback(
    (uri: string) => {
      personPhotos.set(personId, uri);
      setPhotoUri(uri);
    },
    [personId]
  );

  const removePhoto = useCallback(() => {
    personPhotos.delete(personId);
    setPhotoUri(null);
  }, [personId]);

  return { photoUri, setPhoto, removePhoto };
}
