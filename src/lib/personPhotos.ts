// A photo for a person, chosen by the user, kept on this phone only (FD-30b
// Electric Garden: "the person's photo in a fluid organic mask"). Nothing is
// inferred from it, it never leaves the device, and it is never attached to a
// sensitive line. Stored next to 1.0's photos (photoStorage.ts): the picked
// file is copied into the app's document directory under the signed-in
// account, and a small JSON map (person id → file) says whose it is. Not in
// the device store's schema (WS-4 owns that); local-only by design, so it
// does not sync and is not exported.
import { Directory, File, Paths } from "expo-file-system";
import { keepPickedPhoto } from "./photoStorage";
import { supabase } from "@/lib/supabase";

const PHOTOS_DIR = "photos";
const LOCAL_OWNER = "local";
const MAP_FILE = "people.json";

type PhotoMap = Record<string, string>;

const cache = new Map<string, PhotoMap>();
const listeners = new Set<() => void>();

async function currentOwner(): Promise<string> {
  if (!supabase) return LOCAL_OWNER;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? LOCAL_OWNER;
  } catch {
    return LOCAL_OWNER;
  }
}

function ownerDir(owner: string): Directory {
  return new Directory(Paths.document, PHOTOS_DIR, owner);
}

function mapFile(owner: string): File {
  return new File(ownerDir(owner), MAP_FILE);
}

async function readMap(owner: string): Promise<PhotoMap> {
  const cached = cache.get(owner);
  if (cached) return cached;
  let map: PhotoMap = {};
  try {
    const f = mapFile(owner);
    if (f.exists) {
      const parsed = JSON.parse(await f.text()) as unknown;
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (typeof v === "string") map[k] = v;
      }
    }
  } catch {
    map = {};
  }
  cache.set(owner, map);
  return map;
}

function writeMap(owner: string, map: PhotoMap): void {
  try {
    ownerDir(owner).create({ idempotent: true, intermediates: true });
    const f = mapFile(owner);
    f.write(JSON.stringify(map));
  } catch {
    // best-effort: the next pick writes it again
  }
}

function notify(): void {
  for (const l of [...listeners]) l();
}

/** The photo the user chose for this person, or null. */
export async function personPhoto(personId: string): Promise<string | null> {
  const map = await readMap(await currentOwner());
  const uri = map[personId];
  if (!uri) return null;
  try {
    if (!new File(uri).exists) return null;
  } catch {
    return null;
  }
  return uri;
}

/** Keeps a freshly picked photo for this person (copied out of the picker's cache). False if it couldn't be kept. */
export async function setPersonPhoto(personId: string, pickedUri: string): Promise<boolean> {
  const kept = await keepPickedPhoto(pickedUri);
  if (!kept) return false;
  const owner = await currentOwner();
  const map = { ...(await readMap(owner)) };
  const old = map[personId];
  map[personId] = kept;
  cache.set(owner, map);
  writeMap(owner, map);
  if (old && old !== kept) {
    try {
      new File(old).delete();
    } catch {
      // best-effort
    }
  }
  notify();
  return true;
}

/** Removes this person's photo from the phone. */
export async function removePersonPhoto(personId: string): Promise<void> {
  const owner = await currentOwner();
  const map = { ...(await readMap(owner)) };
  const old = map[personId];
  if (!old) return;
  delete map[personId];
  cache.set(owner, map);
  writeMap(owner, map);
  try {
    new File(old).delete();
  } catch {
    // best-effort
  }
  notify();
}

/** Called when any person's photo changes. */
export function onPersonPhotosChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For tests and sign-out: forget what was read. */
export function resetPersonPhotoCache(): void {
  cache.clear();
}
