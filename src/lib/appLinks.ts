/**
 * App Links
 *
 * Single source of truth for outbound links in share/invite copy.
 *
 * The store link is env-configured because the app isn't published yet —
 * sharing a dead URL ("kinship.app") burns the recipient's first
 * impression. Until EXPO_PUBLIC_APP_STORE_URL is set (TestFlight or App
 * Store), invite copy simply omits the link.
 */

const STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL ?? "";

/** The configured store/TestFlight URL, or null when not yet published. */
export function getStoreUrl(): string | null {
  return STORE_URL.startsWith("http") ? STORE_URL : null;
}

/** Personalised invite message for the "Plant a Seed" share action. */
export function buildInviteMessage(firstName: string): string {
  const base =
    `Hey ${firstName}! I've been thinking about you and added you to my Kinship garden 🌱\n\n` +
    `Kinship helps me stay close with the people who matter most — by capturing moments, noticing what matters, and tending to the relationships I care about.`;
  const url = getStoreUrl();
  return url ? `${base}\n\nDownload it here: ${url}` : base;
}

/** Footer line appended to shared memories. */
export function buildShareFooter(): string {
  const url = getStoreUrl();
  return url ? `Shared from Kinship 🌱 ${url}` : "Shared from Kinship 🌱";
}
