// The app as the founder uses it, minus the phone: the real screens (Today,
// the Tell dock and its review sheet, a person's page, What Kinship knows,
// the consent sheet), the real session classes (UserStore, SyncEngine with
// the real SupabaseRemote, Understanding with the real gateway transport,
// Reasons, ReasonLocal), driven only through what's on screen.
//
// Stand-in, stated wherever this is evidence: the device's SQLCipher store is
// sql.js here (same schema and SQL, a different engine).
import React, { useState } from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { Text, TextInput } from "react-native";
import { randomUUID } from "crypto";
import TodayScreen from "../../app/v2/(main)/index";
import PeopleScreen from "../../app/v2/(main)/people";
import PersonScreen from "../../app/v2/person/[id]/index";
import KnowsScreen from "../../app/v2/person/[id]/knows";
import Setup from "../../app/v2/setup";
import { SETUP_COPY } from "@/features/setup/SetupViews";
import { CONSENT_COPY } from "@/features/tell/ConsentSheet";
import { ConsentSheet } from "@/features/tell/ConsentSheet";
import { TellDock } from "@/features/tell/TellDock";
import { TellFlowProvider } from "@/features/tell/TellFlow";
import { Gateway, supabaseGatewayTransport } from "@/store/gateway";
import { ReasonLocal } from "@/store/reasonLocal";
import { Reasons, supabaseReasonsTransport } from "@/store/reasons";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SupabaseRemote } from "@/store/supabaseRemote";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import { harness } from "./state";
import { localAccount } from "./localStack";

export type Where = { screen: "setup" } | { screen: "today" } | { screen: "people" } | { screen: "person"; id: string } | { screen: "knows"; id: string };

let go: (w: Where) => void = () => undefined;
let start: Where = { screen: "setup" };

function Root() {
  const [where, setWhere] = useState<Where>(start);
  go = setWhere;
  harness.params = where.screen === "person" || where.screen === "knows" ? { id: where.id } : {};
  // As app/v2/_layout.tsx and app/v2/(main)/_layout.tsx compose them.
  return (
    <TellFlowProvider>
      {where.screen === "setup" ? <Setup /> : (
        <>
          <ConsentSheet />
          {where.screen === "today" ? <TodayScreen /> : where.screen === "people" ? <PeopleScreen /> : where.screen === "person" ? <PersonScreen key={`p:${where.id}`} /> : <KnowsScreen key={`k:${where.id}`} />}
          <TellDock current="today" onGo={() => undefined} />
        </>
      )}
    </TellFlowProvider>
  );
}

/**
 * A brand-new signed-in local account with the app's session over it (setup
 * not yet done). `device`: a phone's slower store and network round trip.
 */
export async function signedIn(device: { statementMs?: number; networkMs?: number } = {}) {
  const { client, userId, email } = await localAccount({ networkMs: device.networkMs });
  const db = await openSqlJsDb(`bb-${randomUUID()}`, { statementMs: device.statementMs });
  await prepareSchema(db, userId);
  const store = new UserStore(db, userId, { newId: randomUUID });
  const engine = new SyncEngine(store, new SupabaseRemote(client));
  const gateway = new Gateway(supabaseGatewayTransport(client));
  harness.client = client;
  harness.user = { id: userId, email, user_metadata: {} };
  harness.session = {
    userId, store,
    understanding: new Understanding(store, () => engine.sync(), gateway),
    reasons: new Reasons(supabaseReasonsTransport(client), () => engine.sync()),
    reasonLocal: new ReasonLocal(store),
  };
  harness.pushes = [];
  harness.opens = [];
  start = { screen: "setup" };
  return { client, userId, store, engine, repos: repositoriesFor(store) };
}

/**
 * Setup as a new user does it: their name, Allow understanding, each person added by name, then the first
 * Tell (skipped unless `firstTell` is given: then typed and kept, as a new user does), then Today.
 */
