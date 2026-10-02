// D3 / found in the Phase 0 device test: withdrawing AI consent must remove
// AI output, not only stop future calls. An already-open person screen drops
// its AI suggestion, and cached AI insights are deleted from the device.
import { act } from "react-test-renderer";
import { renderHook } from "@/test-utils/renderHook";
import { files } from "@/test-utils/memoryFileSystem";
import { setAIEnabled, isAIEnabled, subscribeToAIConsent } from "@/lib/aiPreferences";
import { loadCollection, saveCollection } from "@/lib/localStore";
import { useAIInsight } from "@/hooks/useAIInsight";
import type { Person } from "@/types/database";

jest.mock("expo-file-system", () => require("@/test-utils/memoryFileSystem"));
// Demo mode: consent is kept on the device, so no server is involved.
jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: false, supabase: null }));
// The real module (including its consent subscription that clears the cache),
// with the model call stubbed and "configured" meaning "consent given".
const mockGenerate = jest.fn();
jest.mock("@/lib/aiInsightService", () => {
  const actual = jest.requireActual("@/lib/aiInsightService");
  const { isAIEnabled: enabled } = jest.requireActual("@/lib/aiPreferences");
  return { ...actual, isAIConfigured: () => enabled(), generatePersonInsight: (...a: unknown[]) => mockGenerate(...a) };
});

const ben = { id: "p1", name: "Ben", notes: [{ text: "Chicago Sunday", created_at: "2026-10-02" }] } as unknown as Person;
const insight = { headline: "Cheer Ben on for the marathon", body: "b", conversation_starter: "c" };

beforeEach(async () => {
  files.clear();
  await setAIEnabled(false);
});

it("notifies subscribers only when consent actually changes", async () => {
  const seen: boolean[] = [];
  const stop = subscribeToAIConsent((enabled) => seen.push(enabled));
  await setAIEnabled(true);
  await setAIEnabled(true);
  await setAIEnabled(false);
  stop();
  await setAIEnabled(true);
  expect(seen).toEqual([true, false]);
});

it("revoking consent deletes cached AI insights from the device", async () => {
  await setAIEnabled(true);
  saveCollection("ai-insights", [{ ...insight, person_id: "p1", digest: "d", created_at: new Date().toISOString() }]);
  await setAIEnabled(false);
  await expect(loadCollection("ai-insights")).resolves.toEqual([]);
});

it("an open person screen drops its AI suggestion when consent is withdrawn", async () => {
  mockGenerate.mockResolvedValue(insight);
  await setAIEnabled(true);
  const h = await renderHook(() => useAIInsight(ben, [], []));
  expect(h.current().insight).toEqual(insight);

  await act(async () => {
    await setAIEnabled(false); // e.g. toggled off in Settings while Ben's page stays open
  });
  expect(isAIEnabled()).toBe(false);
  expect(h.current().insight).toBeNull();
});
