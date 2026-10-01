// P0-06: the app only reports deletion (and wipes the device) when the
// server confirms it; any failure leaves everything in place and says so.
import { deleteAccount } from "@/lib/accountDeletion";
import { clearAllLocalUserData } from "@/lib/localDataReset";
import { removeAllPhotos } from "@/lib/photoStorage";

const mockInvoke = jest.fn();
const mockSignOut = jest.fn(() => Promise.resolve({ error: null }));

jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: { signOut: (...args: unknown[]) => mockSignOut(...(args as [])) },
  },
}));
jest.mock("@/lib/localDataReset", () => ({ clearAllLocalUserData: jest.fn() }));
jest.mock("@/lib/photoStorage", () => ({ removeAllPhotos: jest.fn() }));

beforeEach(() => {
  mockInvoke.mockReset();
  mockSignOut.mockClear();
  (clearAllLocalUserData as jest.Mock).mockClear();
  (removeAllPhotos as jest.Mock).mockClear();
});

it("asks the server to delete, with explicit confirmation", async () => {
  mockInvoke.mockResolvedValue({ data: { deleted: true }, error: null });
  await deleteAccount();
  expect(mockInvoke).toHaveBeenCalledWith("delete-account", { body: { confirm: true } });
});

it("wipes the device and ends the session only after the server confirms", async () => {
  mockInvoke.mockResolvedValue({ data: { deleted: true }, error: null });
  await expect(deleteAccount()).resolves.toEqual({ ok: true });
  expect(clearAllLocalUserData).toHaveBeenCalledTimes(1);
  expect(removeAllPhotos).toHaveBeenCalledTimes(1);
  expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
});

it.each([
  ["a function error", { data: null, error: { message: "500" } }],
  ["an unconfirmed response", { data: { deleted: false }, error: null }],
  ["an empty response", { data: null, error: null }],
])("on %s: reports failure, wipes nothing, stays signed in", async (_label, response) => {
  mockInvoke.mockResolvedValue(response);
  const result = await deleteAccount();
  expect(result.ok).toBe(false);
  expect(clearAllLocalUserData).not.toHaveBeenCalled();
  expect(removeAllPhotos).not.toHaveBeenCalled();
  expect(mockSignOut).not.toHaveBeenCalled();
});

it("on a network exception: reports failure and wipes nothing", async () => {
  mockInvoke.mockRejectedValue(new Error("offline"));
  const result = await deleteAccount();
  expect(result).toEqual({ ok: false, error: expect.stringContaining("nothing was removed") });
  expect(clearAllLocalUserData).not.toHaveBeenCalled();
});
