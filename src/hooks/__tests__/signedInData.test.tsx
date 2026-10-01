// P0-02: signed in, the data hooks show only the server's data for the
// signed-in user, or an error. They never fall back to demo people, never
// save under a placeholder user, and never write server data to the device.
import { act } from "react-test-renderer";
import { renderHook, settle } from "@/test-utils/renderHook";
import { mockPeople, mockMemories, mockInteractions } from "@/data/mock";
import * as localStore from "@/lib/localStore";
import * as personService from "@/services/personService";
import * as memoryService from "@/services/memoryService";
import * as interactionService from "@/services/interactionService";
import * as promiseService from "@/services/promiseService";
import * as seasonService from "@/services/seasonService";
import { usePersons, usePerson, useUpdatePerson, useDeletePerson } from "@/hooks/usePersons";
import {
  useMemories,
  usePersonMemories,
  useMemory,
  useCreateMemory,
  useUpdateMemory,
  useDeleteMemory,
} from "@/hooks/useMemories";
import {
  useAllInteractions,
  usePersonInteractions,
  useCreateInteraction,
  useDeleteInteraction,
} from "@/hooks/useInteractions";
import { useOpenPromises, useCreatePromise, useResolvePromise } from "@/hooks/usePromises";
import { useActiveSeason } from "@/hooks/useSeason";
import type { Person } from "@/types/database";

jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {} }));
jest.mock("@/lib/localStore", () => ({
  // A previous demo session left people on the device; signed in, they must not show.
  loadCollection: jest.fn(() =>
    Promise.resolve([{ id: "p-local-stale", user_id: "u1", name: "Stale Device Person" }])
  ),
  saveCollection: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/services/personService");
jest.mock("@/services/memoryService");
jest.mock("@/services/interactionService");
jest.mock("@/services/promiseService");
jest.mock("@/services/seasonService");

const offline = () => Promise.reject(new Error("Network request failed"));
const asMock = (fn: unknown) => fn as jest.Mock;

const serverPerson: Person = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-a",
  name: "Server Person",
  photo_url: null,
  relationship_type: "friend",
  birthday: undefined,
  phone: null,
  email: null,
  created_at: "2026-09-01T00:00:00Z",
} as Person;

const demoIds = new Set([...mockPeople, ...mockMemories, ...mockInteractions].map((x) => x.id));

beforeEach(() => {
  jest.clearAllMocks();
  for (const svc of [personService, memoryService, interactionService, promiseService, seasonService]) {
    for (const fn of Object.values(svc)) {
      if (jest.isMockFunction(fn)) fn.mockImplementation(offline);
    }
  }
});

afterEach(() => {
  // Nothing signed-in may ever be persisted on the device by these hooks.
  expect(localStore.saveCollection).not.toHaveBeenCalled();
});

describe("reads", () => {
  it("usePersons: server failure → error, empty list, no demo people", async () => {
    const h = await renderHook(() => usePersons());
    expect(h.current().error?.message).toBe("Network request failed");
    expect(h.current().persons).toEqual([]);
    expect(h.current().isLoading).toBe(false);
  });

  it("usePersons: shows exactly the server's people, not device leftovers", async () => {
    asMock(personService.getPersons).mockResolvedValue([serverPerson]);
    const h = await renderHook(() => usePersons());
    expect(h.current().error).toBeNull();
    expect(h.current().persons).toEqual([serverPerson]);
    expect(localStore.loadCollection).not.toHaveBeenCalled();
  });

  it("usePerson: a demo person id is not found from the server", async () => {
    asMock(personService.getPersonById).mockResolvedValue(null);
    const h = await renderHook(() => usePerson(mockPeople[0].id));
    expect(h.current().person).toBeNull();
    expect(personService.getPersonById).toHaveBeenCalledWith(mockPeople[0].id);
  });

  it("usePerson: server failure → error, no person", async () => {
    const h = await renderHook(() => usePerson(mockPeople[0].id));
    expect(h.current().person).toBeNull();
    expect(h.current().error).toBeInstanceOf(Error);
  });

  it("useMemories / usePersonMemories: server failure → error, no demo memories", async () => {
    const all = await renderHook(() => useMemories());
    const one = await renderHook(() => usePersonMemories(mockPeople[0].id));
    for (const h of [all, one]) {
      expect(h.current().error).toBeInstanceOf(Error);
      expect(h.current().memories).toEqual([]);
    }
  });

  it("useMemory: reads the memory from the server", async () => {
    const memory = { id: "m-1", person_id: serverPerson.id, content: "hi" };
    asMock(memoryService.getMemoryById).mockResolvedValue(memory);
    const h = await renderHook(() => useMemory("m-1"));
    expect(memoryService.getMemoryById).toHaveBeenCalledWith("m-1");
    expect(h.current().memory).toEqual(memory);
  });

  it("useMemory: a demo memory id is not served from bundled data", async () => {
    const h = await renderHook(() => useMemory(mockMemories[0].id));
    expect(h.current().memory).toBeNull();
    expect(h.current().error).toBeInstanceOf(Error);
  });

  it("interactions: server failure → error, no demo interactions", async () => {
    const all = await renderHook(() => useAllInteractions());
    const one = await renderHook(() => usePersonInteractions(mockPeople[0].id));
    for (const h of [all, one]) {
      expect(h.current().error).toBeInstanceOf(Error);
      expect(h.current().interactions).toEqual([]);
    }
    expect(one.current().latestInteraction).toBeNull();
  });

  it("promises and seasons: server failure → error, nothing from the device", async () => {
    const promises = await renderHook(() => useOpenPromises());
    const season = await renderHook(() => useActiveSeason());
    expect(promises.current().error).toBeInstanceOf(Error);
    expect(promises.current().promises).toEqual([]);
    expect(season.current().error).toBeInstanceOf(Error);
    expect(season.current().season).toBeNull();
  });
});

describe("writes reject instead of saving on the device", () => {
  it("createPerson rejects; no person is added", async () => {
    const h = await renderHook(() => usePersons());
    await act(async () => {
      await expect(
        h.current().createPerson({ name: "Ana", relationship_type: "friend", photo_url: null })
      ).rejects.toThrow("Network request failed");
    });
    expect(h.current().persons).toEqual([]);
  });

  it("createPerson success shows the server row", async () => {
    asMock(personService.getPersons).mockResolvedValue([]);
    asMock(personService.createPerson).mockResolvedValue(serverPerson);
    const h = await renderHook(() => usePersons());
    await settle(() =>
      h.current().createPerson({ name: "Server Person", relationship_type: "friend", photo_url: null })
    );
    expect(h.current().persons).toEqual([serverPerson]);
  });

  it("updatePerson and deletePerson reject on server failure", async () => {
    const upd = await renderHook(() => useUpdatePerson());
    const del = await renderHook(() => useDeletePerson());
    await act(async () => {
      await expect(upd.current().updatePerson(mockPeople[0].id, { name: "x" })).rejects.toThrow();
      await expect(del.current().deletePerson(mockPeople[0].id)).rejects.toThrow();
    });
  });

  it("memory create/update/delete reject on server failure", async () => {
    const c = await renderHook(() => useCreateMemory());
    const u = await renderHook(() => useUpdateMemory());
    const d = await renderHook(() => useDeleteMemory());
    await act(async () => {
      await expect(
        c.current().createMemory({ person_id: serverPerson.id, content: "a", emotion: null, photo_url: null })
      ).rejects.toThrow();
      await expect(u.current().updateMemory(mockMemories[0].id, { content: "b" })).rejects.toThrow();
      await expect(d.current().deleteMemory(mockMemories[0].id)).rejects.toThrow();
    });
  });

  it("interaction create/delete reject on server failure", async () => {
    const c = await renderHook(() => useCreateInteraction());
    const d = await renderHook(() => useDeleteInteraction());
    await act(async () => {
      await expect(
        c.current().createInteraction({ person_id: serverPerson.id, type: "check_in" })
      ).rejects.toThrow();
      await expect(d.current().deleteInteraction(mockInteractions[0].id)).rejects.toThrow();
    });
  });

  it("promise create/resolve and season begin reject on server failure", async () => {
    const c = await renderHook(() => useCreatePromise());
    const r = await renderHook(() => useResolvePromise());
    const s = await renderHook(() => useActiveSeason());
    await act(async () => {
      await expect(
        c.current().createPromise({ person_id: serverPerson.id, text: "call", source: "manual" })
      ).rejects.toThrow();
      await expect(r.current().resolvePromise("pr-1", "kept")).rejects.toThrow();
      await expect(
        s.current().beginSeason([{ person_id: serverPerson.id, rhythm: "regularly" }])
      ).rejects.toThrow();
    });
  });

  it("nothing shown signed in ever carries a demo id", async () => {
    asMock(personService.getPersons).mockResolvedValue([serverPerson]);
    const h = await renderHook(() => usePersons());
    expect(h.current().persons.some((p) => demoIds.has(p.id))).toBe(false);
  });
});
