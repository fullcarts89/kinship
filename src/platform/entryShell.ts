// Which look the sign-in screen has, decided before anyone is signed in.
//
// The shell itself is chosen per account (shell_v2), which can't be known
// until sign-in. So the entry screen follows, in order:
//   1. the build: EXPO_PUBLIC_V2_ENTRY=1 (the 2.0 dogfood build) is 2.0 from
//      the very first launch;
//   2. this device's last shell: once a 2.0 account has used this phone,
//      signing out and in again stays in 2.0's look.
// Otherwise it's 1.0's. The hint is only "v1" or "v2": no account, no content,
// and it is not cleared on sign-out (that is the point of it).
import { Platform } from "react-native";

export type EntryShell = "v1" | "v2";
const KEY = "kinship.entry_shell";

// Written as process.env.EXPO_PUBLIC_V2_ENTRY on purpose: Expo bakes a build
// setting into the app only where it appears literally like this. Read
// through a variable, it is undefined in every release build.
const BUILT_V2_ENTRY = process.env.EXPO_PUBLIC_V2_ENTRY;

export function buildEntryShell(value: string | undefined = BUILT_V2_ENTRY): EntryShell | null {
  return value === "1" ? "v2" : null;
}

async function store() {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-secure-store");
  } catch {
    return null;
  }
}

export async function readEntryShell(): Promise<EntryShell> {
  const built = buildEntryShell();
  if (built) return built;
  try {
    const ss = await store();
    const v = ss ? await ss.getItemAsync(KEY) : null;
    return v === "v2" ? "v2" : "v1";
  } catch {
    return "v1";
  }
}

export async function rememberEntryShell(shell: EntryShell): Promise<void> {
  try {
    const ss = await store();
    await ss?.setItemAsync(KEY, shell);
  } catch {
    // A hint only.
  }
}
