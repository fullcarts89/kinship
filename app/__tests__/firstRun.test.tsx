// PERMANENT GATE (contract §10): a brand-new account never lands on an empty
// Today and an empty People. The 2.0 main layout, with the real setup gate
// and a real user store: a fresh account is sent to setup; an account that
// already has people (a reinstall, after the first sync) or notes goes to
// Today; a setup closed half-way resumes; a finished setup stays finished.
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
let mockSession: { store: UserStore; understanding: { run: () => Promise<void> } } | null = null;

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

const ME = "4f1c2d3e-0000-4000-8000-000000000001";

async function account(fill?: (s: UserStore) => Promise<void>, onSync?: (s: UserStore) => Promise<void>) {
  const db = await openSqlJsDb();
  await prepareSchema(db, ME);
  const store = new UserStore(db, ME, { newId: randomUUID });
  if (fill) await fill(store);
  mockSession = { store, understanding: { run: async () => { if (onSync) await onSync(store); } } };
  return store;
}

async function open(): Promise<"setup" | "today"> {
  mockRedirects.length = 0;
  mockTabs = 0;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Main = require("../v2/(main)/_layout").default as React.ComponentType;
  await act(async () => {
    TestRenderer.create(<Main />);
    await new Promise((r) => setTimeout(r, 30));
  });
  if (mockRedirects.includes("/v2/setup")) return "setup";
  if (mockTabs > 0) return "today";
  throw new Error("neither setup nor the app opened");
}

it("a fresh account goes to setup, never to an empty Today", async () => {
  await account();
  expect(await open()).toBe("setup");
});

it("an account whose people arrive with the first sync (a reinstall) opens the app", async () => {
  const store = await account(undefined, async (s) => {
    await repositoriesFor(s).people.add({ display_name: "Maya" });
  });
  expect(await open()).toBe("today");
  expect(await getMeta(store.db, "setup_done")).toBe("1");
});

it("an account with notes opens the app", async () => {
  await account(async (s) => {
    await repositoriesFor(s).captures.tell("Ben runs Chicago Sunday.", { aiEnabled: false });
  });
  expect(await open()).toBe("today");
});

it("a setup closed half-way resumes, even with people already picked", async () => {
  await account(async (s) => {
    await repositoriesFor(s).people.add({ display_name: "Maya" });
    await setMeta(s.db, "setup_step", "worth");
  });
  expect(await open()).toBe("setup");
});

it("a finished setup stays finished, even with no one added", async () => {
  await account(async (s) => {
    await setMeta(s.db, "setup_done", "1");
  });
  expect(await open()).toBe("today");
});
