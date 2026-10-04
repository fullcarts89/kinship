// Domain repositories: the only write path screens and hooks use for 2.0
// data. They speak in Kinship terms (tell, remember, correct, retract) and
// keep the rules screens must never re-implement:
//   * versions are carried by UserStore (CA-3), never passed by callers;
//   * captured text is stored in NFC (CA-4);
//   * a memory's span is located from the exact evidence text, never from a
//     guessed offset; missing or ambiguous evidence is refused, not guessed;
//   * a correction adds a user_edit source and marks the item edited (§5);
//   * "Not this" retracts and removes (§5).

import { codePointLength, locateEvidence, utf16ToCodePoint } from "../../supabase/functions/_shared/spans";
import type { MirroredTable } from "./tables";
import { StoreWriteError, type Conflict, type Data, type UserStore } from "./userStore";

export type PersonState = "active" | "remembered" | "paused" | "archived";
export type CaptureSource =
  | "text" | "voice" | "share" | "screenshot" | "siri" | "widget"
  | "post_handoff" | "post_encounter" | "photo" | "onboarding";
export type MemoryKind =
  | "fact" | "event" | "promise" | "plan" | "thread" | "moment" | "milestone" | "tradition" | "context";
export type Channel = "text" | "call" | "facetime" | "whatsapp" | "email" | "in_person" | "other";

export interface Person extends Data {
  id: string;
  display_name: string;
  state: PersonState;
  birthday: string | null;
  birthday_source: "contacts" | "capture" | "user_edit" | null;
  version: number;
}

export interface Capture extends Data {
  id: string;
  source: CaptureSource;
  raw_text: string | null;
  context_person_id: string | null;
  occurred_at: string;
  status: string;
}

export interface MemoryItem extends Data {
  id: string;
  kind: MemoryKind;
  person_id: string;
  statement: string;
  detail: Data;
  certainty: string;
  status: string;
  user_state: string;
}

export interface MemorySource extends Data {
  id: string;
  memory_item_id: string;
  capture_id: string | null;
  source_kind: string;
  span_start: number | null;
  span_end: number | null;
}

/** Where a remembered item came from. */
export type Evidence =
  | { captureId: string; quote: string; near?: number }
  | { captureId: string; utf16Selection: { start: number; end: number } }
  | { userAuthored: true };

export class PeopleRepo {
  constructor(private readonly store: UserStore) {}

  list(): Promise<Person[]> {
    return this.store.list("people") as Promise<Person[]>;
  }

  get(id: string): Promise<Person | null> {
    return this.store.get("people", id) as Promise<Person | null>;
  }

  add(fields: { display_name: string; full_name?: string; relationship_label?: string }): Promise<Person> {
    return this.store.create("people", { state: "active", nicknames: [], ...fields }) as Promise<Person>;
  }

  update(id: string, patch: Partial<Pick<Person, "display_name" | "full_name" | "relationship_label">>): Promise<Data> {
    return this.store.update("people", id, patch);
  }

  /** D13: only the user sets remembered/paused, and both are reversible. */
  setState(id: string, state: PersonState): Promise<Data> {
    return this.store.update("people", id, { state });
  }

  /** CA-5: a birthday always says where it came from. */
  setBirthday(id: string, birthday: string | null, source: "contacts" | "user_edit" = "user_edit"): Promise<Data> {
    return this.store.update("people", id, {
      birthday, birthday_source: birthday ? source : null, birthday_capture_id: null,
    });
  }

  remove(id: string): Promise<void> {
    return this.store.remove("people", id);
  }

  /** The people close to someone ("Sarah's sister"), as the user named them. */
  related(personId?: string): Promise<RelatedPerson[]> {
    return this.store.list("related_people", personId ? { personId } : {}) as Promise<RelatedPerson[]>;
  }
}

export interface RelatedPerson extends Data {
  id: string;
  person_id: string;
  relation: string;
  name: string | null;
}

export class CaptureRepo {
  constructor(private readonly store: UserStore) {}

  /** Records exactly what the user said (NFC), queued for sync and, with AI on, for extraction. */
  tell(
    text: string,
    opts: { source?: CaptureSource; contextPersonId?: string; occurredAt?: string; timeZone?: string; aiEnabled: boolean },
  ): Promise<Capture> {
    const raw = text.normalize("NFC");
    if (!raw.trim()) throw new StoreWriteError("nothing to remember");
    if (codePointLength(raw) > 5000) throw new StoreWriteError("too long to keep as one note");
    return this.store.create("captures", {
      source: opts.source ?? "text",
      raw_text: raw,
      context_person_id: opts.contextPersonId ?? null,
      occurred_at: opts.occurredAt ?? this.store.now(),
      time_zone: opts.timeZone ?? null,
      status: opts.aiEnabled ? "pending" : "skipped",
    }) as Promise<Capture>;
  }

  list(personId?: string): Promise<Capture[]> {
    return this.store.list("captures", personId ? { personId } : {}) as Promise<Capture[]>;
  }

  get(id: string): Promise<Capture | null> {
    return this.store.get("captures", id) as Promise<Capture | null>;
  }

