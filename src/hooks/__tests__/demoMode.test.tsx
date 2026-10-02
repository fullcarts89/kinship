// P0-02: without a backend, demo mode still shows the bundled garden, so
// UI work keeps working. (Signed-in behaviour: signedInData.test.tsx.)
import { renderHook } from "@/test-utils/renderHook";
import { mockPeople } from "@/data/mock";
import { usePersons } from "@/hooks/usePersons";
import * as personService from "@/services/personService";

jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: false, supabase: null }));
jest.mock("@/lib/localStore", () => ({
  loadCollection: jest.fn(() => Promise.resolve([])),
  saveCollection: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/services/personService");

it("demo mode shows demo people and never calls the server", async () => {
  const h = await renderHook(() => usePersons());
  expect(h.current().persons.map((p) => p.id)).toEqual(mockPeople.map((p) => p.id));
  expect(personService.getPersons).not.toHaveBeenCalled();
});
