// DEV-ONLY: on-device verification of the 2.0 encrypted store (Checkpoint B
// closeout). Used by app/settings/store-check.tsx, which only exists in
// development builds. Every check reports what it observed; none of them
// weakens encryption to "make it work".

import { supabase } from "@/lib/supabase";
import { storeFileName } from "@/store/deviceStore";
import { expoPlatform } from "@/store/expoPlatform";
import { repositoriesFor } from "@/store/repositories";
import { storeForUser, closeActiveStore } from "@/store/session";
import { SupabaseRemote } from "@/store/supabaseRemote";
import { SyncEngine, type SyncReport } from "@/store/syncEngine";
import { PULL_ORDER } from "@/store/tables";

/* eslint-disable @typescript-eslint/no-require-imports */
const sqlite = () => require("expo-sqlite") as typeof import("expo-sqlite");
const fs = () => require("expo-file-system") as typeof import("expo-file-system");
/* eslint-enable @typescript-eslint/no-require-imports */

export const CHECK_PREFIX = "Kinship store check";

export interface StoreStatus {
  userId: string;
  file: string;
  cipherVersion: string | null;
  rows: Record<string, number>;
  pendingWrites: number;
  checkCaptures: string[];
  filesOnDevice: string[];
  keysForFiles: Record<string, boolean>;
  header: string;
}

export async function status(userId: string): Promise<StoreStatus> {
  const store = await storeForUser(userId);
  const cipher = await store.db.get<{ cipher_version: string }>("PRAGMA cipher_version;");
  const rows: Record<string, number> = {};
  for (const t of PULL_ORDER) rows[t] = (await store.list(t)).length;
  const platform = expoPlatform();
  const files = (await platform.listFiles()).filter((f) => f.startsWith("kinship-") && f.endsWith(".db"));
  const keys: Record<string, boolean> = {};
  for (const f of files) {
    keys[f] = (await platform.getKey(`kinship.dbkey.${f.slice("kinship-".length, -".db".length)}`)) !== null;
  }
  const captures = await repositoriesFor(store).captures.list();
  return {
    userId,
    file: storeFileName(userId),
    cipherVersion: cipher?.cipher_version ?? null,
    rows,
    pendingWrites: (await store.pendingOps()).length,
    checkCaptures: captures.map((c) => String(c.raw_text)).filter((t) => t.startsWith(CHECK_PREFIX)),
    filesOnDevice: files,
    keysForFiles: keys,
    header: await fileHeader(storeFileName(userId)),
  };
}

/** First 16 bytes of the file. A plaintext SQLite file starts "SQLite format 3". */
async function fileHeader(file: string): Promise<string> {
  const f = new (fs().File)(`${sqlite().defaultDatabaseDirectory}/${file}`);
  if (!f.exists) return "(no file yet)";
  const bytes = (await f.bytes()).slice(0, 16);
  const ascii = Array.from(bytes, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
  return ascii;
}

/** Writes one capture locally (offline-capable). Returns its text. */
export async function writeCheckCapture(userId: string): Promise<string> {
  const store = await storeForUser(userId);
  const text = `${CHECK_PREFIX} · ${new Date().toISOString()}`;
  await repositoriesFor(store).captures.tell(text, { aiEnabled: false });
  return text;
}

export interface ProbeResult {
  passed: boolean;
  detail: string;
}

/** The file must NOT open as ordinary SQLite (no key). */
export async function plaintextOpenRefused(userId: string): Promise<ProbeResult> {
  return probeOpen(userId, null);
}

/** The file must NOT open with a different key. */
export async function wrongKeyRefused(userId: string): Promise<ProbeResult> {
  return probeOpen(userId, expoPlatform().randomKeyHex());
}

async function probeOpen(userId: string, keyHex: string | null): Promise<ProbeResult> {
  await storeForUser(userId); // make sure the file exists
  const db = await sqlite().openDatabaseAsync(storeFileName(userId), { useNewConnection: true });
  try {
    if (keyHex) await db.execAsync(`PRAGMA key = "x'${keyHex}'";`);
    const r = await db.getFirstAsync<{ n: number }>("SELECT count(*) AS n FROM sqlite_master;");
    return { passed: false, detail: `opened and read ${r?.n ?? 0} schema rows — NOT protected` };
  } catch (err) {
    return { passed: true, detail: `refused: ${err instanceof Error ? err.message : String(err)}` };
  } finally {
    await db.closeAsync().catch(() => undefined);
  }
}

/** Deletes this user's key, then reopens: the store must come back empty (rebuilt), not read. */
export async function simulateLostKey(userId: string): Promise<ProbeResult> {
  await closeActiveStore();
  await expoPlatform().deleteKey(`kinship.dbkey.${userId}`);
  const store = await storeForUser(userId);
  const n = (await store.list("captures")).length + (await store.pendingOps()).length;
  return n === 0
    ? { passed: true, detail: "the old file was discarded and a new empty store created; nothing was read" }
    : { passed: false, detail: `${n} rows were still readable after the key was removed` };
}

// One engine per open store, so a double tap shares the run in progress
// instead of starting two (as the real app will).
let engine: { store: unknown; engine: SyncEngine } | null = null;

export async function syncNow(userId: string): Promise<SyncReport> {
  if (!supabase) throw new Error("Supabase is not configured");
  const store = await storeForUser(userId);
  if (engine?.store !== store) engine = { store, engine: new SyncEngine(store, new SupabaseRemote(supabase)) };
  return engine.engine.sync();
}

/** How many copies of a check capture the server holds (must be exactly 1). */
export async function serverCopies(text: string): Promise<number> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { count, error } = await supabase.from("captures").select("id", { count: "exact", head: true }).eq("raw_text", text);
  if (error) throw error;
  return count ?? 0;
}

/** Tombstones this user's check captures (local + server on next sync). */
export async function removeCheckCaptures(userId: string): Promise<number> {
  const store = await storeForUser(userId);
  const repos = repositoriesFor(store);
  const mine = (await repos.captures.list()).filter((c) => String(c.raw_text).startsWith(CHECK_PREFIX));
  for (const c of mine) await repos.captures.remove(c.id);
  return mine.length;
}

/** Whether a key exists on this device for any user id (account-switch smoke test). */
export async function keyExistsFor(userId: string): Promise<boolean> {
  return (await expoPlatform().getKey(`kinship.dbkey.${userId.trim()}`)) !== null;
}
