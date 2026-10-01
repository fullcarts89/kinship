// OBS-05: crash reports carry what's needed to fix a crash and nothing a
// user wrote, nor who they are.
import { redactText, scrubEvent, scrubBreadcrumbAtCapture } from "@/platform/crashScrubber";

const NOTE = "Maya's biopsy came back, she is scared";
const UID = "3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b";

const event = {
  event_id: "e1",
  release: "kinship@1.0.0",
  user: { id: UID, email: "thor@example.com", ip_address: "1.2.3.4" },
  request: { url: "https://x", data: NOTE },
  extra: { memory: NOTE },
  server_name: "Thor's iPhone",
  contexts: {
    os: { name: "iOS", version: "18.0" },
    device: { model: "iPhone16,1", name: "Thor's iPhone" },
    state: { person: { name: "Maya", notes: NOTE } },
  },
  exception: {
    values: [
      {
        type: "TypeError",
        value: `Cannot read "${NOTE}" for thor@example.com at +1 (415) 555-0100 person ${UID}`,
        stacktrace: { frames: [{ filename: "app:///index.bundle", lineno: 1 }] },
      },
    ],
  },
  breadcrumbs: [
    { category: "console", message: `saving note: ${NOTE}` },
    { category: "ui.click", message: "Text: Maya Chen" },
    { category: "navigation", data: { from: `/person/${UID}`, to: `/memory/${UID}?note=${encodeURIComponent(NOTE)}` } },
    { type: "http", category: "fetch", data: { method: "POST", status_code: 500, url: `https://x.supabase.co/rest/v1/persons?id=eq.${UID}`, body: NOTE } },
    { category: "app.custom", message: NOTE, data: { note: NOTE } },
  ],
};

const out = scrubEvent(structuredClone(event));
const serialized = JSON.stringify(out);

it("drops the user, request, extra blobs and device name", () => {
  expect(out.user).toBeUndefined();
  expect(out.request).toBeUndefined();
  expect(out.extra).toBeUndefined();
  expect(out.server_name).toBeUndefined();
  expect(serialized).not.toContain("Thor");
  expect(serialized).not.toContain("1.2.3.4");
});

it("never carries user text, names, emails, phone numbers or ids", () => {
  for (const leak of ["biopsy", "scared", "Maya", "thor@example.com", "555-0100", UID]) {
    expect(serialized).not.toContain(leak);
  }
});

it("keeps what's needed to fix the crash", () => {
  const ex = out.exception!.values![0];
  expect(ex.type).toBe("TypeError");
  expect(ex.value).toMatch(/^Cannot read \[redacted\] for \[email\] at \[number\] person :id$/);
  expect(ex.stacktrace).toEqual(event.exception.values[0].stacktrace);
  expect(out.release).toBe("kinship@1.0.0");
  expect(out.contexts).toEqual({
    os: { name: "iOS", version: "18.0" },
    device: { model: "iPhone16,1" },
  });
});

it("keeps only navigation and HTTP breadcrumbs, without ids or queries", () => {
  expect(out.breadcrumbs).toEqual([
    expect.objectContaining({ category: "navigation", data: { from: "/person/:id", to: "/memory/:id" } }),
    expect.objectContaining({
      category: "fetch",
      data: { method: "POST", status_code: 500, url: "https://x.supabase.co/rest/v1/persons" },
    }),
  ]);
});

it("drops console, UI and custom breadcrumbs at capture time", () => {
  expect(scrubBreadcrumbAtCapture({ category: "console", message: NOTE })).toBeNull();
  expect(scrubBreadcrumbAtCapture({ category: "ui.click", message: "Maya" })).toBeNull();
});

it("caps messages at 200 characters", () => {
  expect(redactText("x".repeat(500))).toHaveLength(200);
});
