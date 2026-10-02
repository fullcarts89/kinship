/**
 * Crash-report scrubbing (OBS-05)
 *
 * Kinship holds people's private notes about the people they love, so a
 * crash report may carry only what's needed to fix the crash: the error
 * type, a redacted message, stack frames, the release and coarse device
 * info. Everything else is dropped before an event leaves the phone.
 *
 * - No user (not even the id), no IP, no request bodies or headers, no
 *   extra/context blobs the app or libraries attach.
 * - Breadcrumbs are kept only for navigation (route shape, ids replaced)
 *   and HTTP (method, status and the URL path with ids replaced; no query).
 *   Console, UI and custom breadcrumbs, which can echo user text, are
 *   dropped.
 * - Error messages lose anything quoted, emails, phone numbers, URLs'
 *   queries and ids, and are capped at 200 characters.
 *
 * Pure functions, unit tested in src/platform/__tests__/crashScrubber.test.ts.
 */

export interface ScrubbableEvent {
  message?: string | { message?: string; formatted?: string };
  exception?: { values?: { type?: string; value?: string; stacktrace?: unknown; mechanism?: unknown }[] };
  breadcrumbs?: Breadcrumb[];
  user?: unknown;
  request?: unknown;
  extra?: unknown;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Breadcrumb {
  category?: string;
  type?: string;
  message?: string;
  level?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

const MAX_MESSAGE = 200;

const CONTEXT_ALLOWLIST: Record<string, string[]> = {
  os: ["name", "version", "build"],
  device: ["model", "family", "simulator"],
  app: ["app_version", "app_build"],
  runtime: ["name", "version"],
  react_native_context: ["js_engine"],
};
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL = /[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi;
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;
const QUOTED = /(["'`“‘])(?:(?!\1).){1,}\1/g;
const LOCAL_IDS = /\b[a-z]{1,2}-local-[\w-]+/gi;

/** Removes anything in an error message that could be user content. */
export function redactText(text: string): string {
  return text
    .replace(QUOTED, "[redacted]")
    .replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/gi, "$1")
    .replace(EMAIL, "[email]")
    .replace(UUID, ":id")
    .replace(LOCAL_IDS, ":id")
    .replace(PHONE, "[number]")
    .slice(0, MAX_MESSAGE);
}

function scrubPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(UUID, ":id");
  } catch {
    return url.split(/[?#]/)[0].replace(UUID, ":id").replace(LOCAL_IDS, ":id");
  }
}

function scrubBreadcrumb(b: Breadcrumb): Breadcrumb | null {
  const base = { category: b.category, type: b.type, level: b.level, timestamp: b.timestamp };
  if (b.category === "navigation") {
    const from = typeof b.data?.from === "string" ? scrubPath(b.data.from) : undefined;
    const to = typeof b.data?.to === "string" ? scrubPath(b.data.to) : undefined;
    return { ...base, data: { from, to } };
  }
  if (b.category === "xhr" || b.category === "fetch" || b.type === "http") {
    const d = b.data ?? {};
    return {
      ...base,
      data: {
        method: typeof d.method === "string" ? d.method : undefined,
        status_code: typeof d.status_code === "number" ? d.status_code : undefined,
        url: typeof d.url === "string" ? scrubPath(d.url) : undefined,
      },
    };
  }
  return null;
}

/** Sentry `beforeSend`: returns the event with only allowlisted, redacted data. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const out: ScrubbableEvent = { ...event };
  delete out.user;
  delete out.request;
  delete out.extra;
  delete out.server_name;

  // Keep only coarse device / runtime info. (A device's `name` is what the
  // owner called their phone, often their own name, so it never goes.)
  if (out.contexts) {
    const keep: Record<string, unknown> = {};
    for (const [key, fields] of Object.entries(CONTEXT_ALLOWLIST)) {
      const ctx = out.contexts[key] as Record<string, unknown> | undefined;
      if (!ctx) continue;
      keep[key] = Object.fromEntries(fields.filter((f) => f in ctx).map((f) => [f, ctx[f]]));
    }
    out.contexts = keep;
  }

  if (typeof out.message === "string") out.message = redactText(out.message);
  else if (out.message) {
    out.message = {
      message: out.message.message ? redactText(out.message.message) : undefined,
      formatted: out.message.formatted ? redactText(out.message.formatted) : undefined,
    };
  }

  if (out.exception?.values) {
    out.exception = {
      values: out.exception.values.map((v) => ({
        type: v.type,
        value: v.value ? redactText(v.value) : v.value,
        stacktrace: v.stacktrace,
        mechanism: v.mechanism,
      })),
    };
  }

  if (out.breadcrumbs) {
    out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb).filter((b): b is Breadcrumb => b !== null);
  }

  return out as T;
}

/** Sentry `beforeBreadcrumb`: drop at capture time too, so nothing lingers in memory. */
export function scrubBreadcrumbAtCapture(b: Breadcrumb): Breadcrumb | null {
  return scrubBreadcrumb(b);
}
