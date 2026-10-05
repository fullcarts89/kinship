// FLG-02: flags come from the server per account, survive a relaunch on the
// device, never leak between accounts, and are off when unknown.
import { FlagRepo, isOn, supabaseFlagSource, type FlagCache, type Flags } from "@/store/flags";
import type { SupabaseClient } from "@supabase/supabase-js";

const ME = "aaaaaaaa-0000-4000-8000-0000000000f1";
const YOU = "aaaaaaaa-0000-4000-8000-0000000000f2";

function memoryCache(): FlagCache & { value: string | null } {
  const c = {
    value: null as string | null,
    read: async () => c.value,
    write: async (v: string) => {
      c.value = v;
    },
    clear: async () => {
      c.value = null;
    },
  };
  return c;
}

function server(answer: () => Promise<Flags>) {
  const calls = { n: 0 };
  return { calls, source: { fetch: () => (calls.n++, answer()) } };
}

it("launches from the server's answer, so a switch shows at the very next launch", async () => {
  const cache = memoryCache();
  let on = false;
  const s = server(async () => ({ shell_v2: on, tell: on, ai_extraction: false }));
  const repo = new FlagRepo(s.source, cache);
  expect(isOn(await repo.atLaunch(ME), "shell_v2")).toBe(false);
  on = true; // switched on for this account
  const next = await repo.atLaunch(ME);
  expect([isOn(next, "shell_v2"), isOn(next, "tell"), isOn(next, "ai_extraction")]).toEqual([true, true, false]);
});

it("offline or slow, it launches from what the device last heard", async () => {
  const cache = memoryCache();
  await new FlagRepo({ fetch: async () => ({ shell_v2: true }) }, cache).atLaunch(ME);
  const offline = new FlagRepo({ fetch: async () => { throw new Error("offline"); } }, cache);
  expect(isOn(await offline.atLaunch(ME), "shell_v2")).toBe(true);
});

it("keeps an answer that arrives too late for this launch, for the next one", async () => {
  const cache = memoryCache();
  cache.value = JSON.stringify({ user_id: ME, flags: { shell_v2: false } });
  let release!: (f: Flags) => void;
  const slow = new FlagRepo({ fetch: () => new Promise<Flags>((r) => { release = r; }) }, cache, 20);
  expect(isOn(await slow.atLaunch(ME), "shell_v2")).toBe(false); // waited, used the device's copy
  release({ shell_v2: true }); // the answer lands after the wait
  await new Promise((r) => setTimeout(r, 0));
  const offline = new FlagRepo({ fetch: async () => { throw new Error("offline"); } }, cache);
  expect(isOn(await offline.atLaunch(ME), "shell_v2")).toBe(true); // and is what the next launch knows
});

it("is all off when the server can't be reached and nothing is known", async () => {
  const s = server(() => new Promise<Flags>(() => undefined)); // never answers
  const repo = new FlagRepo(s.source, memoryCache(), 20);
  expect(await repo.atLaunch(ME)).toEqual({});
  const failing = new FlagRepo({ fetch: async () => { throw new Error("offline"); } }, memoryCache());
  expect(isOn(await failing.atLaunch(ME), "shell_v2")).toBe(false);
});

it("never uses another account's flags", async () => {
  const cache = memoryCache();
  await new FlagRepo({ fetch: async () => ({ shell_v2: true }) }, cache).atLaunch(YOU);
  const repo = new FlagRepo({ fetch: async () => { throw new Error("offline"); } }, cache);
  expect(isOn(await repo.atLaunch(ME), "shell_v2")).toBe(false);
});

it("treats anything but true as off, from the server or the device", async () => {
  const cache = memoryCache();
  cache.value = JSON.stringify({ user_id: ME, flags: { shell_v2: "yes", tell: 1, ai_extraction: true } });
  const repo = new FlagRepo({ fetch: async () => { throw new Error("offline"); } }, cache);
  expect(await repo.atLaunch(ME)).toEqual({ shell_v2: false, tell: false, ai_extraction: true });
  cache.value = "{not json";
  expect(await repo.atLaunch(ME)).toEqual({});
});

it("reads my_flags() over supabase-js", async () => {
  const rpc = jest.fn().mockResolvedValue({ data: [{ key: "shell_v2", enabled: true }, { key: "tell", enabled: false }], error: null });
  const flags = await supabaseFlagSource({ rpc } as unknown as SupabaseClient).fetch();
  expect(rpc).toHaveBeenCalledWith("my_flags");
  expect(flags).toEqual({ shell_v2: true, tell: false });
  const broken = jest.fn().mockResolvedValue({ data: null, error: { message: "x" } });
  await expect(supabaseFlagSource({ rpc: broken } as unknown as SupabaseClient).fetch()).rejects.toThrow();
});
