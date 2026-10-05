// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

// Shared import bans (P0-08, F0-D4).
const sharedPaths = [
  {
    name: "expo-calendar",
    importNames: ["createEventAsync"],
    message: "Kinship never writes to the user's calendar (P0-08).",
  },
  ...["posthog-react-native", "posthog-js", "posthog-node"].map((name) => ({
    name,
    message: "Use track() from @/platform/analytics; the SDK collects device data (F0-D4).",
  })),
  {
    name: "@/platform/posthogSink",
    importNames: ["createPostHogSink"],
    message: "Only src/platform/analyticsSetup.ts installs the analytics sink (F0-D4).",
  },
];

// Plan §11 layering: screens → hooks → repositories → store/outbox → sync →
// Supabase. Screens never talk to Supabase or the store's internals, so they
// can never merge local and remote data themselves.
const screenLayerPaths = [
  {
    name: "@/lib/supabase",
    importNames: ["supabase"],
    message: "Screens don't call Supabase directly; go through hooks and repositories (plan §11).",
  },
  ...["sql", "userStore", "syncEngine", "supabaseRemote", "deviceStore", "expoPlatform", "schema", "merge", "remote"].map(
    (m) => ({
      name: `@/store/${m}`,
      message: "Screens use repositories (@/store/repositories) through hooks, never the store's internals (plan §11).",
    }),
  ),
];

const nativePressable = {
  name: "react-native",
  importNames: ["Pressable"],
  message: "Use Pressable from @/ui/Pressable: on a phone NativeWind drops a Pressable's style function, so the control loses its look.",
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*"],
  },
  {
    // P0-08: Kinship never writes to the user's calendar.
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        { property: "createEventAsync", message: "Kinship never writes to the user's calendar (P0-08)." },
      ],
      "no-restricted-imports": ["error", { paths: sharedPaths }],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: [...sharedPaths, ...screenLayerPaths] }],
    },
  },
  {
    // 2.0 controls use @/ui/Pressable. On a phone, NativeWind's wrapper around
    // React Native's Pressable turns a style function into {}, so a control
    // drawn with `style={({ pressed }) => …}` loses its size and fill (the
    // founder build's missing send button and broken Apple button).
    files: ["src/ui/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    ignores: ["src/ui/Pressable.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [...sharedPaths, nativePressable] }],
    },
  },
  {
    files: ["app/v2/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: [...sharedPaths, ...screenLayerPaths, nativePressable] }],
    },
  },
  {
    // The 2.0 store stands alone: it never reaches back into the 1.0 data
    // layer (hooks, services, mock data) or the UI.
    files: ["src/store/**/*.ts"],
    ignores: ["src/store/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: sharedPaths,
          patterns: [
            { group: ["@/hooks/*", "@/services/*", "@/data/*", "@/components/*", "@/providers/*", "@/lib/*"],
              message: "The 2.0 store doesn't depend on the 1.0 app layers (plan §11)." },
          ],
        },
      ],
    },
  },
  {
    // The one place allowed to install the PostHog sink.
    files: ["src/platform/analyticsSetup.ts", "src/platform/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...["posthog-react-native", "posthog-js", "posthog-node"].map((name) => ({
              name,
              message: "Use track() from @/platform/analytics (F0-D4).",
            })),
          ],
        },
      ],
    },
  },
  {
    // Supabase Edge Functions run on Deno, which resolves `npm:`, `jsr:` and
    // URL specifiers itself; `deno check` type-checks these files instead.
    files: ["supabase/functions/**/*.ts", "evals/**/*.ts"],
    rules: {
      "import/no-unresolved": ["error", { ignore: ["^npm:", "^jsr:", "^https?:"] }],
    },
  },
]);
