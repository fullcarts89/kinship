// The app's config is app.json. The 2.0 dogfood build (EXPO_PUBLIC_V2_ENTRY=1)
// changes only its first frame: the native splash becomes the Quiet
// Herbarium's paper with a pressed sprig (night: green-black, parchment), so
// launch → welcome → 2.0 never passes through 1.0's cream. Every other
// build is exactly app.json.
import type { ConfigContext, ExpoConfig } from "expo/config";

const PAPER = "#EFEEE9"; // src/design/tokens.ts color.light.paper
const NIGHT = "#121513"; // color.night.paper

export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.EXPO_PUBLIC_V2_ENTRY !== "1") return config as ExpoConfig;
  return {
    ...config,
    splash: { image: "./assets/images/v2/splash-sprig.png", resizeMode: "contain", backgroundColor: PAPER },
    plugins: [
      ...(config.plugins ?? []),
      [
        "expo-splash-screen",
        {
          image: "./assets/images/v2/splash-sprig.png",
          imageWidth: 56,
          resizeMode: "contain",
          backgroundColor: PAPER,
          dark: { image: "./assets/images/v2/splash-sprig-night.png", backgroundColor: NIGHT },
        },
      ],
    ],
  } as ExpoConfig;
};
