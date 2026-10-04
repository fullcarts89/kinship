// Which appearance the app follows: 1.0 is light-only; the 2.0 shell follows
// the system (light or night). Native only: on the web the browser's own
// preference applies, and NativeWind refuses manual changes there.
import { Appearance, Platform } from "react-native";

export function followSystemAppearance(follow: boolean): void {
  if (Platform.OS === "web") return;
  try {
    Appearance.setColorScheme(follow ? null : "light");
  } catch {
    // Never let appearance break the app.
  }
}
