// F0-D2: with email confirmation on, a new email account gets a "check your
// email" result instead of a false "already registered" error, and signing
// in before confirming explains what to do.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AuthProvider, useAuth, EMAIL_CONFIRM_REDIRECT } from "@/providers/AuthProvider";

const mockSignUp = jest.fn();
const mockSignIn = jest.fn();
jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: (...a: unknown[]) => mockSignUp(...a),
      signInWithPassword: (...a: unknown[]) => mockSignIn(...a),
    },
  },
}));
jest.mock("@/lib/localDataReset", () => ({
  clearAllLocalUserData: jest.fn(() => Promise.resolve()),
  claimDeviceFor: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/lib/aiPreferences", () => ({ hydrateAIPreferences: jest.fn(() => Promise.resolve()) }));

let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return null;
}
beforeAll(async () => {
  await act(async () => {
    TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
  });
});
beforeEach(() => jest.clearAllMocks());

it("new account with confirmation on → check_email, link returns to the app", async () => {
  mockSignUp.mockResolvedValue({ data: { session: null, user: { id: "u", identities: [{ id: "i" }] } }, error: null });
  await expect(auth.signUpWithEmail("a@example.com", "secret1")).resolves.toBe("check_email");
  expect(mockSignUp).toHaveBeenCalledWith({
    email: "a@example.com",
    password: "secret1",
    options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT },
  });
});

it("confirmation off (session returned) → signed_in", async () => {
  mockSignUp.mockResolvedValue({ data: { session: { user: { id: "u" } }, user: { id: "u" } }, error: null });
  await expect(auth.signUpWithEmail("a@example.com", "secret1")).resolves.toBe("signed_in");
});

it("already-registered address (no identities) → explains to sign in", async () => {
  mockSignUp.mockResolvedValue({ data: { session: null, user: { id: "u", identities: [] } }, error: null });
  await expect(auth.signUpWithEmail("a@example.com", "secret1")).rejects.toThrow(/already be registered/);
});

it("signing in before confirming says to open the link", async () => {
  mockSignIn.mockResolvedValue({ error: { code: "email_not_confirmed", message: "Email not confirmed" } });
  await expect(auth.signInWithEmail("a@example.com", "secret1")).rejects.toThrow(/confirm your email/);
});