export async function setUp(r: TestRenderer.ReactTestRenderer, people: string[], firstTell?: string) {
  await until(r, () => canTap(r, SETUP_COPY.continue) || canTap(r, SETUP_COPY.notNow), "setup's first step");
  await type(r, new RegExp(`^${SETUP_COPY.nameHint}$`, "u"), "Thor");
  await tap(r, SETUP_COPY.continue);
  await until(r, () => canTap(r, CONSENT_COPY.allow), "the consent step");
  await tap(r, CONSENT_COPY.allow);
  await until(r, () => canTap(r, SETUP_COPY.addByName), "the people step");
  for (const name of people) {
    await tap(r, SETUP_COPY.addByName);
    await type(r, /^Their name$/u, name);
    await tap(r, "Done");
  }
  await tap(r, SETUP_COPY.continueN(people.length));
  await until(r, () => canTap(r, SETUP_COPY.skip), "the last setup step");
  if (firstTell) {
    await type(r, /^Tell Kinship one thing about someone\.$/u, firstTell);
    await tap(r, SETUP_COPY.keep);
  } else await tap(r, SETUP_COPY.skip);
  await until(r, () => harness.pushes.includes("/v2"), "setup to finish");
  start = { screen: "today" };
  await show(r, { screen: "today" });
}

let mounted: TestRenderer.ReactTestRenderer | null = null;

/** Unmounts the previous test's app, so nothing of it keeps listening (call in afterEach). */
export async function unmount() {
  if (!mounted) return;
  const m = mounted;
  mounted = null;
  await act(async () => m.unmount());
}

export async function mount(): Promise<TestRenderer.ReactTestRenderer> {
  await unmount();
  let r: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    r = TestRenderer.create(<Root />);
  });
  await settle();
  mounted = r!;
  return r!;
}

export async function show(r: TestRenderer.ReactTestRenderer, where: Where) {
  await act(async () => go(where));
  await settle();
  void r;
}

export async function settle(ms = 60) {
  for (let i = 0; i < 4; i++) await act(async () => { await new Promise((res) => setTimeout(res, ms / 4)); });
}

/** Every piece of text on screen, in order. */
export function texts(r: TestRenderer.ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat(Infinity).filter((c) => typeof c === "string" || typeof c === "number").join("")).filter(Boolean);
}

function pressable(r: TestRenderer.ReactTestRenderer, label: string): ReactTestInstance | null {
  const byLabel = r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function");
  if (byLabel.length) return byLabel[0];
  const byText = r.root.findAll((n) => typeof n.props.onPress === "function" &&
    n.findAll((c) => c.type === Text && [c.props.children].flat(Infinity).join("") === label).length > 0);
  return byText.length ? byText[byText.length - 1] : null;
}

/** Taps what's on screen by its label or its words; fails if it isn't there. */
export async function tap(r: TestRenderer.ReactTestRenderer, label: string) {
  const target = pressable(r, label);
  if (!target) throw new Error(`nothing to tap called "${label}". On screen: ${JSON.stringify(texts(r))}`);
  await act(async () => { await target.props.onPress(); });
  await settle();
}

/** Taps the last control with this label (the topmost sheet's, when a screen behind it has one too). */
export async function tapLast(r: TestRenderer.ReactTestRenderer, label: string) {
  const all = r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function");
  if (!all.length) throw new Error(`nothing to tap called "${label}". On screen: ${JSON.stringify(texts(r))}`);
  const target = all[all.length - 1];
  await act(async () => { await target.props.onPress(); });
  await settle();
}

export function canTap(r: TestRenderer.ReactTestRenderer, label: string): boolean {
  return !!pressable(r, label);
}

/** Types into a field by its label. */
export async function type(r: TestRenderer.ReactTestRenderer, label: RegExp, text: string) {
  const field = r.root.findAll((n) => n.type === TextInput && label.test(String(n.props.accessibilityLabel ?? n.props.placeholder ?? "")))[0];
  if (!field) throw new Error(`no field ${label}. Fields: ${JSON.stringify(r.root.findAllByType(TextInput).map((f) => f.props.accessibilityLabel ?? f.props.placeholder))}`);
  await act(async () => { field.props.onChangeText?.(text); });
  await settle();
}

/** Tells Kinship something through the Tell dock, as typed and sent. */
export async function tell(r: TestRenderer.ReactTestRenderer, text: string) {
  await type(r, /^Tell Kinship/u, text);
  await tap(r, "Send to Kinship");
}

/** Waits until the screen satisfies `ok` (polling the real app; nothing is injected). */
export async function until(r: TestRenderer.ReactTestRenderer, ok: (shown: string[]) => boolean, what: string, timeoutMs = 60000): Promise<number> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (ok(texts(r))) return Date.now() - started;
    await settle(100);
  }
  throw new Error(`timed out waiting for ${what}. On screen: ${JSON.stringify(texts(r))}`);
}
