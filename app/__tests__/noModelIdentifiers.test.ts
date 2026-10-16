// Nothing the app ships names a model (founder rule: no model identifiers in code; the product never shows
// AI). The release bundle carried one from the 1.0 insight service until 16 Oct 2026. The server alone
// chooses the model; a development build reads one from .env. This scans everything Metro can bundle and
// the app's own config.
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..", "..");
// Built from parts, so this file never contains what it looks for.
const MODEL_ID = new RegExp(["cla", "ude-(?:opus|sonnet|haiku|fable|instant|\\d)"].join(""), "iu");

function files(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && !e.name.startsWith(".")) files(p, out);
    } else if (/\.(ts|tsx|js|jsx|json)$/u.test(e.name)) out.push(p);
  }
  return out;
}

it("no app source, config plugin or app config names a model", () => {
  const scanned = [
    ...["app", "src", "plugins"].flatMap((d) => files(path.join(ROOT, d))),
    ...["app.json", "app.config.ts", "eas.json", "index.js"].map((f) => path.join(ROOT, f)),
  ].filter((p) => fs.existsSync(p));
  expect(scanned.length).toBeGreaterThan(100);
  const offenders = scanned.filter((p) => MODEL_ID.test(fs.readFileSync(p, "utf8"))).map((p) => path.relative(ROOT, p));
  expect(offenders).toEqual([]);
});

it("the pattern finds what it should", () => {
  for (const id of ["opus-4-8", "sonnet-5-5", "haiku-4-5", "3-5-sonnet"]) expect(MODEL_ID.test(`cla${"ude"}-${id}`)).toBe(true);
  expect(MODEL_ID.test("Claude Code")).toBe(false);
  expect(MODEL_ID.test("Sent to Anthropic to understand it")).toBe(false);
});
