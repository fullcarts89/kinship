// The keyboard's own bar (founder I6): Done, and on Today and People the two
// destinations, so they're reachable while typing. iOS draws it on the
// keyboard: it rides along when the keyboard is dragged away, and leaves
// with it. Each text box carries its own (one id per box), so it works
// inside sheets too. Elsewhere there's no keyboard bar: the dock keeps its
// own Today · People while typing (TellDockView).
import React, { useId } from "react";
import { InputAccessoryView, Keyboard, Platform, View } from "react-native";
import { space, TOUCH } from "@/design/tokens";
import { NavBar, type NavKey } from "./NavBar";
import { Pill } from "./Pill";
import { usePalette } from "./theme";

/** The keyboard carries the bar on this platform (so the dock's own bar can step aside while typing). */
export const KEYBOARD_BAR = Platform.OS === "ios";

/** An id for one text box's keyboard bar: pass it to the box's inputAccessoryViewID and to its KeyboardBar. */
export function useKeyboardBarId(): string | undefined {
  const id = useId();
  return KEYBOARD_BAR ? `kinship-keyboard-${id.replace(/[^\w-]/gu, "")}` : undefined;
}

export function KeyboardBar({ id, nav }: {
  id: string | undefined;
  /** Today · People, for a box on those screens. */
  nav?: { current: NavKey; onGo: (to: NavKey) => void };
}) {
  const p = usePalette();
  if (!KEYBOARD_BAR || !id) return null;
  return (
    <InputAccessoryView nativeID={id} backgroundColor={p.paper}>
      <View
        style={{
          flexDirection: "row", alignItems: "center", minHeight: TOUCH, paddingHorizontal: space.l,
          borderTopWidth: 1, borderTopColor: p.hairline, backgroundColor: p.paper,
        }}
      >
        <View style={{ flex: 1 }} />
        {nav ? (
          <NavBar
            compact
            current={nav.current}
            onGo={(to) => {
              // Leaving folds the Tell away; its words wait as a draft.
              Keyboard.dismiss();
              nav.onGo(to);
            }}
          />
        ) : null}
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Pill variant="quiet" label="Done" accessibilityHint="Puts the keyboard away" onPress={() => Keyboard.dismiss()} />
        </View>
      </View>
    </InputAccessoryView>
  );
}
