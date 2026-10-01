// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*"],
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
