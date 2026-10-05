// How far something pinned to the bottom (the Tell field) must rise so the
// keyboard never covers it, and never more.
//
// It measures where the pinned view really ends on screen and lifts it by
// exactly the part the keyboard overlaps. (The founder build lifted the Today
// dock by the keyboard's whole height on top of a container that already sat
// above the home indicator, so the field floated with the tabs and a gap
// between it and the keyboard.) On iOS the rise moves with the keyboard
// itself, on its own duration and curve.
import { useEffect, useRef, useState, type RefObject } from "react";
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent, type View } from "react-native";

function follow(e: KeyboardEvent) {
  if (Platform.OS !== "ios" || !e.duration) return;
  LayoutAnimation.configureNext({ duration: e.duration, update: { type: LayoutAnimation.Types.keyboard } });
}

/** The pinned view's bottom edge (window coordinates) and the keyboard's top edge → the overlap. */
export function keyboardOverlap(anchorBottom: number | null, keyboardTop: number, keyboardHeight: number): number {
  if (anchorBottom == null) return keyboardHeight;
  return Math.max(0, Math.round(anchorBottom - keyboardTop));
}

/**
 * The keyboard's overlap with `anchor` (a view pinned to the bottom), or its
 * height when there is nothing to measure. 0 while the keyboard is down.
 */
export function useKeyboardInset(anchor?: RefObject<View | null>): number {
  const [inset, setInset] = useState(0);
  const latest = useRef(anchor);
  latest.current = anchor;
  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      const { screenY, height } = e.endCoordinates;
      const view = latest.current?.current;
      if (!view?.measureInWindow) {
        follow(e);
        setInset(height);
        return;
      }
      view.measureInWindow((_x, y, _w, h) => {
        follow(e);
        setInset(keyboardOverlap(Number.isFinite(y + h) && h > 0 ? y + h : null, screenY, height));
      });
    };
    const onHide = (e: KeyboardEvent) => {
      follow(e);
      setInset(0);
    };
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", onShow);
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", onHide);
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}

/** The keyboard's height while it's up (for views that fill the whole screen). */
export function useKeyboardLift(): number {
  return useKeyboardInset();
}
