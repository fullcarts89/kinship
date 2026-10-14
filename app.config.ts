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
  // The build's short commit, from EAS, for dogfood performance telemetry
  // (founder CC-18: coarse build version). Absent outside an EAS build.
  const commit = (process.env.EAS_BUILD_GIT_COMMIT_HASH ?? "").slice(0, 7);
  // The acceptance harness's simulator build (eas.json "e2e-sim") talks to the local Supabase stack over
  // http://127.0.0.1: local networking only, and only in that build.
  const e2eLocal = process.env.EXPO_PUBLIC_E2E_LOCAL === "1";
  return {
    ...config,
    ...(e2eLocal ? { ios: { ...(config.ios ?? {}), infoPlist: { ...(config.ios?.infoPlist ?? {}), NSAppTransportSecurity: { NSAllowsLocalNetworking: true } } } } : {}),
    extra: { ...(config.extra ?? {}), ...(/^[0-9a-f]{7}$/u.test(commit) ? { build: commit } : {}) },
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
