// Saved eval results. Raw outputs of paid runs are committed gzipped
// (`gzip -9n`, byte-identical when unpacked; see evals/results/RUNS.md),
// so tools read either form.

export async function readResults<T = unknown>(path: string): Promise<T> {
  if (!path.endsWith(".gz")) return JSON.parse(await Deno.readTextFile(path)) as T;
  const file = await Deno.open(path);
  return JSON.parse(await new Response(file.readable.pipeThrough(new DecompressionStream("gzip"))).text()) as T;
}
