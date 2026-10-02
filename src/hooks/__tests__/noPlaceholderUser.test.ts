// P0-02: no code outside the demo data may save rows under a placeholder user.
import { execSync } from "child_process";

it('no source file assigns user_id "u1"', () => {
  const hits = execSync(
    `grep -rnE "user_id: ?[\\"']u1[\\"']" src app --include=*.ts --include=*.tsx || true`,
    { cwd: `${__dirname}/../../..`, encoding: "utf8" }
  )
    .split("\n")
    .filter((l) => l && !l.startsWith("src/data/mock.ts") && !l.includes("__tests__"));
  expect(hits).toEqual([]);
});
