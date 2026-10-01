// P0-12: the Invite action (which sent a person a message that they had
// been added to someone's garden) is gone and must not come back.
import { execSync } from "child_process";

it("no source references the invite builder or an Invite action", () => {
  const out = execSync(
    `grep -rnE "buildInviteMessage|handlePlantASeed|label=\\"Invite\\"" app src --include=*.ts --include=*.tsx || true`,
    { cwd: `${__dirname}/../../..`, encoding: "utf8" }
  );
  const hits = out.split("\n").filter((l) => l && !l.includes("__tests__"));
  expect(hits).toEqual([]);
});
