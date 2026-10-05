// PERMANENT GATE (contract §10): a brand-new account never lands on an empty
// Today and an empty People. The 2.0 main layout, with the real setup gate
// and a real user store.
//
// Since the founder's native pass (recovery Gate 3) the gate follows the
// account's explicit getting-started record (src/features/setup/activation.ts)
// instead of guessing from what the account holds. Guessing let an account
// with one old note skip setup and meet the consent question over an empty
// Today. So: a fresh account is sent to setup; a setup closed half-way
// resumes, on this phone or another; a finished setup stays finished; an
// account from before the record is decided once (people and memories mean
// it's in use) and recorded.
//
// If this fails, a new user is about to meet a void. Do not loosen it.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { randomUUID } from "crypto";
// The gate is tested against a real store, so this test (not a screen) builds one.
// eslint-disable-next-line no-restricted-imports
import { getMeta, prepareSchema, setMeta } from "@/store/schema";
import { repositoriesFor } from "@/store/repositories";
// eslint-disable-next-line no-restricted-imports
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const mockRedirects: string[] = [];
let mockTabs = 0;
let mockSession: { store: UserStore; understanding: { run: () => Promise<void> }; userId: null } | null = null;
let mockUser: { id: string; user_metadata: Record<string, unknown> } | null = null;

jest.mock("expo-router", () => {
  const Tabs = function Tabs() {
    mockTabs += 1;
    return null;
  };
  Tabs.Screen = function Screen() {
    return null;
  };
  return {
    Redirect: ({ href }: { href: string }) => {
      mockRedirects.push(href);
      return null;
    },
    Tabs,
  };
});
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => mockSession }));
jest.mock("@/features/tell/ConsentSheet", () => ({ ConsentSheet: () => null, CONSENT_COPY: {} }));
jest.mock("@/features/tell/TellDock", () => ({ TellDock: () => null }));
jest.mock("@/providers", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));

const ME = "4f1c2d3e-0000-4000-8000-000000000001";

async function account(
  fill?: (s: UserStore) => Promise<void>,
  onSync?: (s: UserStore) => Promise<void>,
  onAccount: Record<string, unknown> = {},
) {
  const db = await openSqlJsDb();
  await prepareSchema(db, ME);
  const store = new UserStore(db, ME, { newId: randomUUID });
  if (fill) await fill(store);
  mockSession = { store, understanding: { run: async () => { if (onSync) await onSync(store); } }, userId: null };
  // Signed in with email: no name from sign-in.
  mockUser = { id: ME, user_metadata: onAccount };
  return store;
}

const record = (steps: string[], activated = false) => JSON.stringify({
  v: 1, steps: Object.fromEntries(steps.map((s) => [s, "2026-10-05T17:00:00.000Z"])), activated_at: activated ? "2026-10-05T17:00:00.000Z" : null,
});
const remember = async (s: UserStore, personName: string) => {
  const repos = repositoriesFor(s);
  const p = await repos.people.add({ display_name: personName });
  const c = await repos.captures.tell(`${personName} runs Chicago Sunday.`, { aiEnabled: false });
  await repos.memory.remember({ kind: "event", person_id: p.id, statement: `${personName} runs Chicago Sunday` }, { captureId: c.id, quote: `${personName} runs Chicago Sunday` });
};

async function open(): Promise<"setup" | "today"> {
  mockRedirects.length = 0;
  mockTabs = 0;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Main = require("../v2/(main)/_layout").default as React.ComponentType;
  await act(async () => {
    TestRenderer.create(<Main />);
    await new Promise((r) => setTimeout(r, 60));
  });
  if (mockRedirects.includes("/v2/setup")) return "setup";
  if (mockTabs > 0) return "today";
  throw new Error("neither setup nor the app opened");
}

it("a fresh account goes to setup, never to an empty Today", async () => {
  await account();
  expect(await open()).toBe("setup");
});

it("an older account with one old note and no one in it goes to setup (the founder's second account)", async () => {
  await account(async (s) => {
    await repositoriesFor(s).captures.tell("Something from before setup existed.", { aiEnabled: false });
  });
  expect(await open()).toBe("setup");
});

it("an older account with people but nothing remembered resumes setup at the first Tell", async () => {
  const store = await account(async (s) => {
    await repositoriesFor(s).people.add({ display_name: "Tyler" });
  });
  expect(await open()).toBe("setup");
  const kept = JSON.parse(String(await getMeta(store.db, "activation")));
  expect(Object.keys(kept.steps)).toEqual(["people"]);
  expect(kept.activated_at).toBeNull();
});

it("an older account in use (people and memories arrive with the first sync, a reinstall) opens the app, and that's recorded", async () => {
  const store = await account(undefined, (s) => remember(s, "Maya"));
  expect(await open()).toBe("today");
  const kept = JSON.parse(String(await getMeta(store.db, "activation")));
  expect(kept.activated_at).toBeTruthy();
});

it("a setup closed half-way resumes, even with people already picked", async () => {
  await account(async (s) => {
    await repositoriesFor(s).people.add({ display_name: "Maya" });
    await setMeta(s.db, "activation", record(["name", "people"]));
  });
  expect(await open()).toBe("setup");
});

it("a finished setup stays finished, even with no one added", async () => {
  await account(async (s) => {
    await setMeta(s.db, "activation", record(["name", "people", "worth"]));
  });
  expect(await open()).toBe("today");
});

it("the account's own record is honoured on a new phone, before any sync", async () => {
  await account(undefined, undefined, { kinship_activation: JSON.parse(record(["name", "people", "worth"], true)) });
  expect(await open()).toBe("today");
  await account(undefined, undefined, { kinship_activation: JSON.parse(record(["name"])) });
  expect(await open()).toBe("setup");
});
