// CMR-1 corpus manifest: SHA-256 of every corpus file, and the frozen held-out set (its ids and the
// hash of its narratives with their ledgers). The runner refuses to run when the held-out set differs
// from this file unless told to re-freeze, so the held-out numbers always refer to the same cases.
//   deno run -A --config evals/deno.json evals/cmr1/manifest.ts                check
//   deno run -A --config evals/deno.json evals/cmr1/manifest.ts --write <ver>  (re)freeze; say why in the commit

import { CATEGORIES, loadCorpus, type Narrative } from "./lib/corpus.ts";

const DIR = new URL(".", import.meta.url).pathname.replace(/\/$/, "");

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface Manifest {
  version: string;
  counts: { by_category: Record<string, number>; by_split: Record<string, number>; steps: number; facts: number };
  total: number;
  files: Record<string, string>;
  corpus_sha256: string;
  heldout: { ids: string[]; sha256: string };
}

export async function buildManifest(version: string, corpus?: Narrative[]): Promise<Manifest> {
  const files: Record<string, string> = {};
  const names = [...CATEGORIES.map((c) => `corpus/${c}.jsonl`), "rosters.json", "thresholds.json"];
  for (const name of names) files[name] = await sha256(await Deno.readTextFile(`${DIR}/${name}`));
  const all = corpus ?? await loadCorpus(DIR);
  const by_category: Record<string, number> = {};
  const by_split: Record<string, number> = { dev: 0, heldout: 0 };
  let steps = 0;
  let facts = 0;
  for (const n of all) {
    by_category[n.category] = (by_category[n.category] ?? 0) + 1;
    by_split[n.split]++;
    steps += n.steps.length;
    facts += n.facts.length;
  }
  const held = all.filter((n) => n.split === "heldout").sort((a, b) => a.id.localeCompare(b.id));
  const heldout = { ids: held.map((n) => n.id), sha256: await sha256(JSON.stringify(held)) };
  const corpus_sha256 = await sha256(names.map((n) => `${n}:${files[n]}`).join("\n"));
  return { version, counts: { by_category, by_split, steps, facts }, total: all.length, files, corpus_sha256, heldout };
}

export async function readManifest(): Promise<Manifest | null> {
  try {
    return JSON.parse(await Deno.readTextFile(`${DIR}/MANIFEST.json`));
  } catch {
    return null;
  }
}

export async function writeManifest(m: Manifest): Promise<void> {
  await Deno.writeTextFile(`${DIR}/MANIFEST.json`, JSON.stringify(m, null, 2) + "\n");
}

if (import.meta.main) {
  const frozen = await readManifest();
  const write = Deno.args.includes("--write");
  const version = write ? (Deno.args[Deno.args.indexOf("--write") + 1] ?? frozen?.version ?? "cmr1-v1") : frozen?.version ?? "cmr1-v1";
  const now = await buildManifest(version);
  if (write) {
    await writeManifest(now);
    console.log(`froze ${now.total} narratives (${now.heldout.ids.length} held out), corpus ${now.corpus_sha256}`);
  } else if (!frozen) {
    console.error("no MANIFEST.json: freeze the corpus with --write <version>");
    Deno.exit(1);
  } else if (frozen.heldout.sha256 !== now.heldout.sha256) {
    console.error(`the held-out set differs from MANIFEST.json. A held-out change must be deliberate: re-run with --write <version> and say why in the commit.`);
    Deno.exit(1);
  } else if (frozen.corpus_sha256 !== now.corpus_sha256) {
    const changed = Object.keys(now.files).filter((f) => frozen.files[f] !== now.files[f]);
    console.error(`the dev corpus differs from MANIFEST.json: ${changed.join(", ")}. Re-freeze with --write <version> once the change is meant.`);
    Deno.exit(1);
  } else {
    console.log(`corpus matches MANIFEST.json (${now.total} narratives, ${now.heldout.ids.length} held out, ${now.corpus_sha256.slice(0, 12)})`);
  }
}
