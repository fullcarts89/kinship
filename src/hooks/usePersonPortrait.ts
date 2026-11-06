// The photo the user chose for a person (local-only; src/lib/personPhotos.ts),
// and the way to choose or remove one from their page.
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { onPersonPhotosChange, personPhoto, removePersonPhoto, setPersonPhoto } from "@/lib/personPhotos";

export const PHOTO_COPY = {
  add: "Add a photo",
  change: "Change photo",
  remove: "Remove photo",
  hint: (name: string) => `A photo of ${name}, from your library. It stays on this phone.`,
  failed: "That photo couldn't be kept. Try another.",
} as const;

export function usePersonPortrait(personId: string | null): {
  uri: string | null;
  /** Known yet? (null while reading, so nothing flashes.) */
  ready: boolean;
  pick: () => Promise<void>;
  remove: () => Promise<void>;
} {
  const [uri, setUri] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const read = useCallback(() => {
    if (!personId) return;
    void personPhoto(personId).then((u) => {
      setUri(u);
      setReady(true);
    }, () => setReady(true));
  }, [personId]);
  useEffect(() => {
    setReady(false);
    read();
    return onPersonPhotosChange(read);
  }, [read]);
  const pick = useCallback(async () => {
    if (!personId) return;
    try {
      // Loaded when asked for, so the picker never weighs on a page that doesn't need it.
      const picker = await import("expo-image-picker");
      const res = await picker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const ok = await setPersonPhoto(personId, res.assets[0].uri);
      if (!ok) Alert.alert(PHOTO_COPY.failed);
    } catch {
      Alert.alert(PHOTO_COPY.failed);
    }
  }, [personId]);
  const remove = useCallback(async () => {
    if (!personId) return;
    await removePersonPhoto(personId);
  }, [personId]);
  return { uri, ready, pick, remove };
}
