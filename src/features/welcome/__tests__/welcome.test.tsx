// The 2.0 welcome: the promise first, Sign in with Apple as the one primary
// action, quiet secondary options, legal last and quiet; nothing about AI or
// features; failure and busy states said in words; the 2.0 look chosen by the
// build or by this phone's last shell, never guessed per account.
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { buildEntryShell, readEntryShell } from "@/platform/entryShell";
import { EmailSheet, WELCOME_COPY, WelcomeView, type WelcomeViewProps } from "@/features/welcome/WelcomeView";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const base: WelcomeViewProps = {
  methods: { apple: true, google: true, email: true }, busy: false, error: null,
  onApple: jest.fn(), onGoogle: jest.fn(), onEmail: jest.fn(), onTerms: noop, onPrivacy: noop,
};

function render(el: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree;
}
const strings = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
const buttons = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll((n: ReactTestInstance) => n.props.accessibilityRole === "button" && typeof n.props.onPress === "function"
    && typeof n.props.accessibilityLabel === "string").map((n) => n.props.accessibilityLabel as string);

it("says the promise, then offers Apple first, then the quiet options, then the legal line", () => {
  const tree = render(<WelcomeView {...base} />);
  const t = strings(tree).join(" | ");
  const at = (s: string) => t.indexOf(s);
  expect(at(WELCOME_COPY.promise)).toBeGreaterThan(-1);
  expect(at(WELCOME_COPY.promise)).toBeLessThan(at(WELCOME_COPY.apple));
  expect(at(WELCOME_COPY.apple)).toBeLessThan(at(WELCOME_COPY.google));
  expect(at(WELCOME_COPY.google)).toBeLessThan(at("Privacy Policy"));
  expect([...new Set(buttons(tree))][0]).toBe(WELCOME_COPY.apple);
});

it("doesn't explain AI, list features, or run long", () => {
  const all = strings(render(<WelcomeView {...base} />));
  for (const s of all) expect(s).not.toMatch(/\b(AI|artificial|Claude|Anthropic|smart|intelligen|feature|garden)/i);
  const words = [WELCOME_COPY.promise, WELCOME_COPY.sub].join(" ").split(/\s+/).length;
  expect(words).toBeLessThanOrEqual(20);
});

it("signing in is said in words; a failure is said plainly", () => {
  expect(strings(render(<WelcomeView {...base} busy />))).toContain(WELCOME_COPY.signingIn);
  expect(strings(render(<WelcomeView {...base} error={WELCOME_COPY.failed} />))).toContain(WELCOME_COPY.failed);
});

it("without Apple (not iOS), the other ways remain", () => {
  const tree = render(<WelcomeView {...base} methods={{ apple: false, google: true, email: true }} />);
  expect(strings(tree)).not.toContain(WELCOME_COPY.apple);
  expect(strings(tree)).toEqual(expect.arrayContaining([WELCOME_COPY.google, WELCOME_COPY.email]));
});

it("email is a sheet with its own sign-in, account and reset paths", () => {
  const tree = render(<EmailSheet visible mode="sign_in" email="" password="" busy={false} message={null}
    onEmail={noop} onPassword={noop} onMode={noop} onSubmit={noop} onDismiss={noop} />);
  expect(strings(tree)).toEqual(expect.arrayContaining(["Sign in with email", "Sign in", "Create an account", "Forgot password?"]));
});

it("the 2.0 look comes from the build or from this phone, never from a guess", async () => {
  expect(buildEntryShell({ EXPO_PUBLIC_V2_ENTRY: "1" })).toBe("v2");
  expect(buildEntryShell({})).toBeNull();
  expect(await readEntryShell()).toBe("v1"); // nothing remembered here: 1.0
});
