// How far something pinned to the bottom (the Tell field) must rise so the
// keyboard never covers it. On iOS the rise moves with the keyboard itself
// (its own duration and curve), so the field never jumps ahead of it.
import { useEffect, useState } from "react";
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent } from "react-native";

function follow(e: KeyboardEvent) {
  if (Platform.OS !== "ios" || !e.duration) return;
  LayoutAnimation.configureNext({ duration: e.duration, update: { type: LayoutAnimation.Types.keyboard } });
}

export function useKeyboardLift(): number {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => {
      follow(e);
      setLift(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", (e) => {
      follow(e);
      setLift(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return lift;
}
