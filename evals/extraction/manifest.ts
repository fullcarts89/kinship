// Corpus manifest: fixture counts and SHA-256 hashes, so a run records exactly
// which frozen corpus it graded and a silent fixture change fails CI.
//   deno run -A --config evals/deno.json evals/extraction/manifest.ts           check
//   deno run -A --config evals/deno.json evals/extraction/manifest.ts --write   (re)freeze

import { SETS } from "./lib/fixture.ts";

const DIR = new URL(".", import.meta.url).pathname.replace(/\/$/, "");

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface Manifest {
  version: string;
  counts: Record<string, number>;
  total: number;
  files: Record<string, string>;
  corpus_sha256: string;
}

export async function buildManifest(version: string): Promise<Manifest> {
  const files: Record<string, string> = {};
  const counts: Record<string, number> = {};
  const names = [...SETS.map((s) => `fixtures/${s}.jsonl`), "rosters.json", "thresholds.json"];
  for (const name of names) {
    const text = await Deno.readTextFile(`${DIR}/${name}`);
    files[name] = await sha256(text);
    const set = name.match(/^fixtures\/(.+)\.jsonl$/)?.[1];
    if (set) counts[set] = text.split("\n").filter((l) => l.trim().startsWith("{")).length;
  }
  const corpus_sha256 = await sha256(names.map((n) => `${n}:${files[n]}`).join("\n"));
  return { version, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), files, corpus_sha256 };
}

export async function readManifest(): Promise<Manifest | null> {
  try {
    return JSON.parse(await Deno.readTextFile(`${DIR}/MANIFEST.json`));
  } catch {
    return null;
  }
}

if (import.meta.main) {
  const frozen = await readManifest();
  const version = Deno.args.includes("--write") ? (Deno.args[Deno.args.indexOf("--write") + 1] ?? frozen?.version ?? "extraction-v1") : frozen?.version ?? "extraction-v1";
  const now = await buildManifest(version);
  if (Deno.args.includes("--write")) {
    await Deno.writeTextFile(`${DIR}/MANIFEST.json`, JSON.stringify(now, null, 2) + "\n");
    console.log(`froze ${now.total} fixtures, corpus ${now.corpus_sha256}`);
  } else if (!frozen || frozen.corpus_sha256 !== now.corpus_sha256) {
    const changed = Object.keys(now.files).filter((f) => frozen?.files[f] !== now.files[f]);
    console.error(`corpus differs from MANIFEST.json: ${changed.join(", ") || "no manifest"}. Fixture changes after a freeze must be deliberate: re-run with --write and say why in the commit.`);
    Deno.exit(1);
  } else {
    console.log(`corpus matches MANIFEST.json (${now.total} fixtures, ${now.corpus_sha256.slice(0, 12)})`);
  }
}
