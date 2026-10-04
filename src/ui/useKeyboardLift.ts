// How far something pinned to the bottom (the Tell field) must rise so the
// keyboard never covers it.
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardLift(): number {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) =>
      setLift(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return lift;
}
