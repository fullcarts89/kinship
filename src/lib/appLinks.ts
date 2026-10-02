/**
 * App Links
 *
 * Single source of truth for outbound links in shared memory copy.
 *
 * The store link is env-configured because the app isn't published yet —
 * sharing a dead URL ("kinship.app") burns the recipient's first
 * impression. Until EXPO_PUBLIC_APP_STORE_URL is set (TestFlight or App
 * Store), shared copy simply omits the link.
 */

const STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL ?? "";

/** The configured store/TestFlight URL, or null when not yet published. */
export function getStoreUrl(): string | null {
  return STORE_URL.startsWith("http") ? STORE_URL : null;
}

/** Footer line appended to shared memories. */
export function buildShareFooter(): string {
  const url = getStoreUrl();
  return url ? `Shared from Kinship 🌱 ${url}` : "Shared from Kinship 🌱";
}
