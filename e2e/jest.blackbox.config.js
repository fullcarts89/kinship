// The black-box acceptance suite (never part of `npx jest`): the real app
// screens, store, sync engine and network client, against the local
// Supabase stack (real database functions, the real ai-gateway served by
// `npx supabase functions serve`, the model replayed or live). See e2e/README.md.
const base = require("../package.json").jest;
module.exports = {
  ...base,
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/blackbox/**/*.blackbox.tsx"],
  setupFilesAfterEnv: ["<rootDir>/e2e/blackbox/setup.ts"],
  testTimeout: 240000,
};
