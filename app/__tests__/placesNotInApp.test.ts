// The place data (Phase 4B, brief §6) lives with the gateway and is never
// shipped in the app: Metro refuses to bundle it, and nothing in the app
// imports it. The phone reads places only from its facets' own readings.
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..", "..");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const neverBundled = require(path.join(ROOT, "metro.blocklist.js")) as RegExp[];
const PLACES = ["supabase", "functions", "_shared", "semantic", "places"];

it("Metro's block list refuses the place data, on any platform's paths", () => {
  for (const sep of ["/", "\\"]) {
    const file = [ROOT.split(path.sep).join(sep), ...PLACES, "places-2026.10.json"].join(sep);
    expect(neverBundled.some((r) => r.test(file))).toBe(true);
  }
  // Only the data: the format's types stay importable.
  expect(neverBundled.some((r) => r.test(path.join(ROOT, ...PLACES, "format.ts")))).toBe(false);
});

it("the app's Metro config applies it", () => {
  const config = fs.readFileSync(path.join(ROOT, "metro.config.js"), "utf8");
  expect(config).toMatch(/require\("\.\/metro\.blocklist"\)/);
  expect(config).toMatch(/config\.resolver\.blockList = \[.*\.\.\.neverBundled\]/);
});

it("no app source imports the place data", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules") walk(p);
      } else if (/\.(ts|tsx|js|jsx)$/.test(e.name) && p !== __filename) {
        const src = fs.readFileSync(p, "utf8");
        if (/(from\s+|require\(\s*|import\(\s*)["'][^"']*semantic\/places(\/|["'])/.test(src)) offenders.push(path.relative(ROOT, p));
      }
    }
  };
  for (const dir of ["app", "src"]) walk(path.join(ROOT, dir));
  expect(offenders).toEqual([]);
});
