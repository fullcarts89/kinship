// A sheet opened from inside another sheet must wait for the first to leave: presenting a second iOS modal
// while one is on its way out loses it, and the lost one can sit invisibly over the page taking every touch
// (src/ui/sheetStack.ts). Found on the native pass of the integrated build (31 Oct 2026): Edit › Merge with
// someone closed the name sheet, never showed the merge sheet, and the page stopped answering taps. The
// black-box tier cannot see it (no native modals), so this guards the wiring itself.
import { readFileSync } from "fs";
import { join } from "path";

describe("sheet opened from a sheet", () => {
  const page = readFileSync(join(__dirname, "..", "v2", "person", "[id]", "index.tsx"), "utf8");

  it("opens the merge sheet only once the name sheet has left", () => {
    expect(page).toMatch(/afterSheets\(\(\) => setMerging\(/u);
    // and never directly from the same tick that closes the name sheet
    expect(page).not.toMatch(/\.then\(\(\[candidates, everyone\]\) => setMerging\(/u);
  });
});
