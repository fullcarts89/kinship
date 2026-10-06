// Stabilization Gate C (founder G15): right after sign-in, this phone hasn't
// heard the account's answer yet. It must not ask on that guess (the sheet
// used to flash, then vanish when the answer arrived), and an account that
// already answered is never asked again.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { randomUUID } from "crypto";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import { useConsentAsk } from "@/hooks/useV2";
import { AI_CONSENT_VERSION } from "@/lib/aiPreferences";

const A = "aaaaaaaa-0000-4000-8000-0000000000c2";
let mockSession: { store: UserStore; understanding: { offline: boolean }; userId: string } | null = null;
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => mockSession }));
jest.mock("@/hooks/useFlags", () => ({ useFlags: () => ({ ai_extraction: true, tell: true }) }));
jest.mock("@/lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));

const seen: { current: boolean | null } = { current: null };
function Probe() {
  seen.current = useConsentAsk().ask;
  return null;
}

async function settle() {
  for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
}

async function phone() {
  const server = new FakeServer();
  const db = await openSqlJsDb(`consent-${randomUUID()}`);
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { newId: randomUUID });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  mockSession = { store, understanding: { offline: false }, userId: A };
  return { server, store, engine };
}

it("signed in, the account's answer not here yet: no consent sheet; it arrives as 'allowed': still none", async () => {
  const { server, engine } = await phone();
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<Probe />);
  });
  await settle();
  expect(seen.current).toBe(false);
  server.serverWrite("user_settings", A, A, { ai_consent: true, ai_consent_version: AI_CONSENT_VERSION });
  await act(async () => {
    await engine.sync();
  });
  await settle();
  expect(seen.current).toBe(false);
  r.unmount();
});

it("the account has never answered (its settings are here, no answer): ask once", async () => {
  const { server, engine } = await phone();
  server.serverWrite("user_settings", A, A, { ai_consent: false });
  await engine.sync();
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<Probe />);
  });
  await settle();
  expect(seen.current).toBe(true);
  r.unmount();
});
