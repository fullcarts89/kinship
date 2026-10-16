// The semantic corpus manifest: each fixture file's count and SHA-256, so a
// silent fixture change fails CI (residence.test.ts checks it).
//   deno run -A --config evals/deno.json evals/semantic/manifest.ts           check
//   deno run -A --config evals/deno.json evals/semantic/manifest.ts --write   (re)freeze

const DIR = new URL(".", import.meta.url);
const FILES = { residence: "fixtures/residence.jsonl" } as const;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const manifest = { version: "semantic-v1", counts: {} as Record<string, number>, files: {} as Record<string, string> };
for (const [set, name] of Object.entries(FILES)) {
  const text = await Deno.readTextFile(new URL(name, DIR));
  manifest.counts[set] = text.split("\n").filter((l) => l.trim().startsWith("{")).length;
  manifest.files[name] = await sha256(text);
}
const out = `${JSON.stringify(manifest, null, 2)}\n`;
if (Deno.args.includes("--write")) {
  await Deno.writeTextFile(new URL("MANIFEST.json", DIR), out);
  console.log(`froze ${JSON.stringify(manifest.counts)}`);
} else {
  const current = await Deno.readTextFile(new URL("MANIFEST.json", DIR)).catch(() => "");
  if (current !== out) {
    console.error("evals/semantic/MANIFEST.json is out of date: run with --write after reviewing the fixture change");
    Deno.exit(1);
  }
  console.log(`semantic corpus matches its manifest: ${JSON.stringify(manifest.counts)}`);
}
