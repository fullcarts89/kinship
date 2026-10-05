// The one Pressable 2.0 uses.
//
// NativeWind (kept for 1.0) wraps React Native's Pressable on iOS and Android.
// That wrapper merges the `style` prop into its own class styles. A style
// *function* (`style={({ pressed }) => …}`) becomes an empty object, so on a
// phone the control loses its size, fill and layout. The web build doesn't use
// the wrapper, which is why browser screenshots looked right while the
// founder's iPhone showed no send button and a broken Apple button.
//
// 2.0 never styles with className, so its controls opt out of the wrapper and
// get React Native's own Pressable. ESLint forbids importing Pressable from
// "react-native" in 2.0 code; `nativeStyles.test.tsx` renders the 2.0 screens
// with the wrapper switched on and fails if any style changes.
import React, { forwardRef } from "react";
import { Pressable as RNPressable, type PressableProps, type View } from "react-native";

export type { PressableProps };

export const Pressable = forwardRef<View, PressableProps>(function Pressable(props, ref) {
  // `cssInterop={false}` is NativeWind's documented opt-out, read by its JSX
  // runtime before the element is created; React Native never sees it.
  const optOut = { cssInterop: false } as object;
  return <RNPressable ref={ref} {...optOut} {...props} />;
});
