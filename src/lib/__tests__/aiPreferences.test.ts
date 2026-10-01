// P0-07: the app's AI consent is server-backed, off by default, never shows
// a choice the server didn't record, and never carries across accounts.
// (jest.mock calls below are hoisted above this import.)
import {
  AI_CONSENT_VERSION,
  hydrateAIPreferences,
  isAIEnabled,
  resetAIPreferences,
  setAIEnabled,
} from "@/lib/aiPreferences";


const mockState = {
  userId: "user-a" as string | null,
  rows: {} as Record<string, { ai_consent: boolean; ai_consent_version: number | null }>,
  rpcError: null as { message: string } | null,
  selectError: null as { message: string } | null,
  rpcCalls: [] as unknown[],
};

jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mockState.userId ? { user: { id: mockState.userId } } : null },
        }),
    },
    from: () => ({
      select: () => ({
        eq: (_col: string, userId: string) => ({
          maybeSingle: () =>
            Promise.resolve({
              data: mockState.selectError ? null : (mockState.rows[userId] ?? null),
              error: mockState.selectError,
            }),
        }),
      }),
    }),
    rpc: (_name: string, args: { p_granted: boolean; p_version: number | null }) => {
      mockState.rpcCalls.push(args);
      if (mockState.rpcError) return Promise.resolve({ error: mockState.rpcError });
      if (mockState.userId) {
        mockState.rows[mockState.userId] = {
          ai_consent: args.p_granted,
          ai_consent_version: args.p_version ?? mockState.rows[mockState.userId]?.ai_consent_version ?? null,
        };
      }
      return Promise.resolve({ error: null });
    },
  },
}));

jest.mock("@/lib/localStore", () => ({
  loadCollection: jest.fn(() => Promise.resolve([{ enabled: true }])),
  saveCollection: jest.fn(),
}));

beforeEach(() => {
  mockState.userId = "user-a";
  mockState.rows = {};
  mockState.rpcError = null;
  mockState.selectError = null;
  mockState.rpcCalls = [];
  resetAIPreferences();
});

it("is off before hydration and for a user who never consented", async () => {
  expect(isAIEnabled()).toBe(false);
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(false);
});

it("ignores any on-device value when a backend is configured", async () => {
  // localStore mock says enabled: true; the server has no consent.
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(false);
});

it("reads consent from the server", async () => {
  mockState.rows["user-a"] = { ai_consent: true, ai_consent_version: AI_CONSENT_VERSION };
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(true);
});

it("treats consent to an older version as no consent", async () => {
  mockState.rows["user-a"] = { ai_consent: true, ai_consent_version: AI_CONSENT_VERSION - 1 };
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(false);
});

it("fails closed when the server can't be read", async () => {
  mockState.rows["user-a"] = { ai_consent: true, ai_consent_version: AI_CONSENT_VERSION };
  mockState.selectError = { message: "offline" };
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(false);
});

it("records a grant on the server with the current version", async () => {
  await setAIEnabled(true);
  expect(mockState.rpcCalls).toEqual([{ p_granted: true, p_version: AI_CONSENT_VERSION }]);
  expect(isAIEnabled()).toBe(true);
});

it("keeps the previous value when the server rejects the change", async () => {
  mockState.rpcError = { message: "network" };
  await expect(setAIEnabled(true)).rejects.toThrow();
  expect(isAIEnabled()).toBe(false);
});

it("revokes on the server", async () => {
  await setAIEnabled(true);
  await setAIEnabled(false);
  expect(mockState.rpcCalls[1]).toEqual({ p_granted: false, p_version: null });
  expect(isAIEnabled()).toBe(false);
});

it("does not carry consent from one account to the next", async () => {
  mockState.rows["user-a"] = { ai_consent: true, ai_consent_version: AI_CONSENT_VERSION };
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(true);

  // Account change: AuthProvider resets, then re-hydrates for the new user.
  resetAIPreferences();
  expect(isAIEnabled()).toBe(false);
  mockState.userId = "user-b";
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(false);
});

it("is off when signed out", async () => {
  mockState.userId = null;
  await hydrateAIPreferences(true);
  expect(isAIEnabled()).toBe(false);
});