  remove(id: string): Promise<void> {
    return this.store.remove("captures", id);
  }
}

export class MemoryRepo {
  constructor(private readonly store: UserStore) {}

  forPerson(personId: string): Promise<MemoryItem[]> {
    return this.store.list("memory_items", { personId }) as Promise<MemoryItem[]>;
  }

  async sourcesFor(itemId: string): Promise<MemorySource[]> {
    const all = (await this.store.list("memory_item_sources")) as MemorySource[];
    return all.filter((s) => s.memory_item_id === itemId);
  }

  /** Remembers something the user said or wrote, with its provenance. */
  async remember(
    item: { kind: MemoryKind; person_id: string; statement: string; detail?: Data } & Data,
    evidence: Evidence,
  ): Promise<MemoryItem> {
    const source = await this.sourceFor(evidence);
    return this.store.createMemoryItem(
      { ...item, origin: "user", user_state: "user_authored" },
      [source],
    ) as Promise<MemoryItem>;
  }

  /** The user's correction wins, and says so (a user_edit source; plan §5). */
  async correct(id: string, patch: Partial<Pick<MemoryItem, "statement" | "detail" | "kind" | "person_id" | "certainty">>): Promise<Data> {
    const updated = await this.store.update("memory_items", id, { ...patch, user_state: "edited" });
    await this.store.create("memory_item_sources", { memory_item_id: id, source_kind: "user_edit" });
    return updated;
  }

  confirm(id: string): Promise<Data> {
    return this.store.update("memory_items", id, { user_state: "confirmed" });
  }

  /** "Not this": retracted and removed. */
  retract(id: string): Promise<Data> {
    return this.store.update("memory_items", id, { status: "retracted", deleted_at: this.store.now() });
  }

  private async sourceFor(evidence: Evidence): Promise<Data> {
    if ("userAuthored" in evidence) return { source_kind: "user_edit" };
    const capture = await this.store.get("captures", evidence.captureId);
    const text = capture?.raw_text as string | null | undefined;
    if (!text) throw new StoreWriteError("that note isn't available to cite");
    let span: { start: number; end: number };
    if ("quote" in evidence) {
      const found = locateEvidence(text, evidence.quote, evidence.near);
      if (!found.ok) throw new StoreWriteError(`evidence ${found.reason}: not saved rather than guessed`);
      span = found.span;
    } else {
      // A text selection from the UI arrives in UTF-16 units: convert, never reuse.
      span = {
        start: utf16ToCodePoint(text, evidence.utf16Selection.start),
        end: utf16ToCodePoint(text, evidence.utf16Selection.end),
      };
      if (span.end <= span.start) throw new StoreWriteError("empty selection");
    }
    return { capture_id: evidence.captureId, source_kind: "capture", span_start: span.start, span_end: span.end };
  }
}

export class ContactRepo {
  constructor(private readonly store: UserStore) {}

  /** Confirmed contact only: the return check's yes, a capture, or a manual entry. Never a hand-off alone. */
  async confirm(fields: {
    person_id: string;
    channel: Channel;
    source: "return_check" | "capture" | "manual" | "calendar_confirmed";
    reason_id?: string;
    capture_id?: string;
    occurred_at?: string;
  }): Promise<Data> {
    if (fields.source === "return_check" && !fields.reason_id) {
      throw new StoreWriteError("a return-check contact names its reason");
    }
    return this.store.create("contact_events", { occurred_at: this.store.now(), ...fields });
  }

  forPerson(personId: string): Promise<Data[]> {
    return this.store.list("contact_events", { personId });
  }
}

export class SettingsRepo {
  constructor(private readonly store: UserStore) {}

  get(): Promise<Data | null> {
    return this.store.get("user_settings", this.store.userId);
  }

  async update(patch: {
    time_zone?: string;
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
    push_enabled?: boolean;
    capture_retention_default?: "keep" | "delete_after_extraction";
  }): Promise<Data> {
    const current = await this.get();
    return current ? this.store.update("user_settings", this.store.userId, patch) : this.store.create("user_settings", patch);
  }
}

/** Changes that met a different change on another device, kept for the user to settle (Checkpoint B). */
export class ConflictRepo {
  constructor(private readonly store: UserStore) {}

  async forRow(table: MirroredTable, rowId: string): Promise<Conflict[]> {
    return (await this.store.conflicts()).filter((c) => c.tbl === table && c.row_id === rowId);
  }

  resolve(id: number, choice: "keep_current" | "use_mine"): Promise<void> {
    return this.store.resolveConflict(id, choice);
  }
}

export interface Repositories {
  people: PeopleRepo;
  captures: CaptureRepo;
  memory: MemoryRepo;
  contacts: ContactRepo;
  settings: SettingsRepo;
  conflicts: ConflictRepo;
}

export function repositoriesFor(store: UserStore): Repositories {
  return {
    people: new PeopleRepo(store),
    captures: new CaptureRepo(store),
    memory: new MemoryRepo(store),
    contacts: new ContactRepo(store),
    settings: new SettingsRepo(store),
    conflicts: new ConflictRepo(store),
  };
}
