// What the phone draws must be what the tests and the browser see.
//
// On iOS and Android, NativeWind (kept for 1.0) wraps React Native's core
// components and rewrites their `style` prop. It turned every Pressable style
// *function* into `{}`: in the founder's build the Tell send button, the Apple
// button and the person page's action had no size or fill. Jest and the web
// build never load that wrapper (it registers only when NODE_ENV isn't
// "test"), which is how the defect reached a phone.
//
// This test loads the wrapper exactly as the app does on a device, renders
// every 2.0 screen state from the lab twice, once without the wrapper and once
// with it, and fails if any drawn style differs.
import "react-native-css-interop/dist/runtime/components";
import React from "react";
import { StyleSheet } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
// Resolves to the native build of the wrapper's registry under jest-expo (iOS).
import { interopComponents } from "react-native-css-interop/dist/runtime/api";
import { LAB_STATES, V2Lab } from "@/dev/v2Lab";
import { IconButton } from "../Screen";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => { throw new Error("not used"); } }));

const registered = new Map(interopComponents);

function drawn(el: React.ReactElement, wrapper: boolean): string[] {
  interopComponents.clear();
  if (wrapper) for (const [k, v] of registered) interopComponents.set(k, v);
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  const out = tree.root
    .findAll((n) => typeof n.type === "string")
    .map((n) => {
      // The wrapper moves a few style keys onto props (TextInput's textAlign,
      // ActivityIndicator's color); fold them back before comparing.
      const style = { ...(StyleSheet.flatten(n.props.style) ?? {}) } as Record<string, unknown>;
      if (n.props.textAlign !== undefined) style.textAlign = n.props.textAlign;
      if (n.props.color !== undefined) style.color = n.props.color;
      return `${String(n.type)} ${n.props.accessibilityLabel ?? n.props.testID ?? ""} ${JSON.stringify(style, Object.keys(style).sort())}`;
    });
  act(() => tree.unmount());
  return out;
}

afterAll(() => {
  interopComponents.clear();
  for (const [k, v] of registered) interopComponents.set(k, v);
});

describe("2.0 under the native NativeWind wrapper", () => {
  it("the wrapper is really registered (or this test proves nothing)", () => {
    const { Pressable } = jest.requireActual("react-native");
    expect(registered.has(Pressable)).toBe(true);
  });

  it("the send button keeps its size and fill", () => {
    const send = drawn(
      <IconButton label="Send to Kinship" onPress={() => undefined} filled diameter={40}>{null}</IconButton>,
      true,
    ).find((s) => s.includes("Send to Kinship"));
    expect(send).toContain('"backgroundColor"');
    expect(send).toContain('"width":40');
  });

  it.each(LAB_STATES.map((s) => [s]))("%s draws the same with the wrapper on", (state) => {
    const plain = drawn(<V2Lab state={state} />, false);
    const native = drawn(<V2Lab state={state} />, true);
    expect(native).toEqual(plain);
  });
});
