// P0-10: the built app asks for exactly the permissions Kinship uses. This
// checks the fully resolved config (after every config plugin has run),
// because plugins add permissions app.json never mentions.
import { execSync } from "child_process";

const ROOT = `${__dirname}/../../..`;

const IOS_USAGE_ALLOWLIST = [
  "NSCalendarsFullAccessUsageDescription", // read events for suggestions (iOS 17+)
  "NSCalendarsUsageDescription",
  "NSCameraUsageDescription", // photos for memories
  "NSContactsUsageDescription", // import people (read only)
  "NSPhotoLibraryUsageDescription", // attach photos (read only)
].sort();

const ANDROID_ALLOWLIST = [
  "android.permission.INTERNET",
  "android.permission.READ_CALENDAR",
  "android.permission.READ_CONTACTS",
  "android.permission.READ_EXTERNAL_STORAGE", // photo picker on Android 12 and older
].sort();

const MUST_BE_BLOCKED = [
  "android.permission.WRITE_CONTACTS",
  "android.permission.WRITE_CALENDAR",
  "android.permission.RECORD_AUDIO",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

let config: {
  ios: { infoPlist: Record<string, unknown> };
  android: { permissions?: string[]; blockedPermissions?: string[] };
};

beforeAll(() => {
  const out = execSync("npx expo config --type introspect --json", {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  config = JSON.parse(out);
}, 60_000);

it("iOS declares only the allowed usage descriptions", () => {
  const usage = Object.keys(config.ios.infoPlist).filter((k) => k.endsWith("UsageDescription"));
  expect(usage.sort()).toEqual(IOS_USAGE_ALLOWLIST);
});

it("no iOS usage description is a generic plugin default", () => {
  for (const key of IOS_USAGE_ALLOWLIST) {
    expect(String(config.ios.infoPlist[key])).toMatch(/^Allow Kinship to /);
  }
});

it("Android requests only the allowed permissions", () => {
  const requested = (config.android.permissions ?? []).filter(
    (p) => !(config.android.blockedPermissions ?? []).includes(p)
  );
  expect(requested.sort()).toEqual(ANDROID_ALLOWLIST);
});

it("Android blocks write and microphone permissions any library might add", () => {
  expect(config.android.blockedPermissions).toEqual(expect.arrayContaining(MUST_BE_BLOCKED));
});
