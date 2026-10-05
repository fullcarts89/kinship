// The founder build's email bounce: the sign-in call succeeded, Welcome left
// at once, the app's entry still had no session (AuthProvider applies it a
// moment later, after clearing another account's data) and sent the user back
// to Welcome, signed in, with no error. Welcome now leaves only when the app
// has the session, and says so if it never arrives.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { WelcomeScreen, SIGN_IN_SETTLE_MS, emailError } from "@/features/welcome/WelcomeScreen";
import { WELCOME_COPY } from "@/features/welcome/WelcomeView";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn() } }));

const mockAuth = {
  isAuthenticated: false,
  signInWithApple: jest.fn(async () => undefined),
  signInWithGoogle: jest.fn(async () => undefined),
  signInWithEmail: jest.fn(async () => undefined),
  signUpWithEmail: jest.fn(async () => "signed_in" as const),
  resetPassword: jest.fn(async () => undefined),
};
jest.mock("@/providers", () => ({ useAuth: () => mockAuth }));

function render() {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<WelcomeScreen />);
  });
  return tree;
}
const strings = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
const press = async (tree: TestRenderer.ReactTestRenderer, label: string) => {
  const b = tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")[0];
  await act(async () => {
    b.props.onPress();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
  mockAuth.isAuthenticated = false;
});
afterEach(() => jest.useRealTimers());

it("doesn't leave Welcome until the app has the session, then leaves once", async () => {
  const tree = render();
  await press(tree, "Use email");
  const email = tree.root.findAll((n) => n.props.accessibilityLabel === "Email" && typeof n.props.onChangeText === "function")[0];
  const password = tree.root.findAll((n) => n.props.accessibilityLabel === "Password" && typeof n.props.onChangeText === "function")[0];
  act(() => {
    email.props.onChangeText("dana@example.com");
    password.props.onChangeText("secret12");
  });
  await press(tree, "Sign in");
  expect(mockAuth.signInWithEmail).toHaveBeenCalled();
  // The call returned, but the session hasn't reached the app yet: stay, busy.
  expect(mockReplace).not.toHaveBeenCalled();
  expect(strings(tree)).toContain(WELCOME_COPY.signingIn);

  mockAuth.isAuthenticated = true;
  act(() => tree.update(<WelcomeScreen />));
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith("/");
  act(() => tree.update(<WelcomeScreen />));
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

it("a sign-in that never reaches the app says so instead of failing silently", async () => {
  const tree = render();
  await press(tree, "Use email");
  const field = (label: string) =>
    tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onChangeText === "function")[0];
  act(() => {
    field("Email").props.onChangeText("dana@example.com");
    field("Password").props.onChangeText("secret12");
  });
  await press(tree, "Sign in");
  act(() => {
    jest.advanceTimersByTime(SIGN_IN_SETTLE_MS + 10);
  });
  expect(mockReplace).not.toHaveBeenCalled();
  expect(strings(tree)).toContain(WELCOME_COPY.stuck);
});

it("an account already signed in on this phone goes straight in", () => {
  mockAuth.isAuthenticated = true;
  render();
  expect(mockReplace).toHaveBeenCalledWith("/");
});

it("email failures are said in words the person can act on", () => {
  expect(emailError(new Error("Please confirm your email first — open the link we sent you, then sign in.")))
    .toMatch(/confirm your email/u);
  expect(emailError(new Error("Network request failed"))).toMatch(/couldn't reach/u);
  expect(emailError(new Error("Invalid login credentials"))).toBe("That email and password didn't work.");
});
