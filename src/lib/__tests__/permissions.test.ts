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
  "NSMicrophoneUsageDescription", // speak a Tell, transcribed on the phone (E18, D5)
  "NSPhotoLibraryUsageDescription", // attach photos (read only)
  "NSSpeechRecognitionUsageDescription", // on-device speech recognition only (E18, D5)
  // Never requested. expo-calendar refuses to load without these (it checks
  // them on startup and crashes development builds), so they say plainly
  // that Kinship doesn't use reminders. Found by the Phase 0 device test.
  "NSRemindersFullAccessUsageDescription",
  "NSRemindersUsageDescription",
].sort();

const ANDROID_ALLOWLIST = [
  "android.permission.INTERNET",
  "android.permission.READ_CALENDAR",
  "android.permission.READ_CONTACTS",
  "android.permission.READ_EXTERNAL_STORAGE", // photo picker on Android 12 and older
  "android.permission.RECORD_AUDIO", // speak a Tell, recognized on the phone (E18, D5)
].sort();

const MUST_BE_BLOCKED = [
  "android.permission.WRITE_CONTACTS",
  "android.permission.WRITE_CALENDAR",
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

it("the reminders descriptions say Kinship doesn't use reminders", () => {
  for (const key of ["NSRemindersFullAccessUsageDescription", "NSRemindersUsageDescription"]) {
    expect(String(config.ios.infoPlist[key])).toMatch(/^Kinship doesn't read or change your reminders/);
  }
});

it("every calendar and reminders key expo-calendar checks at startup is present", () => {
  // expo-calendar's iOS module checks these when it loads (iOS 17+ and older).
  for (const key of [
    "NSCalendarsFullAccessUsageDescription",
    "NSCalendarsUsageDescription",
    "NSRemindersFullAccessUsageDescription",
    "NSRemindersUsageDescription",
  ]) {
    expect(config.ios.infoPlist[key]).toBeTruthy();
  }
});

it("no iOS usage description is a generic plugin default", () => {
  for (const key of IOS_USAGE_ALLOWLIST) {
    expect(String(config.ios.infoPlist[key])).toMatch(/^(Allow Kinship to |Kinship doesn't )/);
  }
});

it("Android requests only the allowed permissions", () => {
  const requested = (config.android.permissions ?? []).filter(
    (p) => !(config.android.blockedPermissions ?? []).includes(p)
  );
  expect(requested.sort()).toEqual(ANDROID_ALLOWLIST);
});

it("Android blocks write permissions any library might add", () => {
  expect(config.android.blockedPermissions).toEqual(expect.arrayContaining(MUST_BE_BLOCKED));
});

it("the microphone and speech descriptions say the words stay on the phone and the audio is never saved", () => {
  for (const key of ["NSMicrophoneUsageDescription", "NSSpeechRecognitionUsageDescription"]) {
    const text = String(config.ios.infoPlist[key]);
    expect(text).toMatch(/on this phone/);
    expect(text).toMatch(/audio is never saved/);
  }
});

it("the camera only takes still photos: the microphone is for voice alone", () => {
  // expo-image-picker uses NSMicrophoneUsageDescription when the CAMERA
  // records video or Live Photos. Kinship's only camera path is photoPicker,
  // so the one microphone use is listening for a Tell (E18).
  const fs = jest.requireActual<typeof import("fs")>("fs");
  const src = fs.readFileSync(`${ROOT}/src/lib/photoPicker.ts`, "utf8");
  expect(src).toMatch(/mediaTypes:\s*\["images"\]/);
  const cameraCalls = execSync(`grep -rln "launchCameraAsync" app src --include=*.ts --include=*.tsx || true`, {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter((f) => f && !f.includes("__tests__"));
  expect(cameraCalls).toEqual(["src/lib/photoPicker.ts"]);
});

it("secure storage never asks for Face ID, so no Face ID description is needed", () => {
  const out = execSync(`grep -rn "requireAuthentication" app src --include=*.ts --include=*.tsx || true`, {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(out.split("\n").filter((l) => l && !l.includes("__tests__"))).toEqual([]);
});
