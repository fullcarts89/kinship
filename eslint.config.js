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
