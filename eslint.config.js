// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

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
      "no-restricted-imports": [
        "error",
        {
          paths: [
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
    files: ["supabase/functions/**/*.ts"],
    rules: {
      "import/no-unresolved": ["error", { ignore: ["^npm:", "^jsr:", "^https?:"] }],
    },
  },
]);
