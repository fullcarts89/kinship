# Semantic memory: refines, related and the composed view (investigation)

> **Status (founder, 8 Oct 2026, CC-19): direction APPROVED, with changes.** Where this file differs from the points below, they win. The build plan is `phase4-implementation-brief.md`.
> - **Residence first.** Semantic v1 is the residence facet only. Another structured domain comes only after residence is proven.
> - **Employer is not a single-valued slot.** Several current employers can be true at once: Meta and Google stay compatible unless the source states a change. A qualifier refines one employer. Employer is a later candidate; the `employer` slot, its qualifier columns and the employer rows of §6 are not built in v1.
> - **Candidate sets, no over-resolution.** A place stays a candidate set until it is genuinely resolved. Composition tests containment over the candidates without pinning one. Only a user's answer pins a place.
> - **History dates.** "Updated · Jan 4" is not used. A history line says "You told Kinship · Jan 4"; "Moved · Jan 4", "Started" or "Ended" appear only when the note itself gives the date.
> - **Place data.** A GeoNames-style subset, pending the founder's licence and attribution confirmation.
> - **The relation contract (§6), the inference policy (§7) and the no-graph decision (§14)** are approved. RELATED is an eval label only.


*8 Oct 2026. Investigation only. No code, schema, prompt or data changed. Everything below is a proposal that needs founder decisions (§14). Checked against the branch after the Gate 0 merge (PR #20): Gate 0 added no migrations and didn't change the merge / supersede logic.*

**Read for this:** the product contract; `approved-design-coverage.md`; `KINSHIP_2_DECISIONS.md` CC-16 to CC-18; `KINSHIP_2_COMPLETE_PLAN.md` §5, §6, §8, §9; `founder-feedback-4.md` (I7); `next-ux-proposals.md` (H15, H3); `relationship-page-rules.md`. Code: every v2 migration, `supabase/functions/_shared/extraction/` (`pipeline.ts` `relate`, `threads.ts`, `context.ts`, `types.ts`), prompt `relationship_extract/v6`, `src/features/person/`, `src/store/tables.ts` and `schema.ts`, and the eval corpus (`evals/extraction/fixtures/merge.jsonl`). Production was checked read-only through table metadata only: no user content was queried.

---

## 0. The answer in brief

- **The gap is real, but it isn't graph-shaped. It's slot-shaped.** Nearly every dogfood case is about a few *single-valued* things about a person: where they live, where they work, maybe their school. In those slots, values form a known hierarchy (Alameda is inside California; a team is inside Meta). Kinship has no way to say "more specific and still true", so today every such pair is either "replaces" or "unrelated".
- **Today `SUPERSEDES` is the only way to say two memories are linked.** California → Alameda gets stored as a move that never happened, or as two lines. Once I7 / H15 makes superseded lines *visible* as Background history, that becomes a visible false statement: "Previously lived in California".
- **Recommendation:** stay in Postgres. Leave original memory rows untouched. Add three things:
  1. a small, read-only **place reference** table;
  2. a derived, rebuildable **structured reading per memory item** ("facets": slot, the user's words for the value, the resolved place or candidates);
  3. a **deterministic comparator** for slotted facts that tells `SAME`, `REFINES`, `SUPERSEDES` and `CONFLICT` apart.

  Refinement is **computed, never stored**. Supersession stays a stored decision, extended so it can close more than one item. The composed line ("Lives in Alameda, California") is a **view**, built only from the user's own words, and it points back to every source.
- **Principles:**
  - *Persist decisions that change state; compute readings that don't.*
  - *Compose only what the user said.*
  - *When unsure, fall back to separate lines, never a merge.*
- **`RELATED` is not an edge.** It's an eval label and a retrieval-time notion with the same write effect as `NEW`. Kinship should not store "related" links.
- **Before H15?** Yes, the core of it. Phase 4 needs the contract change, two slots (residence, employer), the composer and the evals, because I7 exposes wrong supersessions. Typed family edges, Ask retrieval and everything else wait for Alpha. **A graph database isn't justified** now or on any visible horizon.

---

## 1. Current model

### 1.1 What exists

| Layer | Table / code | Relevant facts |
|---|---|---|
| Observation | `captures` | Raw text, never rewritten (trigger); NFC; purge-only |
| Belief | `memory_items` | One row per belief. Fields: `kind` (9 kinds); `person_id`; `subject_type` person / related / user / shared; `statement`; typed `detail` jsonb validated by `memory_detail_ok`; `certainty`; `sensitivity`; `status` active / resolved / superseded / expired / retracted; `user_state`; `valid_from` / `valid_to`; **one** `supersedes_id`; `with_person_ids` (≤7) |
| Provenance | `memory_item_sources` | Capture span (code points) plus a ≤200-character quote. A deferred constraint makes every live item need a live source |
| History | `memory_item_history` | Snapshot before every meaningful change; feeds Undo |
| People | `people`, `related_people`, `person_identities` | Relationship to the *user*: `people.relationship_label` (free text, set only when stated, H17). Third parties: `related_people(person_id, relation text, name, promoted_person_id)` |
| Derived | `reasons` + `reason_evidence` | Suppressed when evidence is superseded, retracted, expired or deleted |
| Device | `mirror` (SQLCipher) | Generic JSON mirror of 9 tables (`src/store/tables.ts`). A new mirrored table costs a spec entry plus RLS, not a schema rewrite |

**Fact detail today:** `category` (family / work / home / health / interest / preference / pet / other); `attribute` and `value` "in the note's words", kept only if grounded in the note (`pipeline.ts` ~l.875); dates (C.1); `transition`. Nothing is normalised. "California" and "Alameda" are just strings, and nothing knows one contains the other.

**Nothing for retrieval exists:** no full-text index, no `pg_trgm`, no `pgvector` (all available on Supabase, none installed). Ask is unbuilt (coverage #22).

**Production (table metadata only, 8 Oct):** 27 people, 124 memory items, 138 sources, 115 captures, 29 history rows, 3 related people. Any backfill is trivially small.

### 1.2 The comparison contract today

The model proposes `existing.action ∈ {new, merge, supersede, resolves}` (prompt v6). Code decides (`relate` → `relateByModel`, `threads.ts`; re-checked in SQL by `write_extraction`):

| Outcome | When code accepts it | Effect |
|---|---|---|
| `merge` | Same kind, same certainty rank, same person / subject; events: same type, dates ±3 days. Also deterministic same-day event dedupe and the H13 shared-twin merge | A new source on the existing item. **Its statement and detail are unchanged** |
| `supersede` | Firm (stated / planned) and certainty ≥ target; kinds compatible (`SUPERSEDE_FROM`); facts only within the same `category`; across kinds only for `cancelled` / `completed` transitions. Never onto a user-edited or user-written item (`protected_target`) | New item with `supersedes_id`; the old one becomes `superseded`, with `valid_to = today` for facts; reasons suppressed; Undo / Not this restores it (`v2_restore_superseded`) |
| `resolves` | Firm, and the target is an active thread | The thread becomes `resolved`. If a transition is detected it becomes a supersede instead (H25) |
| transition (`threads.ts`) | Regex for cancelled / progress / completed, plus word overlap with exactly one live item. Two equal candidates → `update_check` ("Does this replace one of these?" / "No, keep both") | Supersede plus `detail.transition` |
| `already_known` | A relationship said again (H17) | Dropped, shown as "Already known" |
| `new` | Anything else, and every doubtful case | New item |

**Display:**
- Superseded items never appear on the portrait or in What Kinship knows.
- They survive only as "was: ~~…~~" / "Before: …" under the newer line, and as "Since updated" in the Source view.
- That's the I7 gap.

### 1.3 The dogfood examples, today

| Case | What happens today | Problem |
|---|---|---|
| California → Alameda | Both are `fact` / home. Prompt v6 defines supersede as "a firm new statement replaces an older one", and `relateByModel` lets fact supersede fact in the same category. If the model proposes supersede: "Susan lives in Alameda", "Replaces: ~~Susan lives in California~~". If it proposes new: two current lines | **No outcome is right.** One records a move that didn't happen; the other is two redundant lines. Nobody composes "Alameda, California" |
| Alameda → California | Supersede: specificity lost ("lives in California, was Alameda": a false move). Merge: the Alameda line keeps its words and gets a source quoting "California". New: two lines | Merge is the least bad, but the Source view then cites "lives in California" as support for "lives in Alameda" |
| Alameda → Colorado | Supersede, if the model proposes it | Correct. With I7 it becomes "Previously lived in Alameda" (correct) |
| Meta → Finance Data Strategy at Meta | Probably supersede ("was: works at Meta"), or merge (the team is lost from the line but kept in the source), or two lines | Supersede implies a job change |
| Italian food → carbonara | Probably new | Correct. A merge or supersede would be a wrong merge; nothing guards against it specifically |
| Box interview → rejection | Supersede with transition (H25), held for privacy | Correct. Display is I7 |
| Planning → cancellation | Supersede `cancelled`, across kinds (G38, merge-046) | Correct |
| Michelle is Susan's sister + Michelle lives in Denver | Both in People: a fact on one of them, `with_person_ids` the other; Denver on Michelle. Michelle not in People: a `related_people` row on Susan; Denver as `subject_type = related` | Correct (related by identity, nothing merged). But there's **no typed person↔person edge** when both are in People; the kinship is only in a sentence |

**Eval coverage:**
- The 46 `merge` fixtures have **no refinement case at all**.
- The nearest is merge-033 (Logan Square → Pilsen), a real move between sibling neighbourhoods, correctly a supersede.
- So the current behaviour for California → Alameda is untested and depends entirely on the model.

### 1.4 What the model can't express

1. **"More specific and still true."** The only link is `supersedes_id`, and it means "no longer true".
2. **Change vs correction.** "Actually she lives in Oakland, not Alameda" and "She moved to Oakland" both become supersede. Under I7 the first would show a false "Previously lived in Alameda".
3. **Containment.** No place or organisation knowledge, so no hierarchy to reason with.
4. **Closing more than one item.** One `supersedes_id`. If California and Alameda were both current, "moved to Colorado" can close only one.
5. **Single-valued slots.** Nothing says "where Susan lives" has one current value, so contradictions are only caught when the model happens to propose supersede.
6. **Typed person↔person relations** between two People, other than a sentence.

---

## 2. Product requirement

Dogfood shows Kinship needs to tell **compatible-and-more-specific** apart from **replacement**, and to show **one current understanding** made from several sourced observations. The specific capabilities:

1. **R1. One current truth per slot.** Where someone lives or works reads as one line, made of everything the user said that is still true ("Lives in Alameda, California").
2. **R2. Order independence.** "California, then Alameda" and "Alameda, then California" end in the same view. Specificity is never lost.
3. **R3. Real history only.** A replaced value becomes Background history only when it was true and then changed: never for a refinement, never for a correction.
4. **R4. Traceable composition.** A composed line points to every observation behind it. Correcting or removing any one of them changes the line predictably and reversibly.
5. **R5. Related but not merged.** Memories that share a person or topic stay separate lines, and nothing merges them.
6. **R6. Grounded recall (Alpha).** Answer "Who lives in California?", "Who do I know at Meta?", "Who are Susan's siblings?" from sourced memory, without a general graph.

What dogfood does **not** show a need for: arbitrary entity–entity edges, inferred associations, a taxonomy of interests, multi-hop traversal, or a general knowledge base.

---

## 3. Options

| | 1. Extend the relational model (new status + pointer) | 2. Typed item↔item edge table (all relations, persisted) | 3. Structured JSON in `memory_items.detail` | 4. Derived facet table + computed relations | 5. Graph database |
|---|---|---|---|---|---|
| **Shape** | Add status `refined` and a `refined_by` pointer, mirroring `supersedes_id`; the general item stops being "active" | `memory_links(from, to, type ∈ {refines, related, supersedes, …}, basis)`, written at extraction | `detail.slot`, `detail.place` on facts; relations computed at read time | `memory_item_facets` (one structured reading per item, rebuildable) plus a `places` reference table; refinement computed; supersession stays a stored decision | Neo4j / Neptune / AGE alongside Postgres |
| **Provenance** | Good (pointer + sources) | Each edge needs its own provenance and lifecycle | Good, but derivation is mixed into extraction output | Good: facets record rule, reference version, decided-by; relations derive from sourced items | A second store to keep provenance in sync with |
| **Temporal truth** | One active item per slot, but status now mixes "true" with "shown" | Edges go stale when either end changes | Computed, so always current | Computed, so always current; state changes only through supersession | Must reproduce validity and undo |
| **Correction** | Needs "un-refine" restore triggers, much like supersede | Every correction must find and fix edges | Recomputes for free, but re-deriving rewrites user rows | Recomputes for free; an edit invalidates one facet row | Cross-store propagation |
| **Original rows untouched** | No (general item changes status) | Yes | No (backfill rewrites `detail` and bumps versions) | **Yes** | Yes |
| **Device / offline** | Works | One more mirrored table | Works | One more mirrored table (generic mirror) | Not on device |
| **Ask** | Weak (no place knowledge) | Edges help only if dense | Needs JSON queries | Slot / place / org queries are plain SQL | Strong, but overkill |
| **Becomes a graph?** | No | **Yes**: invites `related_to` | No | No (closed vocabulary in CHECKs) | **Yes, by construction** |
| **Complexity** | S–M | M, growing | S, but fragile | M | L, plus a new processor and a new RLS model |

Rejected:
- **2:** stored `related` edges drift, and they're the first step to the generic graph.
- **5:** see §14.
- **1:** it overloads `status`. "Refined" items are still true, and Ask and Today need status to mean truth.
- **3** is close to the recommendation but rewrites user rows to backfill and to change resolver versions.

---

## 4. Recommendation

**Option 4, with option 1's existing supersession machinery extended rather than replaced.**

1. **Observations stay authoritative.** `captures` → `memory_items` → `memory_item_sources` are unchanged. No existing row is rewritten to add structure.
2. **Structured understanding is a derived layer:**
   - one facet row per slotted item: the slot, the user's words for the value, and a resolved place (or candidates) from deterministic reference data;
   - stamped with the rule and dataset version;
   - droppable and rebuildable at any time.
3. **Relations between items are computed, not stored,** with one exception: supersession, which already changes state and needs Undo.
   - `REFINES` and `SAME` are readings of two items' facets.
   - `RELATED` exists only at retrieval time.
4. **The composed current view is a pure function:**
   - one shared TypeScript module, like `threads.ts` and `voice.ts`, already shared by gateway and app;
   - used by What Kinship knows, the portrait's de-duplication, the extraction dossier and, later, Ask.
5. **Narrow scope.**
   - Phase 4: two slots, `residence` and `employer`.
   - Everything else stays natural-language memory exactly as today.

**Design principles (proposed as rules):**
- **Persist decisions, compute readings.** A stored link exists only where it changes state (supersession) or records the user's answer.
- **Compose only what was said.** A composed line contains only words from its member observations (plus fixed template words such as "Lives in"). Reference data may *relate* two observations; it never adds a word the user didn't say. Kinship never shows "Alameda, California" because of a gazetteer.
- **Fail open to separate lines.** When the comparator is unsure, both observations stay as separate true lines (today's behaviour). Composition is a presentation gain; its failure mode must never be a wrong merge.
- **The model proposes, code decides** (unchanged). For slotted facts the deterministic comparator overrides the model's `existing.action`. **No prompt change is needed for Phase 4.**

**Precedent:** Gate 0's I12 fix (`supabase/functions/_shared/extraction/names.ts`) already works this way. A deterministic read-time function shows a person's current name in their memories; nothing stored is rewritten, and Source keeps the note's own words. The composed view applies the same pattern to slot values.

---

## 5. Data model (conceptual)

### 5.1 Unchanged
`captures`, `memory_items` (every existing column and meaning), `memory_item_sources`, `memory_item_history`, `people`, `related_people`, `reasons`. `status = active` keeps meaning **believed true now**, so a refined general item stays active.

### 5.2 New or extended (Phase 4)

**A. `places`: reference data, global, read-only, not user data**

| Field | Meaning |
|---|---|
| `place_ref` | Stable external id (e.g. a GeoNames id) |
| `name`, `alt_names` | Including common abbreviations (CA, NYC) from a small curated alias list |
| `level` | country · region (state / province) · county · city |
| `parent_ref`, `ancestors[]` | Containment, precomputed |
| `prominence` | Only to *withhold* composition when a name's compatible reading isn't its usual one (§5.4); never shown, never used to add anything |
| `dataset_version` | e.g. `places-2026.10` |

- **Size:** countries + first-level regions + cities of about 15,000 people or more is roughly 30,000 rows, a few MB.
- No geometry or coordinates, no neighbourhoods in v1.
- Server-only: not mirrored to the phone.
- **Licensing** (e.g. GeoNames CC BY attribution) is a founder / legal check. A hand-curated smaller table (countries, US states, larger US cities) is the alternative.

**B. `memory_item_facets`: the structured reading of one item (derived, mirrored)**

| Field | Meaning |
|---|---|
| `memory_item_id`, `user_id` | One row per item and slot; the owner's RLS, like `memory_items` |
| `slot` | Closed CHECK vocabulary: `residence`, `employer` (Phase 4) |
| `value_text` | The user's own words for the value ("Alameda"), from the grounded `detail.value` / evidence span |
| `value_norm` | Case- and accent-folded; employers without "Inc", "LLC" |
| `qualifier_text`, `qualifier_kind` | Employer only: team or role **stated in the same sentence** ("Finance Data Strategy" at Meta) |
| `place_ref` | Set only when resolution is unambiguous, or pinned by the user's own context |
| `place_candidates[]` | When ambiguous: each `{ref, ancestors[]}` (≤5). Lets "Alameda" be pinned later by "California" |
| `ancestors[]` | Of `place_ref`, so the phone can test containment without the places table |
| `decided_by`, `rule_version` | `rule` (resolver plus dataset version) or `user` (a pin from the user's answer, with its `user_edit` source) |
| `deleted_at`, `version` | Standard sync columns. An edit to the item's words, person, subject or kind tombstones the facet; it's re-derived server-side |

Facets exist only for items that are:
- `kind = fact`;
- subject `person` or `related`;
- not shared (`with_person_ids` empty: §13);
- certainty `stated`;
- worded as a current state: "lives in / moved to / is based in / lives at" for residence; "works at / for / joined / is a … at" for employer;
- grounded with exactly one value.

Never slotted: "staying in", "visiting", "is in Denver until Sunday", "grew up in", "used to live in" (that one is history, §8), anything hedged or reported.

**C. Supersession can close more than one item (extension)**
- The superseding item keeps `supersedes_id` (the most specific item it replaces) and also records **the other items it closed**: a short list on the new row, so original rows aren't touched.
- The apply and restore triggers walk the list. Undo of the superseding note restores every item it closed.
- Each closed item is re-checked server-side like `supersedes_id` today: same person and subject, not protected, live.

**D. `detail.transition` gains `corrected`.** It means "the earlier item was never right" ("actually Oakland, not Alameda"). A corrected item is never Background history (R3). Absent still means a plain change.

### 5.3 Computed, never stored

| Reading | Definition |
|---|---|
| `refines(a, b)` | All must hold:<ul><li>same `person_id`, `subject_type`, related person and `slot`;</li><li>both active;</li><li>same certainty;</li><li>neither shared;</li><li>and one of: *residence:* `b.place_ref ∈ a.ancestors` (or a's usual reading is among its candidates under b, §5.4); *employer:* `a.value_norm = b.value_norm` and a has a qualifier that b lacks.</li></ul> |
| `same(a, b)` | Same slot, same place ref or same normalised value and qualifier. (`merge`, as today.) |
| `incompatible(a, b)` | Same slot, both resolved, and neither contains the other (Alameda vs Oakland; Alameda vs Colorado; Meta vs Google) |
| **Composed line** | For one person and slot: the current *chain*, ordered most → least specific. Rendered from a template plus the user's words, deduplicated by place ref:<ul><li>"Lives in Alameda, California";</li><li>"Works in Finance Data Strategy at Meta";</li><li>past: "Previously lived in Alameda, California".</li></ul>It carries member item ids, the union of their sources, the basis (rule plus dataset version) and the validity window |
| Inverse relations (Alpha) | parent ⇔ child, sibling ⇔ sibling, partner ⇔ partner, at query time |

### 5.4 Design case: the minimum to compose "Alameda, California" safely

**The minimum representation:**
1. Two items, each with its own source (exists today).
2. On each, a `residence` facet with the user's words, plus a place ref or candidate set with ancestors, from versioned reference data.
3. A containment test, computed.
4. Guards:
   - same person, subject and slot;
   - both current;
   - same certainty;
   - no conflicting change cue;
   - the compatible reading is the name's usual reading.
5. A render rule that uses only member words.

No edge, no model call, no stored "Alameda, California".

**Order 1: "California" (Sep), then "Alameda" (Oct).**
- "California" resolves to the region.
- "Alameda" has candidates (the California city, the California county, places elsewhere). Readings inside the current residence (California) exist, and the name's usual reading, the city, is one of them. It's pinned to that, the most specific compatible reading.
- There's no change cue against it. "Moved to Alameda" still fits: she can move within California.
- So: `REFINES`. Facet pinned with `decided_by = rule`, context `places-…`. Both items stay active.
- Composed: **"Lives in Alameda, California"**, from 2 notes.

**Order 2: "Alameda" (Sep), then "California" (Oct).**
- "Alameda" stays unresolved, with candidates; alone it composes nothing and shows "Lives in Alameda".
- "California" contains the Alameda candidate inside California.
- No change cue, and that reading is the usual one, so: `REFINES` (the new item is the general one). The Alameda facet is pinned. Nothing is superseded.
- Same composed line, same sources. Specificity kept.
- **With a change cue** ("Susan lives in California now", "moved to California"): the new value is *more general* than a current value it contains. That's the one shape where Kinship can't tell "still in Alameda" from "moved elsewhere in California". `CONFLICT`: one question ("Is Susan still in Alameda?" · Still there / She moved). Rare, and it decides what's shown as current.

**Guards against invented geography:**
- **Usual reading only.** "Paris", then "Texas": the only compatible reading (Paris, Texas) isn't the name's usual one. So no composition: two separate lines, or the change-cue question above.
- **Unknown names stay unresolved.** "the Bay Area", neighbourhoods, and anything the table lacks don't compose. They fall back to today's behaviour, and a "moved" cue still supersedes, so merge-033 is unaffected.
- **The model never resolves places.** It only copies the words, as it does for dates (C.1).
- **Kinship never asks** "which Alameda?" just to get structure. An ambiguous place simply doesn't compose.

---

## 6. Memory relation contract

Applies to a new item **N** and an existing live item **E** about the **same person and the same subject** (person vs related vs shared, and the same related person). Across people or subjects the outcome is always `NEW` (unchanged rule). Never onto a user-edited or user-written item except `REFINES`, which changes nothing on E.

| Outcome | Precise definition | Write effect | Display |
|---|---|---|---|
| **SAME** | N asserts nothing E doesn't, and E asserts nothing N doesn't: same slot value, or same event / fact at the same time and certainty | N's span becomes another source on E (today's `merge`) | One line, "from 2 notes"; "Already known" in the Kept card where relevant |
| **REFINES** | N and E can both be true now, are about the same single-valued slot (Phase 4: residence, employer), have the same certainty, and one is strictly more specific along a supported dimension (place containment; a team or role stated *with* the same employer). Direction is by specificity, not by time | New item; **E untouched**; nothing stored between them (computed from facets) | One composed line; both sources |
| **SUPERSEDES** | N and E can't both be true now, N is firm and at least as certain as E, and N is about now. `transition` gives the kind of change: plain change (default) · progress · completed · cancelled · **corrected** | New item; E (and every other incompatible current item in the slot) superseded, history kept, reasons suppressed, Undo restores all | Current line; E as Background history **unless** `corrected`, sensitive-declined or transient (§9) |
| **RELATED** | Same person (or the person and their related person), overlapping topic, compatible, neither entails nor replaces the other, and no shared single-valued slot. *Italian food / carbonara; robotics / building a robot with his son; Michelle is Susan's sister / Michelle lives in Denver* | **Same as NEW.** No link stored | Separate lines, each in its own H15 section, newest first. No grouping by inferred topic |
| **CONFLICT (ask)** | N and E can't both be true, or might not be, and the note doesn't settle which is current; a wrong guess would show something false as current. Cases:<ol><li>two equally good targets (today's `update_check`);</li><li>an incompatible slot value against a **protected** E;</li><li>a more general value with a change cue (§5.4).</li></ol> | N held (`capture_reviews`), one question. The answer is stored as the user's decision (pin or supersede, with a `user_edit` source). Dismissed: E stays current; N isn't memory; the note is kept | The existing one-question surface; no new screen |
| **NEW** | None of the above, **or the comparator is unsure** | New item | Separate line (today) |

**Decision order:** SAME → SUPERSEDES (transition) → REFINES → CONFLICT → NEW. Every guard that exists today stays:
- a hedge never updates;
- certainty is never upgraded;
- never across subjects;
- protected items are never silently changed.

**Applied to the brief's examples:**

| Existing → new | Outcome | Current view / history |
|---|---|---|
| Susan lives in California → Susan lives in Alameda | REFINES | "Lives in Alameda, California" (2 notes) |
| Susan lives in Alameda → Susan lives in Colorado | SUPERSEDES | "Lives in Colorado" · history "Previously lived in Alameda" |
| Ben works at Meta → Ben works in Finance Data Strategy at Meta | REFINES. Evidence needed: an employer facet on both, equal normalised employer, and a team qualifier grounded **in the same sentence** as "Meta" | "Works in Finance Data Strategy at Meta" |
| Ben works at Meta → Ben works in finance (no employer) | RELATED: different facets; never composed into "finance at Meta" | Two lines |
| Ben likes Italian food → Ben loves carbonara | RELATED (no cuisine taxonomy; Tier 4) | Two lines under Into |
| Natalia is interviewing with Box → was rejected by Box | SUPERSEDES (completed / ended), as today | Background "Previously interviewed with Box · Ended Oct 6" (I7) |
| Ben is learning robotics → wants to build a robot with his son | RELATED | Into + the aspiration section |
| Michelle is Susan's sister → Michelle lives in Denver | RELATED through person identity (Michelle), nothing merged | Michelle's page: Denver; Susan's Their people: Michelle |

**Event and plan refinement** ("in October" → "October 11"; "skiing sometime" → "Tahoe Feb 18") stays on today's paths, `merge` and plan→event supersede. Making the merge keep the more precise date (plan §5 says it should; `write_extraction` doesn't) is a separate small fix, not part of this model.

---

## 7. Inference policy

| Tier | Example | Persist? | Use | Display |
|---|---|---|---|---|
| **1. Deterministic / canonical** | Alameda ⊂ California; parent ⇔ child; date arithmetic | Reference data only (`places`), versioned; resolution recorded on the facet | To relate two observations; Ask filters | **Never adds words.** Only explains why two user statements appear as one |
| **2. Explicit, user-stated** | "Michelle is Susan's sister"; "Susan lives in Alameda" | Yes: the sourced memory item, plus its facet or (Alpha) a typed relation | Everywhere | As said |
| **3. Safe structured interpretation** | "Works on Finance Data Strategy at Meta" refines "works at Meta"; a residence statement changes the residence slot | Facets: yes (derived, rebuildable). Supersession: yes (a decision, with its rule). Refinement: **no, computed** | Comparator, composer, dossier | Composed lines, history lines |
| **4. Broad association** | basketball → sports; carbonara → Italian; robotics → "likes building things"; "probably knows"; "might like" | **Never** | Never for memory, Today, reasons or display. Ask (Alpha) may at most use similarity to *find* candidate memories, then answers only with what they say, cited. Itself a founder decision at Alpha | Never |

**Always prohibited, whatever the tier:**
- inferring residence from events ("wedding in Austin");
- employer from mentions;
- family from shared surnames;
- transitive kin (a sister's husband as brother-in-law);
- gender from names;
- composing across facets from different notes;
- closeness, frequency or importance from anything (rule 3).

**The vocabulary, decided type by type** (the brief's candidates):

| Candidate | Decision | Why |
|---|---|---|
| `lives_in` | **Phase 4**, as the `residence` slot | Single-valued, hierarchical, dogfood evidence, Ask value |
| `located_in` | **Reference data**, never user memory | Tier 1 |
| `works_at` | **Phase 4**, as the `employer` slot, with team / role qualifiers only when stated with it | Single-valued in practice; Meta case; Ask |
| `attends` | **Alpha** (`school` slot, same mechanics) | Kids' schools are common, but there's no dogfood case yet |
| `works_on` | **Natural language** | Projects aren't single-valued and have no hierarchy |
| `spouse_of`, `partner_of`, `parent_of`, `child_of`, `sibling_of` | **Alpha**, as a closed `relation_type` on `related_people` (`partner` · `parent` · `child` · `sibling` · `other`, keeping the user's own word), with the evidence item; People↔People via `promoted_person_id`. Only ever when stated; inverses computed | Ask ("Susan's siblings"), H15 labels. Only explicit statements (Tier 2), so deterministically checkable against the note, as `statedSelfRelations` does today |
| `pet_of` | **No new type**: `fact.category = pet` already types it | Already structured |
| `shared_with`, `participant_in` | **Existing** `with_person_ids` and `contact_events` | Don't duplicate |
| `supersedes` | **Existing**, extended to close several items, plus `corrected` | State change; needs Undo |
| `refines` | **Computed** | A reading, not a decision |
| `source` | **Existing** `memory_item_sources` | — |
| `related_to_event` | **No** | No need shown |
| `related_to`, `similar_to`, `might_like`, `probably_connected_to` | **Prohibited** | Tier 4; the generic graph |

**Who decides:**

| Decision | Deterministic | Model | Notes |
|---|---|---|---|
| Is this a residence / employer statement? | Yes: wording patterns on the grounded evidence | No | The model's `category` / `attribute` / `value` are hints only; disagreement means no facet (fail open) |
| Which place? | Yes: reference lookup, context pin, prominence guard | Never | As dates (C.1) |
| SAME / REFINES / SUPERSEDES / CONFLICT for slotted facts | Yes | Advisory only (`existing.action` ignored for slotted facts) | Code over model, as today |
| Change vs correction vs history | Wording cues ("moved", "now", "actually", "not X", "used to", "grew up") | The model's proposal accepted only when code agrees | Unsure means NEW |
| Everything unslotted | As today | As today | Unchanged |

---

## 8. Provenance and correction

### 8.1 A composed statement points to every source
- **A composed line is a view, not a memory item.** It's never stored, never fed back to the model as a fact, and never a reason's evidence by itself (plan §6: "never durable without provenance").
- **It carries its member items, and through them every source.** The Source view for "Lives in Alameda, California" lists both notes, newest first:
  - "You told Kinship · Oct 2: *Susan lives in Alameda*";
  - "Sep 3: *Susan lives in California*".

  Each note keeps its own Edit and Not this.
- **No ontology on screen.** "Alameda is in California" is never shown as a fact. The two notes are the explanation.
- **Correction acts on observations, never on the composed line.** "Edit" on a composed line opens its member lines ("Which part is off? · Alameda · California"); the exact sheet is a build-time detail within existing patterns.
- **Derived readings have provenance too:**
  - a facet records which item it reads, the rule and dataset version, and whether the user pinned it (with that `user_edit` source);
  - a supersession records the superseding item (whose own source is the note), its transition, and the items it closed;
  - a computed refinement is fully explained by two facets and a dataset version, so it can always be recomputed and audited.

### 8.2 Temporal walk-through

| | Items (status) | Current view | History (What Kinship knows › Background) |
|---|---|---|---|
| Sep: "Susan lives in California" | A active | Lives in California | — |
| Oct: "Susan lives in Alameda" | A active, B active (B refines A: computed) | **Lives in Alameda, California** (A + B) | — |
| Jan: "Susan moved to Colorado" | C active; **B and A superseded** (C replaces B and closes A); `valid_to` set | **Lives in Colorado** | **Previously lived in Alameda, California** (A + B) |
| Undo Jan | A, B restored; C gone | Lives in Alameda, California | — |
| Alt. Nov: "Susan moved to Oakland" | D active; B superseded; **A stays active** (Oakland ⊂ California) | Lives in Oakland, California (D + A) | Previously lived in Alameda |

**Rules:**
- **Invariant.** For each person, subject and slot, the current items are pairwise compatible: one chain. The comparator enforces it at write time, tests check it, and if it's ever broken the composer degrades to separate lines (never a merged line) and counts it in content-free telemetry.
- **Validity.** `valid_from` is the date the fact itself carries (the note's own date words) or, failing that, the day it was told. Displayed dates come **only** from the note's own date words. A history line never says "until Jan" just because Kinship was told in January; it uses the told date phrased as an update ("Updated · Jan 4"). The I7 example "Ended · Oct 6" fits events, where the telling is the ending. Exact wording is a founder question.

### 8.3 How corrections propagate

| Change | Items | Facets | Composed view |
|---|---|---|---|
| Undo the Alameda note (B) | B deleted (capture cascade) | B's facet gone | "Lives in California": **nothing to restore**, because A never changed |
| Not this on B | B retracted | Tombstoned | Same |
| Not this on A | A retracted | — | "Lives in Alameda". The California qualifier disappears with its only source |
| Edit B's words to "Oakland" | B edited (the user's edit wins) | Facet tombstoned, then re-derived from the edited words | "Oakland, California", or two lines if it can't be resolved. Between edit and re-derivation: two lines (fail open) |
| Subject correction (I13): B was about Michelle | B moves person | Facet follows the item | Susan: "Lives in California"; Michelle: "Lives in Alameda". Cross-person never relates |
| Supersession (Colorado) | B and A superseded | Unchanged | History group |
| Undo the supersession | Every closed item restored | — | Back as it was |
| Identity merge (two Susans) | Items move | Facets follow | Recomputed over the merged set; an incompatible pair becomes one `CONFLICT` question, never a silent pick |
| Person removed (I3, archive) | Archived with the person | — | Gone with them; restorable |
| Capture with other sources deleted | Item keeps its other sources | — | Unchanged |
| Rename (I12) | — | — | Unaffected (structure uses ids, not names) |
| Place data updated | — | Rebuilt under the new version; a diff report | Recomputed |
| Wrong supersession found later (§11) | Repair only under the cleanup plan, with the founder's yes | — | — |

---

## 9. H15 impact

The model is H15's foundation for **Background**, not a new surface. No approved surface changes shape; the effects below are entered in `approved-design-coverage.md` when built.

**What Kinship knows › Background:**

```
Background
Lives in Alameda, California
  From 2 notes · Oct 2
Works in Finance Data Strategy at Meta
  From 2 notes · Sep 20
Previously lived in Austin
  You told Kinship · Aug 12
Previously interviewed with Box
  Ended · Oct 6
```

- **Current per slot:** one composed line (residence, then employer), from the shared composer. Never "Lives in California" and "Lives in Alameda" as two lines.
- **History (I7)** comes from superseded items or explicit past-tense notes ("Susan used to live in Austin": `NEW`, already past, slot history, never current).

A superseded item is **eligible** for history only when all of these hold:
1. It was true and changed: its superseder's transition is a change, completed or cancelled, **not `corrected`**.
2. It isn't retracted or deleted.
3. It isn't a declined sensitive outcome. Per I7, the less sensitive predecessor may stay: "interviewed with Box" without the rejection.
4. It's durable context: slots, work and home facts, completed or cancelled life threads (interviews, moves, plans).

Transient health progress chains (a knee bothering him → better) and refinements are **never** history.

- **Order:** current first, then history, newest change first. No counts, no "3 places lived".
- **Portrait (unchanged sections).** Lately de-duplicates refinements: shows "Susan lives in Alameda", never also "Susan lives in California". It shows the head's own statement, not a rewritten line, so the approved Portrait reads exactly as now.
- **Into / aspirations / Their people / Between you:** RELATED items stay separate lines in their own section by existing kind and category rules. No topic grouping, no inferred links between Italian food and carbonara, or robotics and the robot with his son.
- **Their people:** related people and shared memories as approved. Typed labels ("Michelle · sister") for People↔People need the Alpha relation type; until then, the user's own words from `related_people.relation` or the stated line.
- **I7 templates:** for slots the history wording is deterministic ("Previously lived in …", "Previously worked at …"). For non-slotted history (Box), a past-tense line needs either a fixed template per transition ("Previously {topic} · Ended {date}" from the thread's topic words) or the original statement plus "Ended · Oct 6". A model rewrite is **not** proposed.

---

## 10. Ask Kinship compatibility (Alpha, not designed here)

| Question | Structured (facets / typed relations / filters) | Retrieval over natural language | Grounding |
|---|---|---|---|
| Who lives in California? | Current `residence` facets whose `place_ref` or `ancestors` include California, plus unresolved facets whose words say "California". **Impossible without Tier 1** (Alameda-only people) | — | Cite each person's residence note(s); the answer says "Susan · Alameda", not "Susan · California" |
| Who lives in Alameda? | Exact place ref or words; current only ("used to" excluded unless asked) | — | Cited |
| Who do I know at Meta? | Current `employer` facets, normalised "Meta" | Keyword over statements for unslotted mentions ("Ben's wife works at Meta": subject related, so the answer is "Ben's wife"); people with `relationship_label` / `related_people` unaffected | Cited; never "probably" |
| Who are Susan's siblings? | Alpha relation type: `related_people` on Susan with `sibling`, plus inverse rows on others | — | Cited; unnamed sibling: "a brother (name not known)" |
| What does Ben like doing? | Ben's items in `interest` / `preference`, moments, traditions | Selection within one person's items (≤30, plan §9 `retrieval_answer`) | Answers only what items say; no "so he likes sports" (Tier 4) |
| What do Ben and I do together? | `subject_type = shared`; moments, traditions, context, plans; `contact_events` / the I2 trail | Selection | Cited; never counts or frequency |

At personal scale (production today: 124 items; a heavy user a few thousand), SQL filters plus per-person selection are enough. Full-text or trigram search is the first step if recall falls short. Embeddings are **not** needed and would add a new processor (a D2 disclosure change). Nothing here requires multi-hop traversal.

---

## 11. Migration plan (high level, not written)

All additive and forward-only. No existing memory row is rewritten. Everything is reversible by dropping the new tables and column and redeploying the previous gateway.

| Step | What | Complexity |
|---|---|---|
| 1 | `places` reference table plus loader (versioned dataset; alias list for CA / NYC etc.); pgTAP for containment | M (data selection and licensing dominate) |
| 2 | `memory_item_facets` (RLS, sync columns, CHECK vocabularies); add to the device mirror (`tables.ts`, pull order) | S |
| 3 | Superseding item can close several items (column on new rows); extend the apply, restore and reason-suppression paths; `transition` gains `corrected` in `memory_detail_ok` | M (triggers plus pgTAP; restore must be exact) |
| 4 | Deterministic resolver, slot detector and comparator (shared TS like `threads.ts`); `write_extraction` writes facets and closed lists atomically; SQL re-checks identity and protection only | M |
| 5 | Facet invalidation on edit / person / kind / retract (trigger tombstones), plus server re-derivation (gateway endpoint after sync, or the worker) | S–M |
| 6 | Shared composer; What Kinship knows (H15) and portrait de-duplication; dossier uses composed slots | M (rides on H15) |
| 7 | **Backfill as a dry run first:**<ul><li>derive facets for existing facts (124 items in production today);</li><li>write a content-free report: how many would compose, how many current supersessions are actually refinements, how many are ambiguous.</li></ul>Then founder review; then write facets | S |
| 8 | **Existing wrong supersessions** (e.g. California superseded by Alameda): **not repaired automatically.** Listed in the report. Any restore is a forward migration or RPC under `data-cleanup-plan.md` rules, only on the founder's explicit yes | — |

No prompt change. No paid eval required for Phase 4 (the comparator is deterministic and runs in oracle, realistic and replay modes). One live smoke run is recommended before dogfood, by the founder's label.

---

## 12. Eval plan

**A new fixture set `relate`** (frozen into `MANIFEST.json` with a deliberate re-freeze), plus **scenario proofs**: multi-note sequences through the real pipeline, write rules, sync and views, in the style of `memoryProofs.test.ts`. Both run free in CI.

Fixtures carry:
- an expected **relation** label (SAME / NEW / SUPERSEDES / REFINES / RELATED / CONFLICT);
- the expected **current view** and **history** lines;
- the expected **source set** per line;
- `must_not` patterns.

**Corpus (minimum, each with its mirror or trap):**

| # | Sequence | Expected |
|---|---|---|
| 1 | California → Alameda | REFINES; "Lives in Alameda, California"; sources {1, 2} |
| 2 | Alameda → California | REFINES; same view; must_not supersede |
| 3 | Alameda → "moved to Colorado" | SUPERSEDES; history "Alameda" |
| 4 | California → Alameda → Colorado; then Undo | Both closed; one history line; Undo restores the composed line exactly |
| 5 | California → Alameda → "moved to Oakland" | Supersede Alameda only; "Oakland, California" |
| 6 | Alameda → "actually Oakland, not Alameda" | SUPERSEDES `corrected`; must_not "Previously lived in Alameda" |
| 7 | Alameda → "grew up in Austin" / "used to live in Austin" | NEW / NEW-history; current unchanged |
| 8 | Paris → Texas | must_not compose "Paris, Texas"; NEW or CONFLICT |
| 9 | Alameda → "California now" | CONFLICT (one question); must_not silent supersede |
| 10 | Alameda → "the Bay Area" | NEW; no composition |
| 11 | "Dan's in Denver until Sunday" with residence Alameda | Event; must_not touch residence |
| 12 | Logan Square → "moved to Pilsen" (merge-033) | SUPERSEDES (fallback path, regression) |
| 13 | Meta → Finance Data Strategy at Meta | REFINES; "Works in Finance Data Strategy at Meta" |
| 14 | Meta → Google ("joined Google") | SUPERSEDES; history "Previously worked at Meta" |
| 15 | Meta (user-edited) → Google | CONFLICT; must_not two current employers |
| 16 | "works in finance" + "works at Meta" | RELATED; must_not "finance at Meta" |
| 17 | "Ben's wife works at Meta" | NEW (related subject); must_not change Ben's employer |
| 18 | Italian food → carbonara | RELATED; must_not merge or supersede |
| 19 | carbonara → "doesn't like Italian food anymore" | Supersede Italian only; must_not touch carbonara |
| 20 | Robotics → robot with his son | RELATED; both kept |
| 21 | "Michelle is Susan's sister" + "Michelle lives in Denver" (both in People; and Michelle not in People) | RELATED by identity; must_not "Susan lives in Denver" |
| 22 | Box interviewing → rejected (confirmed; declined) | SUPERSEDES; history with / without the outcome |
| 23 | Planning to move → "not moving anymore" | SUPERSEDES `cancelled`; must_not history "lived in" |
| 24 | "might move to Colorado" → "might move to Denver" | NEW or REFINES; must_not supersede; certainty stays tentative |
| 25 | "moving to Colorado in June" → "might move to Denver" | must_not compose (would upgrade certainty) |
| 26 | "I think Susan moved to Denver" vs Alameda | NEW thread; must_not supersede |
| 27 | Alameda filed to the wrong Susan, then the subject corrected | Views move with the item |
| 28 | "Josh and Nadia live in Denver" → "Josh moved to Austin" | must_not change Nadia; no composition on the shared item |
| 29 | "Susan lives in Alameda, CA" in one note | One item; view as said (no "CA, California") |

**Metrics** (each separately, zero tolerance where marked; the existing thresholds are unchanged):

| Metric | Definition | Threshold (proposed) |
|---|---|---|
| Incorrect supersession | SUPERSEDES where SAME / REFINES / RELATED / NEW expected | **0** |
| Wrong merge | SAME where anything else expected | **0** |
| Incorrect refinement | REFINES (or a composed line) where it wasn't expected | **0** |
| Missed refinement | NEW where REFINES expected | Tracked; ≥ 0.8 recall (fails safe: two lines) |
| Unsupported derived fact | A composed or history line with a word not in a member's source (beyond template words), or a Tier-1 name the user didn't say | **0** |
| Lost provenance | A displayed line whose source set ≠ the union of its members' sources; any line without a source | **0** |
| Temporal contradiction | Two incompatible current values; a superseded value shown as current; a corrected item shown as history; Undo not restoring the exact prior view | **0** |
| Certainty change via composition | Any | **0** |

---

## 13. Risks and failure modes

| Risk | Consequence | Guard |
|---|---|---|
| Wrong supersession, made visible by I7 | A false "Previously lived in …" on Background | REFINES / `corrected`; history eligibility rules; zero-tolerance eval |
| Wrong place reading | A false composed detail | Never display unsaid names; usual-reading guard; ambiguous names don't compose; the model never resolves places |
| Slotting a temporary stay or a visit | A trip supersedes where someone lives | Narrow wording patterns; "until / staying / visiting / in town" never slot; fixture 11 |
| Correction mistaken for a change | False history | `corrected` cues; when unsure, no history line |
| Change mistaken for refinement | A real move hidden ("moved to California" while in Alameda) | Change cue plus a more general value → CONFLICT, never silent |
| Shared items (two people, one residence) | One person's move closes the other's | No facets on shared items in v1; fixture 28 |
| Two implementations drifting (TS and SQL) | Inconsistent writes | Semantics only in TS; SQL re-checks identity, protection and status, as today |
| Stale facet on the phone | Wrong composition offline | Edits tombstone facets; a missing facet means separate lines |
| A Today Moment from a wrong move (H16 "move" / "new home") | A wrong congratulation | Milestones only from explicit move wording, never from slot supersession |
| Machinery leaking into the UI | Ontology terms, "inferred" badges | Source view lists notes only; no hierarchy statements; no confidence |
| Scope creep into a graph | Maintenance; inference risk | Closed vocabularies in CHECKs; a new slot or relation type needs a founder decision and its own eval fixtures; RELATED never stored |
| Reference data licensing / updates | Attribution duty; churn | Founder / legal check; versioned dataset; rebuild-and-diff |
| Quantification creep | "Lived in 3 cities", "4 notes" | No counts beyond the existing "from 2 notes" provenance phrasing (already approved) |
| Extra work on corrections | Latency | Personal scale; recomputation is per person and slot |

---

## 14. Decision

**Do we need this before H15 is built?** **Yes, the core.**
- H15's Background, with I7 folded in, is the first surface that *shows* superseded items as history. Today's contract can only say "replaces", so building H15 on it would turn every refinement the model calls a supersession into a visible false statement ("Previously lived in California").
- The other path, two current lines, is exactly the redundancy H15 exists to remove.
- So the contract change and the composer are H15's foundation, not an add-on.

**Phase 4 infrastructure (with H15 / I7):**
1. The contract: SAME / REFINES / SUPERSEDES (with `corrected`) / CONFLICT / NEW, with RELATED as an eval label.
2. `places` (small, versioned), `memory_item_facets` for **residence and employer**, the deterministic resolver and comparator.
3. Supersession that closes several items, with exact Undo.
4. The shared composer for What Kinship knows (current plus history), portrait de-duplication and the dossier.
5. History eligibility rules for I7.
6. The `relate` eval set and scenario proofs at zero tolerance.
7. A backfill dry-run report.

**Wait until Alpha:**
- typed family relations (`relation_type`, People↔People via `promoted_person_id`);
- Ask retrieval and `retrieval_answer`;
- school and hometown slots;
- planned-move destinations;
- employer aliases (Facebook / Meta);
- full-text search if Ask recall needs it;
- event date-precision merge.

**Never (without new evidence and a founder decision):**
- stored RELATED / `similar_to` / `might_like` edges;
- Tier 4 inference;
- embeddings for inference;
- a general entity graph.

**Is a true graph database justified now? No.**
- The data is small (124 items in production; thousands for a heavy user).
- Traversal is at most one hop over user data. Place containment is precomputed ancestry, and the rest are filters.
- A second store would duplicate RLS, provenance triggers, deletion, export and the offline mirror, and add a processor that holds user content. This project's available Postgres extensions (checked 8 Oct) include no graph engine.
- Postgres recursive queries cover everything foreseeable.
- **Revisit only if** Ask needs multi-hop traversal over user-stated relations at query time, at a scale where SQL demonstrably fails. Nothing on the roadmap does.

### Questions for the founder
1. **Approve the contract and principles?** REFINES and `corrected`; RELATED as a label only; "persist decisions, compute readings"; "compose only what was said"; "fail open to separate lines".
2. **Phase 4 slots:** residence and employer (recommended), or residence only?
3. **Reference data:** a GeoNames-style subset (attribution required) or a small hand-curated table?
4. **Wording:** "Lives in Alameda, California" in What Kinship knows, and the history date: "Updated · Jan 4" (told date) unless the note gave its own date.
5. **The CONFLICT question** for a protected item or a more general value with a change cue ("Is Susan still in Alameda?" · Still there / She moved). One question, rare. Approve the case list?
6. **Portrait de-duplication** (no new surface; the head line only). Record it under H15 in the coverage doc?
7. **Existing wrong supersessions in production:** report only; repair only under the cleanup plan with your explicit yes.
