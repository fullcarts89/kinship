// P0-15: a picked photo is copied out of the picker's temporary cache into
// the app's document directory, under the account's folder, and that
// permanent path is what the app saves.
import { keepPickedPhoto, removePhotosExcept, removeAllPhotos } from "@/lib/photoStorage";
import { files } from "@/test-utils/memoryFileSystem";

jest.mock("expo-file-system", () => require("@/test-utils/memoryFileSystem"));
jest.mock("expo-crypto", () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});
const mockSession = { userId: "user-a" as string | null };
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mockSession.userId ? { user: { id: mockSession.userId } } : null },
        }),
    },
  },
}));

const PICKED = "cache/ImagePicker/ABC123.jpeg";

beforeEach(() => {
  files.clear();
  files.set(PICKED, "jpeg bytes");
  mockSession.userId = "user-a";
});

it("returns a URI under the document directory, in the account's folder", async () => {
  const uri = await keepPickedPhoto(PICKED);
  expect(uri).toMatch(/^doc\/photos\/user-a\/uuid-\d+\.jpeg$/);
  expect(files.get(uri!)).toBe("jpeg bytes");
});

it("the kept photo survives the OS clearing the picker cache", async () => {
  const uri = await keepPickedPhoto(PICKED);
  files.delete(PICKED);
  expect(files.has(uri!)).toBe(true);
});

it("returns null rather than a path that would break", async () => {
  await expect(keepPickedPhoto("cache/ImagePicker/gone.jpg")).resolves.toBeNull();
});

it("removePhotosExcept keeps only the given account's photos", async () => {
  const a = await keepPickedPhoto(PICKED);
  mockSession.userId = "user-b";
  const b = await keepPickedPhoto(PICKED);
  removePhotosExcept("user-b");
  expect(files.has(a!)).toBe(false);
  expect(files.has(b!)).toBe(true);
});

it("removeAllPhotos deletes every stored photo", async () => {
  const a = await keepPickedPhoto(PICKED);
  removeAllPhotos();
  expect(files.has(a!)).toBe(false);
});

it("every picker in the app keeps its photo before saving it", () => {
  const { execSync } = jest.requireActual<typeof import("child_process")>("child_process");
  const raw = execSync(`grep -rn "result.assets\\[0\\].uri" app src --include=*.tsx --include=*.ts || true`, {
    cwd: `${__dirname}/../../..`,
    encoding: "utf8",
  });
  const unkept = raw.split("\n").filter((l) => l && !l.includes("keepPickedPhoto(result.assets[0].uri)"));
  expect(unkept).toEqual([]);
});
