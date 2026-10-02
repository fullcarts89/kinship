/**
 * Every network host the app talks to is a deliberate, documented choice.
 * A hard-coded URL to anything else (a hot-linked stock photo, a CDN font)
 * would send users' IP addresses to a third party without review.
 */
import { execSync } from "child_process";

const ALLOWED_HOSTS = new Set([
  "us.i.posthog.com", // analytics sink, off unless enabled (F0-D4)
  "eu.i.posthog.com", // named in a posthogSink doc comment only
  "api.anthropic.com", // DEV-ONLY direct AI path; release builds use the gateway
]);

describe("hard-coded remote hosts", () => {
  it("only references allowlisted hosts in app and src", () => {
    const out = execSync(
      `grep -rhoE "https?://[a-zA-Z0-9.-]+" app src --include=*.ts --include=*.tsx --exclude-dir=__tests__ || true`,
      { encoding: "utf8" },
    );
    const hosts = [
      ...new Set(
        out
          .split("\n")
          .filter(Boolean)
          .map((u) => u.replace(/^https?:\/\//, "")),
      ),
    ];
    expect(hosts.filter((h) => !ALLOWED_HOSTS.has(h))).toEqual([]);
  });

  it("bundles the onboarding photos instead of hot-linking them", () => {
    const out = execSync(
      `grep -rl "unsplash" app src --include=*.ts --include=*.tsx --exclude-dir=__tests__ || true`,
      {
        encoding: "utf8",
      },
    );
    expect(out.trim()).toBe("");
  });
});
