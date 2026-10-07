// The launch route (app/index.tsx) with the real flag code: an account the
// server has switched to 2.0 opens 2.0 at its next launch even when the device
// still holds an old "off" copy; with the server unreachable it uses what the
// device last heard; signed out, it goes to sign-in. In the 2.0 build, a
// signed-in account never falls back to 1.0 because the answer is unknown
// (founder I8); only the server's explicit "off" opens 1.0.
import React from "react";
import type TestRenderer from "react-test-renderer";
import type { act } from "react-test-renderer";

const mockRedirects: string[] = [];
const mockKeychain = new Map<string, string>();
let mockServerFlags: { key: string; enabled: boolean }[] | Error | "no answer" = [];
let mockBuild: "v2" | null = null;
let mockAuth = { isAuthenticated: true, isLoading: false, user: { id: "21bb55a0-39fb-491c-adfd-52c637d16de1" } };

jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirects.push(href);
    return null;
  },
}));
jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
  getItemAsync: async (k: string) => mockKeychain.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockKeychain.set(k, v),
  deleteItemAsync: async (k: string) => void mockKeychain.delete(k),
}));
jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: () => mockServerFlags === "no answer"
      ? new Promise(() => undefined)
      : Promise.resolve(mockServerFlags instanceof Error ? { data: null, error: { message: "offline" } } : { data: mockServerFlags, error: null }),
  },
}));
jest.mock("@/providers", () => ({ useAuth: () => mockAuth }));
jest.mock("@/lib/onboardingStatus", () => ({ hasCompletedOnboarding: async () => false }));
jest.mock("@/platform/entryShell", () => ({
  buildEntryShell: () => mockBuild,
  readEntryShell: async () => mockBuild ?? "v1",
  rememberEntryShell: async () => undefined,
}));
jest.mock("@/ui/appearance", () => ({ followSystemAppearance: () => undefined }));

const ME = "21bb55a0-39fb-491c-adfd-52c637d16de1";
const on = ["shell_v2", "tell", "ai_extraction", "memory_v2"].map((key) => ({ key, enabled: true }));

async function launch(waitMs = 50): Promise<string | undefined> {
  jest.resetModules(); // a fresh JS launch: module-level flag state starts empty
  mockRedirects.length = 0;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Index = require("../index").default as React.ComponentType;
  // the fresh module registry has its own React; render with that one
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require("react") as typeof React;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TR = require("react-test-renderer") as typeof TestRenderer & { act: typeof act };
  if (waitMs <= 50) {
    await TR.act(async () => {
      TR.create(R.createElement(Index));
      await new Promise((r) => setTimeout(r, waitMs));
    });
  } else {
    // A server that never answers: wait out the launch limit on a fake clock.
    jest.useFakeTimers();
    try {
      await TR.act(async () => {
        TR.create(R.createElement(Index));
      });
      await TR.act(async () => {
        await jest.advanceTimersByTimeAsync(waitMs);
      });
    } finally {
      jest.useRealTimers();
    }
  }
  return mockRedirects[mockRedirects.length - 1];
}

/** The same launch's flag module (after launch(), the registry it used). */
function flagsModule(): typeof import("@/hooks/useFlags") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/hooks/useFlags") as typeof import("@/hooks/useFlags");
}

beforeEach(() => {
  mockKeychain.clear();
  mockBuild = null;
  mockServerFlags = [];
  mockAuth = { isAuthenticated: true, isLoading: false, user: { id: ME } };
});

it("switched on for this account: the very next launch opens 2.0, despite an old 'off' on the device", async () => {
  mockKeychain.set("kinship.flags", JSON.stringify({ user_id: ME, flags: { shell_v2: false } }));
  mockServerFlags = on;
  expect(await launch()).toBe("/v2");
});

it("2.0 skips the 1.0 onboarding (never completed on this phone)", async () => {
  mockServerFlags = on;
  expect(await launch()).toBe("/v2");
});

it("server unreachable: launches from what the device last heard", async () => {
  mockKeychain.set("kinship.flags", JSON.stringify({ user_id: ME, flags: { shell_v2: true } }));
  mockServerFlags = new Error("offline");
  expect(await launch()).toBe("/v2");
});

it("not switched on: 1.0, as before", async () => {
  mockServerFlags = [{ key: "shell_v2", enabled: false }];
  expect(await launch()).toBe("/(auth)/onboarding");
});

it("signed out: sign-in", async () => {
  mockAuth = { isAuthenticated: false, isLoading: false, user: null as unknown as { id: string } };
  expect(await launch()).toBe("/(auth)/login");
});

describe("the 2.0 build (EXPO_PUBLIC_V2_ENTRY=1): never back to 1.0 by accident (founder I8)", () => {
  beforeEach(() => {
    mockBuild = "v2";
  });

  it("the flag check fails and this phone kept nothing (e.g. just signed back in): 2.0", async () => {
    mockServerFlags = new Error("offline");
    expect(await launch()).toBe("/v2");
  });

  it("the server doesn't answer within the launch limit, nothing kept: 2.0", async () => {
    mockServerFlags = "no answer";
    expect(await launch(4_500)).toBe("/v2");
  });

  it("a cold start with only this phone's copy: 2.0", async () => {
    mockKeychain.set("kinship.flags", JSON.stringify({ user_id: ME, flags: { shell_v2: true } }));
    mockServerFlags = new Error("offline");
    expect(await launch()).toBe("/v2");
  });

  it("an account the server explicitly keeps on 1.0 still opens 1.0 (rollout stays per account)", async () => {
    mockServerFlags = [{ key: "shell_v2", enabled: false }];
    expect(await launch()).toBe("/(auth)/onboarding");
  });

  it("a 1.0 notification tapped in a 2.0 session opens no 1.0 screen", async () => {
    mockServerFlags = on;
    expect(await launch()).toBe("/v2");
    expect(flagsModule().legacyRoutesAllowed()).toBe(false);
  });

  it("while the launch is still deciding, a 1.0 notification opens no 1.0 screen", async () => {
    jest.resetModules();
    expect(flagsModule().legacyRoutesAllowed()).toBe(false);
  });
});

describe("the 1.0 build: unchanged", () => {
  it("a 1.0 session still follows a 1.0 notification", async () => {
    mockServerFlags = [{ key: "shell_v2", enabled: false }];
    expect(await launch()).toBe("/(auth)/onboarding");
    expect(flagsModule().legacyRoutesAllowed()).toBe(true);
  });

  it("an unknown answer with nothing kept is still 1.0 outside the 2.0 build", async () => {
    mockServerFlags = new Error("offline");
    expect(await launch()).toBe("/(auth)/onboarding");
  });
});
