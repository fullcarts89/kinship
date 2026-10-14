// Only the boundaries a phone provides are replaced: who is signed in (the
// harness signs in for real and hands over that user), the router's
// navigation (recorded), safe areas, and the OS opening Messages or Phone.
// Everything the app computes runs as shipped.
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => require("./state").harness.session }));
jest.mock("@/providers", () => ({ useAuth: () => ({ user: require("./state").harness.user }) }));
jest.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: require("./state").harness.user }) }));
jest.mock("@/lib/supabase", () => ({
  get supabase() { return require("./state").harness.client; },
  isSupabaseConfigured: true,
}));
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("expo-router", () => {
  const React = require("react");
  const state = () => require("./state").harness;
  const router = { push: (h: string) => state().pushes.push(String(h)), replace: (h: string) => state().pushes.push(String(h)), back: () => state().pushes.push("back"), navigate: (h: string) => state().pushes.push(String(h)) };
  const Stack = Object.assign(() => null, { Screen: () => null });
  const Tabs = Object.assign(() => null, { Screen: () => null });
  return {
    router, useRouter: () => router, Stack, Tabs,
    Redirect: ({ href }: { href: string }) => { state().pushes.push(`redirect:${href}`); return null; },
    Link: ({ children }: { children: unknown }) => children,
    useLocalSearchParams: () => state().params,
    useFocusEffect: (fn: () => void | (() => void)) => React.useEffect(fn, [fn]),
  };
});
jest.mock("@/platform/handoff", () => {
  const actual = jest.requireActual("@/platform/handoff");
  const state = () => require("./state").harness;
  return {
    ...actual,
    routesFor: async () => ({ contactId: "harness-contact", phones: ["+15550100"], emails: [] }),
    channelsFor: () => ["text", "call"],
    pickContact: async () => null,
    openChannel: async (channel: string) => { state().opens.push({ channel, at: Date.now() }); return true; },
  };
});
// Contacts are the phone's: here, a phone where Contacts access was declined, so people are added by name.
jest.mock("@/platform/deviceContacts", () => ({
  contactsAccess: async () => ({ state: "denied", canAskAgain: false }),
  requestContactsAccess: async () => ({ state: "denied", canAskAgain: false }),
  shareMoreContacts: async () => false,
  openAppSettings: () => undefined,
  readContacts: async () => [],
}));
// A native module Jest leaves empty: real UUIDs, as the phone gives.
jest.mock("expo-crypto", () => ({ ...jest.requireActual("expo-crypto"), randomUUID: () => require("crypto").randomUUID() }));

afterEach(async () => {
  await require("./app").unmount();
});
// The OS's app-state changes: every listener the app registers is kept, so a test can send the app to the
// background and back exactly as iOS does (AppState "change" events).
beforeAll(() => {
  const { AppState } = require("react-native");
  const listeners = new Set<(s: string) => void>();
  require("./state").harness.appListeners = listeners;
  AppState.addEventListener = (type: string, fn: (s: string) => void) => {
    if (type === "change") listeners.add(fn);
    return { remove: () => listeners.delete(fn) };
  };
});
