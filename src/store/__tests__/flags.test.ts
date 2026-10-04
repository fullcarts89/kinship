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

it("launches from the server the first time, and from the device after that", async () => {
  const cache = memoryCache();
  let on = true;
  const s = server(async () => ({ shell_v2: on, tell: on, ai_extraction: false }));
  const repo = new FlagRepo(s.source, cache);
  const first = await repo.atLaunch(ME);
  expect([isOn(first, "shell_v2"), isOn(first, "tell"), isOn(first, "ai_extraction")]).toEqual([true, true, false]);

  on = false; // switched off on the server
  expect(isOn(await repo.atLaunch(ME), "shell_v2")).toBe(true); // this launch keeps what it knew
  await repo.refresh(ME); // the background refresh learns the change
  expect(isOn(await repo.atLaunch(ME), "shell_v2")).toBe(false); // and the next launch uses it
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
