// P0-03: signing out, being signed out elsewhere, or switching accounts
// wipes this device before the next person can see anything.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { claimDeviceFor, clearAllLocalUserData } from "@/lib/localDataReset";

type Listener = (event: string, session: unknown) => void;
const mockAuth = {
  listener: null as Listener | null,
  restored: null as unknown,
  signOutResult: { error: null as { message: string } | null },
  calls: [] as string[],
  claimGate: Promise.resolve() as Promise<void>,
};
const session = (id: string) => ({ user: { id } });

jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: mockAuth.restored } }),
      onAuthStateChange: (fn: Listener) => {
        mockAuth.listener = fn;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: () => {
        mockAuth.calls.push("server signOut");
        return Promise.resolve(mockAuth.signOutResult);
      },
    },
  },
}));
jest.mock("@/lib/localDataReset", () => ({
  clearAllLocalUserData: jest.fn(() => {
    mockAuth.calls.push("wipe");
    return Promise.resolve();
  }),
  claimDeviceFor: jest.fn((id: string) => {
    mockAuth.calls.push(`claim ${id}`);
    return mockAuth.claimGate;
  }),
}));
jest.mock("@/lib/aiPreferences", () => ({ hydrateAIPreferences: jest.fn(() => Promise.resolve()) }));

let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return null;
}

async function mount(restoredUser: string | null) {
  mockAuth.restored = restoredUser ? session(restoredUser) : null;
  await act(async () => {
    TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
  });
}

async function emit(event: string, s: unknown) {
  await act(async () => {
    mockAuth.listener!(event, s);
  });
}

beforeEach(() => {
  mockAuth.calls = [];
  mockAuth.signOutResult = { error: null };
  mockAuth.claimGate = Promise.resolve();
  (clearAllLocalUserData as jest.Mock).mockClear();
  (claimDeviceFor as jest.Mock).mockClear();
});

it("signOut wipes the device before ending the session", async () => {
  await mount("user-a");
  mockAuth.calls = [];
  await act(() => auth.signOut());
  expect(mockAuth.calls.slice(0, 2)).toEqual(["wipe", "server signOut"]);
});

it("signOut wipes the device even when the server sign-out fails", async () => {
  await mount("user-a");
  mockAuth.signOutResult = { error: { message: "offline" } };
  await act(async () => {
    await expect(auth.signOut()).rejects.toThrow("offline");
  });
  expect(clearAllLocalUserData).toHaveBeenCalled();
});

it("a sign-out from elsewhere (revoked or expired session) wipes the device", async () => {
  await mount("user-a");
  await emit("SIGNED_OUT", null);
  expect(clearAllLocalUserData).toHaveBeenCalledTimes(1);
});

it("a restored session claims the device for that user before showing it", async () => {
  let release!: () => void;
  mockAuth.claimGate = new Promise((r) => (release = r));
  await mount("user-a");
  expect(claimDeviceFor).toHaveBeenCalledWith("user-a");
  expect(auth.isAuthenticated).toBe(false); // still claiming
  await act(async () => release());
  expect(auth.isAuthenticated).toBe(true);
});

it("a sign-in claims the device for the new account before showing it", async () => {
  await mount(null);
  let release!: () => void;
  mockAuth.claimGate = new Promise((r) => (release = r));
  await emit("SIGNED_IN", session("user-b"));
  expect(claimDeviceFor).toHaveBeenCalledWith("user-b");
  expect(auth.user).toBeNull();
  await act(async () => release());
  expect(auth.user?.id).toBe("user-b");
});
