// The palette for the current appearance (plan §18: light or night from the
// system). The app still declares a light-only interface, so this is light
// until night is switched on with the rest of E07.
import { useColorScheme } from "react-native";
import { color, type Palette } from "@/design/tokens";

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? color.night : color.light;
}
