// Haptics, only where the Design Direction (§H) puts them. Today that is
// one: a success tap when the user confirms they reached someone after a
// hand-off. (Recording start/stop arrives with voice, E18; the leaf-added tap
// with sprig marks, which stay off.) Nothing on scroll, navigation or taps.
import { Platform } from "react-native";

export async function reachedSomeone(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Haptics = await import("expo-haptics");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // No haptics on this device: nothing to do.
  }
}
