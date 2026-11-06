// The photos the user chose for several people at once (local only; src/lib/personPhotos.ts), for a
// deck or a list: read lazily, kept in step with any change on this phone.
import { useEffect, useState } from "react";
import { onPersonPhotosChange, personPhoto } from "@/lib/personPhotos";

export function usePhotos(personIds: string[]): Record<string, string | null> {
  const key = [...new Set(personIds)].sort().join(",");
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  useEffect(() => {
    let live = true;
    const ids = key ? key.split(",") : [];
    const read = () => {
      void Promise.all(ids.map(async (id) => [id, await personPhoto(id).catch(() => null)] as const)).then((pairs) => {
        if (live) setPhotos(Object.fromEntries(pairs));
      });
    };
    read();
    const off = onPersonPhotosChange(read);
    return () => {
      live = false;
      off();
    };
  }, [key]);
  return photos;
}
