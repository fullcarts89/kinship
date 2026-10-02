// In-memory stand-in for expo-file-system's File/Directory/Paths, for tests.
// Use: jest.mock("expo-file-system", () => require("@/test-utils/memoryFileSystem"));
export const files = new Map<string, string>();

type Part = string | { uri: string };
const join = (parts: Part[]) =>
  parts
    .map((p) => (typeof p === "string" ? p : p.uri))
    .join("/")
    .replace(/\/+/g, "/");

export class File {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get exists() {
    return files.has(this.uri);
  }
  get name() {
    return this.uri.split("/").pop() ?? "";
  }
  get extension() {
    const m = this.name.match(/\.[^.]+$/);
    return m ? m[0] : "";
  }
  write(text: string) {
    files.set(this.uri, text);
  }
  text() {
    return Promise.resolve(files.get(this.uri) ?? "");
  }
  copy(dest: File) {
    if (!files.has(this.uri)) throw new Error(`no such file: ${this.uri}`);
    files.set(dest.uri, files.get(this.uri)!);
  }
  delete() {
    files.delete(this.uri);
  }
}

export class Directory {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get name() {
    return this.uri.split("/").pop() ?? "";
  }
  get exists() {
    return [...files.keys()].some((k) => k.startsWith(this.uri + "/"));
  }
  create() {}
  list(): (File | Directory)[] {
    const children = new Map<string, File | Directory>();
    for (const k of files.keys()) {
      if (!k.startsWith(this.uri + "/")) continue;
      const rest = k.slice(this.uri.length + 1).split("/");
      const child = `${this.uri}/${rest[0]}`;
      children.set(child, rest.length > 1 ? new Directory(child) : new File(child));
    }
    return [...children.values()];
  }
  delete() {
    for (const k of [...files.keys()]) if (k.startsWith(this.uri + "/")) files.delete(k);
  }
}

export const Paths = { document: { uri: "doc" }, cache: { uri: "cache" } };
