// Plan §11 layering is enforced by lint, and this proves the rules fire:
// screens can't reach Supabase or the store's internals, and the 2.0 store
// can't reach back into the 1.0 app.
import { spawnSync } from "child_process";
import path from "path";

jest.setTimeout(120000);

// The ESLint API can't load the flat config inside Jest's VM, so run the CLI.
async function lint(filePath: string, code: string): Promise<string[]> {
  const bin = path.join(process.cwd(), "node_modules", ".bin", "eslint");
  const out = spawnSync(bin, ["--stdin", "--stdin-filename", filePath, "--format", "json"], {
    input: code, encoding: "utf8",
  });
  const [result] = JSON.parse(out.stdout) as { messages: { severity: number; ruleId: string | null }[] }[];
  return result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId ?? "parse");
}

it("blocks screens from the Supabase client and the store's internals", async () => {
  expect(await lint("app/today.tsx", 'import { supabase } from "@/lib/supabase";\nvoid supabase;\n'))
    .toContain("no-restricted-imports");
  expect(await lint("app/today.tsx", 'import { SyncEngine } from "@/store/syncEngine";\nvoid SyncEngine;\n'))
    .toContain("no-restricted-imports");
  expect(await lint("app/today.tsx", 'import { UserStore } from "@/store/userStore";\nvoid UserStore;\n'))
    .toContain("no-restricted-imports");
});

it("lets screens use repositories and isSupabaseConfigured", async () => {
  expect(await lint("app/today.tsx",
    'import { repositoriesFor } from "@/store/repositories";\nimport { isSupabaseConfigured } from "@/lib/supabase";\nvoid repositoriesFor; void isSupabaseConfigured;\n'))
    .toEqual([]);
});

it("keeps the 2.0 store independent of the 1.0 app layers", async () => {
  expect(await lint("src/store/foo.ts", 'import { usePersons } from "@/hooks/usePersons";\nvoid usePersons;\n'))
    .toContain("no-restricted-imports");
  expect(await lint("src/store/foo.ts", 'import { supabase } from "@/lib/supabase";\nvoid supabase;\n'))
    .toContain("no-restricted-imports");
});
