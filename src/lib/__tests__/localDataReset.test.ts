// P0-03: one wipe removes everything of the account from this device:
// the on-device store, in-memory caches, growth, session photos, the export
// file and scheduled notifications (which carry people's names).
import { claimDeviceFor, clearAllLocalUserData } from "@/lib/localDataReset";
import { getGrowthInfo, recordMemoryGrowth } from "@/lib/growthEngine";
import { isAIEnabled, setAIEnabled } from "@/lib/aiPreferences";
import { saveCollection, loadCollection } from "@/lib/localStore";
import { usePersonPhoto } from "@/hooks/usePersonPhoto";
import { renderHook, settle } from "@/test-utils/renderHook";

// In-memory stand-in for the device's file system.
const mockFiles = new Map<string, string>();
jest.mock("expo-file-system", () => {
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === "object" && p && "uri" in p ? (p as { uri: string }).uri : String(p))).join("/");
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    write(text: string) {
      mockFiles.set(this.uri, text);
    }
    text() {
      return Promise.resolve(mockFiles.get(this.uri) ?? "");
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return [...mockFiles.keys()].some((k) => k.startsWith(this.uri + "/"));
    }
    create() {}
    delete() {
      for (const k of [...mockFiles.keys()]) if (k.startsWith(this.uri + "/")) mockFiles.delete(k);
    }
  }
  return { File, Directory, Paths: { document: { uri: "doc" }, cache: { uri: "cache" } } };
});

const mockCancelAll = jest.fn(() => Promise.resolve());
jest.mock("expo-notifications", () => ({
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
}));
jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: false, supabase: null }));

beforeEach(() => {
  mockFiles.clear();
  mockCancelAll.mockClear();
});

it("removes the on-device store, including cached AI insights and the notification log", async () => {
  saveCollection("people", [{ id: "p1", name: "Maya" }]);
  saveCollection("ai-insights", [{ headline: "Ask Maya about her surgery" }]);
  saveCollection("notification-log", [{ type: "memory_resurface" }]);
  await clearAllLocalUserData();
  expect(mockFiles.size).toBe(0);
  await expect(loadCollection("ai-insights")).resolves.toEqual([]);
});

it("removes a leftover export file", async () => {
  mockFiles.set("cache/kinship-export.json", '{"persons":[{"name":"Maya"}]}');
  await clearAllLocalUserData();
  expect(mockFiles.has("cache/kinship-export.json")).toBe(false);
});

it("cancels every scheduled notification", async () => {
  await clearAllLocalUserData();
  expect(mockCancelAll).toHaveBeenCalledTimes(1);
});

it("still completes when notifications can't be cancelled", async () => {
  mockCancelAll.mockRejectedValueOnce(new Error("unavailable"));
  saveCollection("people", [{ id: "p1" }]);
  await expect(clearAllLocalUserData()).resolves.toBeUndefined();
  expect(mockFiles.size).toBe(0);
});

it("forgets growth, AI consent and session photos", async () => {
  recordMemoryGrowth("p1", { emotion: "grateful", content: "a long and meaningful memory of the day" });
  expect(getGrowthInfo("p1").points).toBeGreaterThan(0);
  await setAIEnabled(true);
  const before = await renderHook(() => usePersonPhoto("p1"));
  await settle(async () => before.current().setPhoto("file:///photo.jpg"));

  await clearAllLocalUserData();

  expect(getGrowthInfo("p1").points).toBe(0);
  expect(isAIEnabled()).toBe(false);
  const after = await renderHook(() => usePersonPhoto("p1"));
  expect(after.current().photoUri).toBeNull();
});

describe("claimDeviceFor (survives restarts: the owner is stored on the device)", () => {
  it("keeps the data when the same account comes back", async () => {
    await claimDeviceFor("user-a");
    saveCollection("ai-insights", [{ headline: "for A" }]);
    await claimDeviceFor("user-a");
    await expect(loadCollection("ai-insights")).resolves.toEqual([{ headline: "for A" }]);
  });

  it("wipes another account's data before a different account uses the device", async () => {
    await claimDeviceFor("user-a");
    saveCollection("ai-insights", [{ headline: "for A" }]);
    // e.g. A's session expired while the app was closed; B signs in later
    await claimDeviceFor("user-b");
    await expect(loadCollection("ai-insights")).resolves.toEqual([]);
    expect(mockCancelAll).toHaveBeenCalled();
    await expect(loadCollection("device-owner")).resolves.toEqual(["user-b"]);
  });

  it("wipes data of unknown ownership (older builds left it unlabelled)", async () => {
    saveCollection("people", [{ id: "p-local-1", user_id: "u1", name: "Leftover" }]);
    await claimDeviceFor("user-a");
    await expect(loadCollection("people")).resolves.toEqual([]);
  });
});
