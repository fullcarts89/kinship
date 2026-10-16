# Phase 4 implementation brief

*8 Oct 2026. **APPROVED by the founder (CC-20)**, with changes now folded in:*
- *history needs evidence of a change (§8, §11, §15);*
- *N8 comes first (§18);*
- *the decisions are recorded (§19).*

*Decisions: `KINSHIP_2_DECISIONS.md` CC-19 and CC-20. Background: `semantic-memory-investigation.md` (approved with changes; CC-19 and CC-20 win where they differ). Code reviewed at `main` = `609be4a`.*

**Already done:**
- Gate 0 closure recorded (ledger, CC-19, coverage, handoff, checklist).
- Ledger rows N6–N8 added from this review.
- I4 built (4A step 1).

**Next:**
- **Phase 4A** continues in the order of §17.
- **Phase 4B** has begun, with N8 first (§18). The report-only checkpoint (§14) comes before any facet is written for an existing line.

---

## 0. First: ai-gateway was not redeployed

- Production ai-gateway is **version 7**, deployed 7 Oct 20:41 UTC. Its files are byte-identical to the PR #21 code (`5c551b9`); I checked by comparing the deployed source with git. The migration `20261008090000` **is** applied.
- **What that means:**
  - PR #22's server half wasn't running during your gate: J1, J4's guard repair, J11, I12 for new lines (no per-line mentions written), and I13's answer path.
  - The ledger keeps those **FIXED**, not VERIFIED. VERIFIED: J2, J5–J9 and G5, plus I12's existing lines and J4's copy.
- **Since the merge, notes were understood by the old server:**
  - a line it dropped is not in memory (the note itself is kept);
  - lines written since have no mention record, so they read as written.
- **To do:**
  1. Redeploy from `main`. Before starting Claude Code, export the token in Terminal with `export SUPABASE_ACCESS_TOKEN=` (the token pasted straight after the `=`); Claude Code then runs the deploy (`phase4-native-checklist.md`, step 1). Never paste it in chat; delete it in Supabase afterwards.
  2. Re-run gate rows **1b, 2, 2b, 3, 5, 5b, 11, 11b**.

  The app build is fine as it is; this is a server-only step.

---

## 1. Exact schema additions

### 4A: one small migration, for I2 (step 5; held with this review)

`v2_interaction_trail`, additive.

| Change | Why |
|---|---|
| `contact_events.memory_item_id uuid NULL`; FK `(memory_item_id, user_id)` → `memory_items` `ON DELETE SET NULL (memory_item_id)`; mirrored, app-writable | What the conversation was about ("About …"). Today `Handoff.about` lives in one overwritten phone slot and is lost |
| `contact_events.moment_type text NULL`, CHECK ∈ `birthday, good_news, starts_today, milestone, upcoming_event, event_followup` | Content-free: which kind of Moment led to it (a birthday has no memory item) |
| `channel` CHECK + `video` | Manual "Video" isn't necessarily FaceTime |
| The CHECK `source <> 'return_check' OR reason_id IS NOT NULL` becomes `… OR reason_id IS NOT NULL OR moment_type IS NOT NULL` | A Yes to a phone-made Moment is a return check. Today it's mislabelled `manual` |
| `reason_events_apply`: `return_not_yet` puts an `acted` reason back to `surfaced` while its window is open | N6: "Not yet" must let the reason speak again after a sync |

### 4B: one migration after your review (`v2_residence_facets`), additive

**A. `memory_item_facets`:** derived and rebuildable; written by the server; pulled to the phone.

| Column | Type / rule | Meaning |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, owner FK, `ON DELETE CASCADE` | RLS: owner may **read** only. No insert, update or delete for `authenticated` |
| `memory_item_id` | uuid; FK `(memory_item_id, user_id)` → `memory_items` `ON DELETE CASCADE` | The observation it reads |
| `slot` | text, CHECK ∈ `residence` | v1 has one slot. Another needs a founder decision plus fixtures |
| `value_text` | text, 1–100 chars | **The note's own characters** for the place ("Alameda, CA"), never the model's |
| `value_norm` | text | Case-, accent- and punctuation-folded, for SAME |
| `place_ref` | text NULL | Set **only** when resolved: one reading in the data, a qualifier in the same note ("Alameda, CA"), or the user's answer |
| `candidates` | jsonb, CHECK array of ≤ 5 `{ref, level, ancestors[]}` | Readings while unresolved. Empty = not in the place data |
| `usual_ref` | text NULL | The name's usual reading, when one clearly dominates (§7) |
| `decided_by` | text, CHECK ∈ `rule, user` | |
| `rule_version`, `dataset_version` | text, text NULL | e.g. `residence/v1`, `places-2026.10` |
| `created_at`, `updated_at`, `deleted_at`, `version` | standard | Sync columns. `v2_row_guard`; index `(user_id, updated_at, id)`; partial unique `(memory_item_id, slot) WHERE deleted_at IS NULL` |

**B. `memory_items`, two new columns.** Both are server-written: they're left out of the app's UPDATE grant, and the insert policy requires them empty.
- `closes_ids uuid[] NOT NULL DEFAULT '{}'`, with CHECK cardinality ≤ 8, never its own id, and never containing `supersedes_id`. These are the *other* current items a superseding item closed (multi-item closure).
- `resolves_id uuid NULL`, FK `(resolves_id, user_id)` → `memory_items` `ON DELETE SET NULL`. This is the thread a `resolves` closed; Undo can't restore it today (N8).
  - **It ships first, in its own migration `v2_exact_undo` (B0, CC-20)**, together with the restore and the `reasons_refresh` reopening.

**C. `memory_detail_ok`:** `transition` gains `corrected` and `changed`.
- `changed` means an explicit change cue, or the user's "She moved".
- No transition means "replaced as current truth only".
- See §11 for which of these can become history.

**D. Triggers:**
- *apply*: closes every `closes_ids` item as `supersedes_id` does today. The checks are the same: same person, subject and related person; live; active or resolved; not a loop.
- *restore*: when the closer leaves, it also restores each `closes_ids` item and `resolves_id`.
  - "Still replaced by something live" now also looks in other items' `closes_ids`.
- *facet tombstone*: tombstones the item's facet when a fact's words, person, subject, related person, kind, certainty, sensitivity or `with_person_ids` change, or when it is deleted or retracted. A superseded item keeps its facet (history needs it).

**E. RPCs:**
- `write_extraction` and `resolve_capture_review` accept, per item, `facets` and `closes`, and re-check them as targets are re-checked today. A doubtful id is dropped (fail open), never an error.
- `write_facets(p_user_id, p_items)` is the gateway-only path for re-derivation and the approved backfill.
- `reasons_refresh` reopens a `suppressed` reason whose key is produced again while its window is open (N8: Undo brings back the Moment).

**F. Server-only tables (no content):**
- `residence_backfill_report(memory_item_id, bucket, rule_version, dataset_version, created_at)`;
- `semantic_runs(user_id, mode, rule_version, dataset_version, ran_at)`.

**G. Device mirror:** `memory_item_facets` is added to `src/store/tables.ts` as pull only. `closes_ids` and `resolves_id` ride the existing `memory_items` mirror.

**Not in the database:** the place data (§6).

---

## 2. No existing column changes meaning

| Column | Stays |
|---|---|
| `memory_items.status` | `active` = believed true now. A refined general item stays `active`. `superseded` = replaced by a real change *or a correction*; the closer's transition says which |
| `memory_items.supersedes_id` | The one (most specific) item replaced. Extra closures go only in the new `closes_ids` |
| `detail.transition` | `progress`, `completed`, `cancelled` unchanged; `corrected` and `changed` are only added. A missing transition keeps its meaning ("replaced"), and is now explicitly **not** history (CC-20) |
| `valid_to` | Still set on supersession to the day Kinship learned it, and still **never displayed** as when something ended (§11) |
| `detail.category`, `kind`, `subject_type`, `certainty`, `sensitivity`, `with_person_ids`, `person_mentions` | Unchanged. The taxonomy is computed from them (§3) |
| `memory_item_sources`, `memory_item_history`, `captures`, `people`, `related_people`, `reasons` | Unchanged |
| `contact_events.channel`, `source` (4A) | Values only added. `return_check` keeps its meaning and is now also allowed for a Moment made on the phone |

Neither migration updates an existing user row. Facets for existing items are written only after you approve the dry run (§14).

---

## 3. Taxonomy: mapping, computed and never stored

`categories.ts` is shared by the app and the gateway. It's a pure function of the existing fields plus small fixed word lists matched on the **source quote** (the user's words). It's closed: the model never labels anything. **First match wins.** It never fails: the last rule catches everything.

| # | When | Category | H15 section |
|---|---|---|---|
| 1 | subject `shared` or `user`; kind `context`, `tradition`, `moment`; any `promise` | SHARED / BETWEEN YOU | Between you |
| 2 | subject `related`; fact category `family` or `pet`; `with_person_ids` non-empty | THEIR PEOPLE | Their people |
| 3 | certainty `wished`; `event_goal` set; or desire words in the quote (wants to, hoping to, would love to, dreams of, trying to, working towards) | ASPIRATIONS | Hoping to |
| 4 | fact category `interest` | INTERESTS / HOBBIES | Into |
| 5 | fact category `preference` | PREFERENCES | Into |
| 6 | fact category `work`; event `interview`, `job_start`; work words in the quote (job, works at, hired, promoted, company, retired…) | WORK | Background |
| 7 | event `school_start`, `exam`; education words (graduated, college, university, studies, degree, majoring, class of…) | EDUCATION | Background |
| 8 | a residence facet; fact category `home`; event `move` | BACKGROUND (residence) | Background |
| 9 | kind `plan`; event `trip`, `other` | ASPIRATIONS / PLANS (plain) | Plans |
| 10 | everything else (category `other`, `health`; life events; milestones; threads) | OTHER → shown in Background | Background |

**Notes on the rules:**
- **HEALTH / SENSITIVE** stays the existing `sensitivity` field, not a heading. A sensitive line sits in its topical section, and every existing sensitivity rule is unchanged: held for a yes, never on Today, never in reasons.
- **Order of Hoping to vs Into.** Rule 3 comes before rule 4 on purpose: "wants to learn pottery" is Hoping to, while "loves pottery" is Into. Ordinary plans never go under Hoping to (CC-17).
- **What is never inferred:**
  - interests stay natural language (no carbonara → Italian, no basketball → sports);
  - no family role from a surname, no gender from a name, no transitive relations.
- **Placement is open to change.** A wrong section never alters, hides or deletes the line: it is still the same line, with its source, Edit and Not this.

**As built (B1, `d4db346`).** The rules above, in that order, with two tightenings. Both only make the word lists fire less often:
- **Words need both sides.** A word list counts only when the user's own words say it and the line as kept says it too. The user's own words are the note's quotes, plus the line itself when the user wrote or edited it. This is the same evidence rule as H16's milestones.
  - A quote can carry a neighbouring line's words: "Susan loves pottery and wants to run a marathon" must not put "Susan loves pottery" under Hoping to.
  - A phrasing the user didn't use never makes Hoping to (CC-17).
- **Plans and events are placed by their fields.** Kind and event type decide; the work and education word lists don't apply to them. So an ordinary plan that mentions a boss or a school stays in Plans ("ordinary plans → Plans").
- **Never fails.** An event with no type counts as `other`, and an unknown kind lands in Background.
- **Evals.** 44 cases in `evals/semantic/fixtures/categories.json`, including the founder's twelve. They run free in CI with the invariants: frozen input, closed output, and independent of sensitivity, status and supersession.
- **Not shown yet.** Nothing displays a category until B8.

---

## 4. H15: What Kinship knows, the proposed sections

**The order:**
1. **Background:**
   - the current residence first, as **one composed line** ("Lives in Alameda, California", §9);
   - then work, then education, then the rest, newest first;
   - then quiet **Before** history (§11).
   - Work and Education get their own headings only if density warrants it after dogfood.
2. **Into.**
3. **Hoping to.**
4. **Plans:** CC-17 left this label to the build ("ordinary plans stay neutral").
5. **Their people:** related people as "Michelle · sister", from `related_people`, plus their lines; shared memories with other people.
6. **Between you.**

**Rules:**
- Empty sections disappear.
- No grid, counts, completeness, progress, missing-info prompts or checklists.
- Every line keeps its provenance, Edit and Not this, and newest comes first.

**Rendering:**
- **A line drops the person's leading name and keeps the rest of the user's words.**
  - "Susan works at Meta" → "Works at Meta".
  - The rule fires only when the line's mention record puts this person's name first, followed by a lowercase verb that isn't "and" or "or".
  - Otherwise the line shows unchanged ("Susan and Mike live in Alameda").
- **Into keeps the verb:** "Loves pottery", not "Pottery".
  - Approved Into holds "things they like or don't". Dropping the verb would turn "Doesn't like skiing" into "Skiing".
  - Your example's short form ("Pottery") would need words the user didn't put that way.
- **The Portrait keeps its sections.** Its only change is de-duplication (§13).

---

## 5. Residence facet: derivation rules

The derivation is deterministic, server-side and versioned (`residence/v1`) in `supabase/functions/_shared/semantic/residence.ts`. The model contributes nothing to it.

**When an item gets a facet.** All of these must hold:
- kind `fact`; subject `person` or `related`; certainty `stated`; `sensitivity = none`;
- `with_person_ids` empty: no facets on shared lines in v1;
- the **source quote** (the user's words) says a current residence.

**Wording that counts as a current residence:**
- lives in, living in, is based in, resides in;
- moved to, has moved to, relocated to;
- lives in … now, now lives in.

**Never a residence** (the line stays as written; no facet):
- staying, visiting, in town, until, this week / weekend / month, for the summer, on a trip;
- grew up, used to live, lived in, is from, was born in;
- is moving / planning to move / might move (a plan, which stays a plan);
- doesn't live in, no longer lives in (unchanged behaviour);
- reported or hedged (certainty other than `stated`);
- an address.

**The value:**
- It is the place phrase after the verb, cut at punctuation, "and", "with", "since", "for" or a time phrase.
- It is taken **from the note's own characters**, never from `detail.value`. The grounding check ignores words of two letters or fewer, so a model "CA" could slip through.
- A trailing ", <place>" belongs to the value ("Alameda, CA"; "Paris, Texas"). It may resolve the first part (§7).

**Resolution:**
- The phrase (or each part of it) is looked up by folded name and curated alias.
- Readings are kept as `candidates` (≤ 5, by population).
- More than 5 means "too many": the facet keeps the words only.
- A name not in the data keeps the words only. It can still be SAME and still be moved away from, but it never composes.
- **The model never resolves a place.**

**Re-derivation:**
- **On the server:** a changed line has its facet tombstoned at once (§1 D). The gateway derives it again when the app reports the edit (a model-free task; it needs no AI consent, since no processor is involved).
- **As a safety net:** the next Tell about that person re-derives any eligible line missing a facet.
- **On the phone, in between:** the line has no facet and shows as its own line (fail open).

---

## 6. Place data: source and attribution

| | |
|---|---|
| **Source (proposed)** | GeoNames: `countryInfo.txt` (≈250), `admin1CodesASCII.txt` (first-level regions, ≈3,900) and `cities15000` (cities of about 15,000 people or more, ≈26,000; includes Alameda CA and Paris TX). Name, ASCII name, admin-1, country and population only |
| **Not included** | Alternate names in bulk, geometry, coordinates, counties, neighbourhoods, postal codes |
| **Aliases** | A curated, reviewed list (`aliases.json`): CA, NYC, SF, LA, DC, UK, US / USA, and other common ones. Each alias maps to one ref |
| **Form** | A generated, versioned JSON (`places-2026.10.json`, about 2 MB). It lives with the gateway (`_shared/semantic/places/`) and is **never shipped in the app**. It's built by `scripts/semantic/build-places.ts` from pinned dumps, so it can be rebuilt and diffed |
| **Licence** | GeoNames is **CC BY 4.0**: attribution required, commercial use allowed |
| **Attribution** | "Place data from GeoNames (geonames.org), CC BY 4.0", in `THIRD_PARTY_NOTICES.md` and in Settings › About. The text shown to users is always the user's own words, never GeoNames names |
| **Public-domain alternative** | Natural Earth (admin-0/1) plus the US Census Gazetteer (US places). No attribution duty, but thinner outside the US |

Shipping this needs your licence confirmation (§19.1).

---

## 7. Ambiguity and candidate sets

**Readings:**
- A facet has either a **reading** (`place_ref`) or **candidates**.
- Its **usual reading** (`usual_ref`) is the candidate with at least 5× the population of the next one, or the only candidate. Otherwise there is none.

**Composition never pins a place:**
- It needs only *some* candidate contained in the other place, and the usual-reading guard (§8).
- Nothing is written back. "Alameda" stays a candidate set even while it shows as "Alameda, California".

**Pinning:**
- **By the same note:** "Alameda, CA" filters Alameda's candidates to those in California. If exactly one is left, it is the reading (`decided_by rule`).
- **By the user:** only their answer to a CONFLICT question pins a place (`decided_by user`).

**Never:**
- Ask (Alpha) never answers "Who lives in Alameda city?" from candidates. It uses only `place_ref` or the words themselves.
- Kinship never asks "Which Alameda?" for structure's sake.

**A missing reading fails open:** an unknown name, more than 5 candidates or no usual reading each mean separate lines.

---

## 8. Relation algorithm

`relate.ts`, shared with the gateway. It runs for a new residence observation **N** against each current residence item **E** of the same person, subject and related person.
- **Current** means active, with a live facet, stated, not shared.
- The model's merge / supersede proposal decides only when a place is unknown (below).

### Pair classes, from readings

| Class | When |
|---|---|
| SAME | Same `value_norm`, or the same `place_ref` |
| E ⊇ N | Every usual (or only) reading of N lies inside E's reading ("California" ⊇ "Alameda") |
| N ⊇ E | The reverse ("California" after "Alameda") |
| DISJOINT | Both have usual readings, neither contains the other, **and no other candidate pairing is compatible** (Alameda vs Oakland; Alameda vs Colorado) |
| AMBIGUOUS | Incompatible under the usual readings but compatible under another candidate ("Paris" vs "Texas": Paris, TX) |
| UNKNOWN | Either side has no candidates (not in the data: "the Bay Area", "Logan Square") |

### Cues, from the user's words in the note

- **change:** moved to, has moved, relocated, now lives in, lives in … now.
- **correction:** actually, not <E's words>, I was wrong, I meant, correction.
- **none:** neither of the above.

### Decision, per pair

| Class \ cue | none | change | correction |
|---|---|---|---|
| SAME | **SAME** (merge: another source; nothing changes) | SAME | SAME |
| E ⊇ N | **REFINES** (new item, E untouched; composed) | E stays; N is new (she moved *within* E) | E stays |
| N ⊇ E | **REFINES** (case B; Alameda's specificity kept) | **CONFLICT** "Is Susan still in Alameda?" (case E) | **corrected** closes E |
| DISJOINT | **SUPERSEDES**, current truth only: no transition, **never history** ("lives in Colorado") | **SUPERSEDES** `changed` (case C): history-eligible | **corrected** closes E (case D): never history |
| AMBIGUOUS | **NEW** (two lines, never "Paris, Texas") | **CONFLICT** "Is Susan still in Paris?" | **corrected** if N names E's words after "not", else NEW |
| UNKNOWN | **NEW** (fail open) | Today's rule: the model's single proposed target, validated as now, recorded as `changed` | the model's target, validated, as **corrected** |

### Combining pairs, and guards

1. Any CONFLICT means the item is **held with one question**:
   - "Still there" saves N as new, with no closure:
     - when N contains E (case E), they compose;
     - when the pair is AMBIGUOUS, the user's answer pins E to the reading inside N ("Paris, Texas", both words the user's);
     - when E is protected and DISJOINT, N keeps its words but gets no residence facet, so only E is the current residence.
   - "She moved" closes the incompatible items as `changed`, because the user's answer is the evidence.
   - "Don't keep this" means N isn't memory (the note stays).
2. Otherwise N **closes the union** of the items to close. `supersedes_id` is the most specific one; the rest go in `closes_ids`. Items that contain N stay current.
   - Example: California → Alameda → "moved to Oakland" closes Alameda only and gives "Lives in Oakland, California".
3. **Kept guards:**
   - a hedge never updates; certainty is never upgraded;
   - never across people or subjects;
   - a protected (edited or user-written) E is never closed silently: it becomes a CONFLICT question;
   - a **shared** line is never closed by one person's change, so there is no cross-person contamination.
4. **Unchanged:**
   - every non-residence relation goes through today's `relate` / `threads.ts`;
   - a move *plan* or *event* ("is moving to Oakland in August") isn't a residence facet;
   - H16 reads only explicit move wording, never a supersession.

**Required cases, A–F:** they come out as CC-19's table, since each row above is one of them. F ("staying in Denver this week") never gets a facet.

**Supersession ≠ history (CC-20):**
- Closing an item decides only what is current.
- Whether the closed item may appear as history is a separate decision, recorded in the closer's transition (§11).

---

## 9. Composition algorithm

`compose.ts` is pure and shared by the app and the gateway. It runs at read time on the phone and stores nothing.

1. Take each person, subject and related person's **current** residence items with live facets.
2. Order them from most to least specific: by reading level (city < region < country), and ties by the newest told.
3. **Check the chain:**
   - each item must contain the next one under the usual-reading guard;
   - any unknown, ambiguous or disjoint pair means **no composition**: each item stays its own line (fail open).

   The comparator keeps current items pairwise compatible, so a broken chain is a bug. It sends a content-free `compose_degraded` event.
4. **Render:**
   - `Lives in ` + each item's own `value_text`, most specific first, joined with ", ";
   - items with the same reading are dropped, keeping the most specific item's words;
   - a single item renders "Lives in Alameda";
   - "Alameda, CA" stays "Alameda, CA", never "California".
5. **What the composed line carries:**
   - its member item ids and the union of their sources;
   - the rule version and dataset version.

   It is never stored, never sent to the model as something the user said (the dossier keeps sending member lines), and never a reason's evidence.
6. **History** uses the same renderer over a closed chain that is history-eligible (§11): `Previously lived in ` + its words.

---

## 10. Multi-item supersession and exact Undo

**Writing:**
- The gateway sends `closes`.
- `write_extraction` re-checks each id and inserts the new item with `supersedes_id` and `closes_ids`.
- The apply trigger closes them, and history snapshots happen as they do today.
- Open reasons on closed items are suppressed, as today.

**Undo** (the Kept card or the review, as today: retract the note's own items, then remove the note). The restore trigger brings back, each from its last snapshot:
- the `supersedes_id` chain (as now);
- **every `closes_ids` item**;
- the **`resolves_id`** thread;
- **unless** another live item still replaces it.

Facets were never touched by closing, so the composition is back exactly. `reasons_refresh` reopens the restored items' Moments (N8).

**The exactness matrix** (pgTAP plus scenario proofs):

| Sequence | After Undo of the last note |
|---|---|
| California → Alameda (refines) | California only; nothing to restore |
| California → Alameda → moved to Colorado | Alameda and California both active; "Lives in Alameda, California"; their Moments back |
| Alameda → actually Oakland | Alameda active; no history |
| A thread → resolved by a note | The thread active again (N8) |
| Two closers of one item; undo one | The item stays closed |
| Not this on the closer after 30 days (history purged) | Back to `active` (as today; `valid_to` isn't shown anywhere) |

**Outside Undo's scope, and not changed:** a merge's added people or mentions, new related people, a `relationship_label` set from the note. Those are separate Gate 0 items; none is semantic.

---

## 11. Correction and history

**`corrected`:**
- It is set when the superseding note carries a **correction cue** (§8). It applies to **every** supersession, not only residence, so "Actually Ben works at Google, not Meta" never becomes history.
- The old line keeps its lineage on the current line ("was: ~~…~~", as H23 / H30 do today).

**Supersession and history are separate decisions (CC-20).** Supersession decides what is current. History needs evidence that the earlier truth existed and then changed.

**Background history (I7).** A superseded item is shown only when **all** of these hold:
1. **The closer's transition is evidence of a change:**
   - `changed`: an explicit cue (moved to, relocated to, now lives in…) or the user's "She moved";
   - `completed` or `cancelled`: a life thread that ended.

   It is **never** shown with no transition (replaced as current truth only, e.g. "lives in Colorado" with no cue), with `progress`, or with `corrected`.
2. It isn't retracted or deleted.
3. It isn't a declined sensitive outcome; the allowed less-sensitive predecessor may stay.
4. It's durable: residence, work, home, or a completed or cancelled life thread.

   Never a health or progress chain, and never a refinement (refinements aren't superseded).
5. **Supersessions made before 4B** that have no transition recorded are **never** history. The old line stays only as the existing "Before: …" under the current line. The report counts these as `history_unknown`, without content.

**Wording:**
- **Residence:** "Previously lived in Alameda, California" (§9).
- **Anything else:** the old line in its own words, under a quiet **Before** label ("Natalia is interviewing with Box"). No tense rewrite (decided, CC-20).

**Dates on history lines:**
- "You told Kinship · Jan 4", the day the change was told.
- "Moved · Jan 4", "Started" or "Ended" only when the note gives that date at day precision ("moved to Colorado on Jan 4"). A month reads "Moved · January".
- Never `valid_to`; never "Updated".

---

## 12. Source and provenance UX

**The composed line:**
- It carries the existing provenance phrasing over the union of its sources: "You told Kinship · Oct 2 · and 1 other note" (approved).
- **Tapping it** opens a sheet of its member lines. Each line shows the words as stored, its own provenance (tap → the Source view of that note), **Edit** and **Not this**.
- Fixing one member recomposes the line deterministically, as in investigation §8.3. For example, Not this on California gives "Lives in Alameda".

**Never shown:**
- The Source view lists the notes, never "Alameda is in California".
- No ontology, place ids, dataset names or confidence appear anywhere.

---

## 13. Portrait de-duplication

**In Lately**, one composed residence chain takes **one slot**:
- it shows the **head's own statement** (the most specific current item: "Susan lives in Alameda"), voiced with the current name as every line is;
- it is dated and ordered by the chain's newest member, so a recent "California" keeps the chain recent;
- the other members are hidden from the Portrait, never from What Kinship knows.

**Fail open:** without a valid chain (§9 step 3), every line shows as today.

Nothing else on the Portrait changes. This is recorded under H15 in `approved-design-coverage.md`.

---

## 14. Migration and backfill dry run

**The rollout:**
1. **Approved (CC-20).** 4B is built on the branch, with its pgTAP, scenario proofs and eval corpus.
2. **Merge** (a merge commit), then **`npx supabase db push`**. This creates the tables and columns and changes no user row. Then the **ai-gateway redeploy**.
3. **Report only.** On launch, the 4B build asks the gateway (model-free, the caller's own account only) to run `residence/v1` over that account's facts.
   - It writes **only** `residence_backfill_report`: item id + bucket, no words.
   - No facet and no memory is written.
4. **You read the report** in the SQL editor, as with I12. Your own lines stay in your dashboard:
   ```sql
   select r.bucket, m.statement, m.status
   from public.residence_backfill_report r
   join public.memory_items m on m.id = r.memory_item_id
   order by r.bucket;
   ```
   **The buckets:**
   - `eligible` (gets a facet);
   - `resolved` · `candidates` · `unknown_place`;
   - `would_compose` (the current items of one person that would compose);
   - `contradiction` (current items that are pairwise incompatible);
   - `false_supersession_suspect`: a superseded item whose closer the comparator now calls REFINES (California → Alameda) or a correction;
   - `history_unknown`: a superseded item with no transition recorded, which is therefore never shown as history (CC-20);
   - `not_residence` (excluded by the wording rules).
5. **Apply after your yes.** A small PR switches the same task from report to apply: it writes facets for eligible items, all additive and uniform for every account. Then merge and redeploy.
6. **Existing wrong supersessions are only reported.** Restoring one is a repair under `data-cleanup-plan.md`, item by item, on your explicit yes. Nothing account-specific happens silently.
7. **Rollback:**
   - redeploy the previous gateway; the app then sees no new facets;
   - stop composing by tombstoning facets with a forward migration.

   Memory rows are never touched.

---

## 15. Eval additions

**A new corpus `semantic` (`evals/semantic/`)**, frozen in a manifest. It runs free in CI next to the extraction oracle: sequences through `residence.ts` → `relate.ts` → write rules → `compose.ts`, with fixture places. There are pgTAP suites for the triggers and RPCs, and Jest scenario proofs in the style of `memoryProofs` (multi-note, sync, views).

The fixtures are seeded now, before the runner exists (`evals/semantic/fixtures/residence.jsonl`; the format is in `evals/semantic/README.md`).

**Supersession vs history, required by CC-20:**
- Alameda → "lives in Colorado": Colorado current; Alameda **not** shown as biography or history.
- Alameda → "moved to Colorado": Colorado current; Alameda eligible for history.
- Alameda → "actually Colorado, not Alameda": `corrected`; Alameda never history.

**Residence cases required by CC-19:**
1. California → Alameda;
2. Alameda → California;
3. Alameda → moved to Colorado;
4. California → Alameda → Colorado → Undo;
5. California → Alameda → moved to Oakland;
6. Alameda → actually Oakland;
7. Alameda + grew up in Austin;
8. Paris → Texas;
9. Alameda → California now;
10. Alameda → Bay Area;
11. a temporary stay in Denver vs residence in Alameda;
12. Logan Square → moved to Pilsen;
13. a wrong-person correction (I13 moves the line, and its facet follows);
14. a shared residence with two people;
15. one note, "Alameda, CA".

**Added:**
- "lives at <address>";
- "is moving to Oakland in August" (a plan, no facet);
- a reported move ("Ben said Susan moved");
- a hedged residence;
- a protected E (asks);
- more than 5 candidates (Springfield);
- an unknown → known move;
- Undo of a resolve (N8);
- "moved to" the same place (SAME).

**Zero-tolerance metrics, each counted and gated at 0:**
- incorrect supersession, wrong SAME, incorrect refinement;
- unsupported composed fact (a word not in a member's `value_text`);
- lost provenance;
- temporal contradiction (two current values the comparator knows are incompatible, or a past one shown as current);
- **unsupported history**: a "Previously …" or Before line whose closer has no change evidence (CC-20);
- certainty upgrade;
- cross-person contamination.

A missed refinement is reported, not failed.

**Employer (recorded now, not run as pass/fail):**
- Meta + "Finance Data Strategy at Meta" may refine;
- Meta + Google are both current;
- "left Meta and joined Google" supersedes;
- Meta + "advises Acme" are compatible.

**Categorization (§3):**
- pottery, skiing → Into;
- works at Meta → Work;
- graduated from Berkeley → Education (Background);
- wants to visit Japan → Hoping to;
- sister Michelle → Their people;
- annual ski trip together → Between you;
- prefers red wine → Into (Preference);
- health → sensitivity-aware, unchanged;
- unclear → Background.

Each case also asserts that the line's words, source and status are untouched.

**Kept:** all 416 extraction fixtures and the replays. `relate` proposals from the model are still checked by `merge.jsonl`.

---

## 16. Native dogfood scenarios (founder, on the iPhone)

**First:** re-run gate rows 1b, 2, 2b, 3, 5, 5b, 11 and 11b after the ai-gateway redeploy (§0). Also check I3, I5, I8, I9, I10 and I11 once, as they come up.

**4A** (after its build):

| # | Do | Pass when |
|---|---|---|
| 1 | Tell "Pedro and Ben went climbing" (no Pedro in People) | Card order: kept line → "Pedro isn't in People yet…" with **Add Pedro** and **Not now** → **Correct this · Undo** → "Did Kinship get this right?". No "Tap a line…". Add Pedro puts the line on Pedro's page |
| 2 | Type in Tell, then tap People | The bar is visible with the keyboard up. People opens, and the draft is still there. **Done** and a downward drag both put the keyboard away |
| 3 | Tap a Today Moment, then **View Ben** | A focused detail (line, why now, when, Source, Message / Call). View Ben scrolls to that line with a brief quiet mark; with Reduce Motion on, there is no movement |
| 4 | Tell "Anthony and Natalia's wedding is Saturday" (Anthony in People), and look at Today Wed–Sat | Eligible from Wednesday through Saturday at most, and shown once (Today decides). No question about a date. Never for a wedding told without a day |
| 5 | Message from a Moment → back → **Yes** | Between you: "You messaged · <day>" with what it was about. "Anything worth remembering?" is optional and doesn't block. **Not yet** brings the Moment back, after a sync too (N6) |
| 6 | Add a call by hand on a person page | One tap on Message / Call / Video / In person records it, dated today. There is no "Anything worth remembering?" after a plain Message |
| 7 | A fresh install | After the first Tell, one Bring back screen, then Today. You can say what Today is for |

**4B:**

| # | Do (on one person, e.g. a test "Susan") | Pass when |
|---|---|---|
| 8 | "Susan lives in California", later "Susan lives in Alameda" | What Kinship knows › Background: **Lives in Alameda, California**, "· and 1 other note". Lately shows only "Susan lives in Alameda". Tap → both notes |
| 9 | Then "Susan moved to Colorado" | Lives in Colorado; under Before: **Previously lived in Alameda, California** · You told Kinship · <day> |
| 10 | Undo that note | Back to "Lives in Alameda, California", with no history line |
| 10b | On another test person: "Dana lives in Alameda", later "Dana lives in Colorado" (no "moved") | Lives in Colorado; **no** "Previously lived in Alameda" anywhere |
| 11 | "Actually she lives in Oakland, not Alameda" | Lives in Oakland, California; **no** "Previously lived in Alameda" |
| 12 | "Susan moved to California" (while in Alameda) | One question: **Is Susan still in Alameda?** Still there · She moved |
| 13 | "Susan is staying in Denver this week" | A separate line; the residence is unchanged |
| 14 | Open a few real people's What Kinship knows | Sections read naturally; nothing is missing compared with before; empty sections are absent. Confusion is evidence: note it |

---

## 17. Phase 4A order

| Step | Item | What changes | Tests and gates | Migration |
|---|---|---|---|---|
| 1 | **I4** Kept card (built, `81d410c`) | Order, attention row ("Pedro isn't in People yet. Add Pedro so this also shows on Pedro's page.", **Add Pedro** · **Not now**; newcomers keep their item ids), **Correct this** (opens the review as today; I9 path kept), "Did Kinship get this right?"; drop "Tap a line…". The ✕ dismiss stays | `keptHierarchy`, `keptFeedback`, `lifecycle` I9, `remediationViews` J6, H21 / I4 proofs | No |
| 2 | **I6** keyboard (built, `ca09d02`) | The nav bar stays with the keyboard up (tap = dismiss + navigate; the draft is already kept); an iOS `InputAccessoryView` "Done" on every text input; a downward drag on the dock dismisses. If the dock can't follow an interactive dismissal with built-ins, add `react-native-keyboard-controller` (a native module, so it needs a new build) | `drafts.test.tsx` "bar steps aside" rewritten to the approved spec; `keyboard.test` | No |
| 3 | **I1** Moment detail (+J3) (built, `969d500`) | A sheet: the line, why now, when, Source, Message / Call (the sheet steps aside before the hand-off sheet: never sheet on sheet). Coming up lines open it too, with their own return check. **View <Person>** → `person/[id]?item=` → scroll + brief quiet mark, falling back to What Kinship knows when the line isn't on the Portrait | New view and model tests; `grounding.test` gains the surface; `todayModel` `QuietView` assertions updated | No |
| 4 | **H16** milestones (+N7) (built, `1466cd3`) | `milestones.ts`: the nine types from explicit words in the **source quote**; a day-precise date; stated or planned; subject person or shared; not sensitive; eligible d−3 … d; a phone-made Moment (`milestone:`) through Today's existing ranking, freshness and 7-day per-person cap; one Moment per item. N7: good news falls back to the told day only when there is no date | `todayModel` H16 + N7; no-nagging and no-date cases | No |
| 5 | **I2** trail (+N6): know it + ask it | Record `memory_item_id` and `moment_type` on Yes; the trail under Between you (newest 3, full list in What Kinship knows); manual one-tap entry; type labels from the channel; the conditional, non-blocking "Anything worth remembering?"; **remove "You reached out · <date>" under the name** (CC-20). Infer-it is **I2b**, after the trail is proven | `todayModel`, `interaction`, new trail tests; pgTAP for the CHECKs and N6 | **Yes** (§1, 4A) |
| 6 | **H4** Bring back | Inside the Worth step after Keep it, or after Skip (no new activation step, so "1 of 4" is unchanged): one screen, the real first Tell when it is already understood and would make a future Moment, else the grounded example | `firstRun.test.tsx` and `.maestro/fresh-install.yaml` **gain** the step; nothing loosened | No |

Each step is its own commit. All checks stay green: Jest, tsc, ESLint, Deno and pgTAP. The permanent first-run gates are never loosened.

---

## 18. Phase 4B order

These are your 16 steps, grouped into reviewable chunks on the branch. They were approved on 8 Oct (CC-20), and **N8 comes first**.

| Chunk | Your steps | Delivers |
|---|---|---|
| **B0** ✓ `6cc0436` | (N8) | **First, at the earliest schema opportunity** (CC-20). Built: migration `20261009090000_v2_exact_undo`, pgTAP `66_v2_exact_undo`. The `resolves_id` column, restoring a resolved thread on Undo, and `reasons_refresh` reopening a suppressed Moment. A small migration of its own, plus pgTAP. Working before the next vertical-slice native gate |
| **B1** ✓ `d4db346`, `92e4e4e` | 1 | `categories.ts` (§3) and its categorization evals. No display change yet. Built: `supabase/functions/_shared/semantic/categories.ts`, computed and never stored; 44 eval cases (`evals/semantic/fixtures/categories.json`) run by `categories.test.ts` in CI. **B2 waits for the founder to see B1's result** |
| **B2** built, in review (§20) | 2, 3 | The migration (§1 B–G); `places` build script, licence notice and versioned JSON (§6); pgTAP. Built: migration `20261015090000_v2_residence_facets`, pgTAP `68_v2_residence_facets`, the facets mirror, `places-2026.10`. **Stop: the founder reviews B2 before B3** (CC-23) |
| B3 | 4, 5 | `residence.ts` (§5), `relate.ts` (§8) wired into `pipeline.ts` behind the residence check; CONFLICT question copy; the `semantic` corpus |
| B4 built, in review (§23) | 6, 7 | `closes_ids` writes, apply and restore, shipped **together**: closure never exists without its exact Undo (CC-20). The Undo matrix (§10). Built: the gateway sends every closure `relate.ts` finds (`closes`), the answer path too; the Kept card and What Kinship knows say everything a note replaced; pgTAP `70_v2_multi_closure`; corpus res-074 to res-080; `b4.blackbox`. **No migration**: B2's schema already covers it |
| B5 | 8, 9 | `compose.ts`; the composed-line sheet and provenance (§12) |
| B6 | 10 | The report-only task and `residence_backfill_report` (§14). **Stop: you read the report** |
| B7 | 11 | Portrait de-duplication (§13) |
| B8 | 12, 13, 14 | H15 sections (§4), I7 Before history (§11), category display |
| B9 | 15 | A native dogfood pass (§16), eval review, apply the facets after your yes |
| — | 16 | Evaluate employer: a separate proposal, with the employer evals from §15 |

---

## 19. Founder decisions (decided 8 Oct, CC-20)

1. **Place data:** GeoNames, CC BY 4.0, with attribution in Settings › About and `THIRD_PARTY_NOTICES.md`. Versioned and rebuildable.
2. **I4 copy:** "Pedro isn't in People yet. Add Pedro so this also shows on Pedro's page." with **Add Pedro** · **Not now**.
3. **"You reached out · <date>" under the name:** removed and folded into the Between you trail with I2 (step 5). Recorded in coverage. No disguised last-contacted field.
4. **I7 history outside residence:** **Before** + the old line in its own words. A transition date only when the source supplies it; otherwise "You told Kinship · <date>".
5. **I2:** know it + ask it first. Infer it is I2b, after the basic trail is proven.

**Also approved:**
- **Supersession and history are separate decisions** (§8, §11). Only evidence of a change (`changed`, `completed`, `cancelled`) makes a closed item history.
- **N8 first** (B0).

**Standing, unless you object:**
- Into keeps the verb ("Loves pottery"; §4).
- Plain plans go under "Plans" (CC-17 left the label to the build).
- The I1 detail is a sheet.
- The I6 keyboard dependency may be needed.
- The facet derivation runs in the gateway: TypeScript only, one implementation, tested free in CI.

---

## 20. B2 as built (15–16 Oct 2026)

**Status:** built on `claude/phase4b-b2-b5df72`, in review. Not merged; the migration is not in production. No display change. **B3 is not started.** Readiness: **NOT READY**.

**Commits:**
- `816f3eb`: the migration and pgTAP.
- `91bb324`: the phone mirror.
- `eca90c5`: the place data build script, fixture tests, licence notice, the app-bundle guard.
- `0b5fbf5`: `places-2026.10`, built from the pinned dumps (downloaded with the founder's yes).
- This section.

### The migration: `20261015090000_v2_residence_facets`

Additive and forward-only. It updates no stored row, and no column changes meaning (§2). Everything in §1 A–F, plus `purge_tombstones` now purging facet tombstones after 30 days, as for every mirrored table. Choices made in the build, within §1:

- **A reading carries what the phone needs.** Each candidate is `{ref, level, ancestors[]}`, with refs as `country:US`, `region:US.CA`, `city:<GeoNames id>`. A pinned reading (`place_ref`) and the usual reading (`usual_ref`) must be among the candidates, and a `decided_by user` facet must pin one. Composition runs on the phone without the place data (§9), so it reads levels and containment from the facets themselves.
- **Nobody writes a facet directly, not even the service role.** Only `write_extraction` and `write_facets` write them, and both re-check every facet first. The owner reads; the app never writes.
- **`closes` are re-checked exactly as a supersede target is today:** the user's own line, live, never edited or written by the user, same person, subject and related person, active or resolved, not the supersede target itself. At most 8, in the order sent. They are accepted only on a line written as new (`new` or `supersede`); a merge or a resolve drops them. A doubtful id is dropped, never an error. The result tells the gateway what was kept (`closes`, `facets`), and only when the item sent them.
- **A facet in `write_extraction`** is kept only on an eligible line (§5: a stated fact about the person or a related person, not sensitive, not shared) written as new, with its `value_text` inside one of the item's own spans, in the note's exact characters. One per slot.
- **`write_facets(p_user_id, p_items)`**, gateway only, takes up to 100 `{memory_item_id, version, facets}`.
  - A line changed since that version is left alone; the safety net re-derives it.
  - The words must be the user's own: a live source's quote, or the line itself when the user wrote or edited it (as in B1).
  - A rule's re-derivation never replaces a reading the user chose.
  - It replaces a live facet in place, and returns written, unchanged or dropped per item.
- **`resolve_capture_review` needed no new body.** It hands its items to `write_extraction`, so the answer's closures and facets get the same re-checks (proved in pgTAP).
- **Loops.** The loop check in both closing triggers follows `supersedes_id` and `closes_ids`. The trigger itself refuses closing across people, subjects or accounts.
- **Undo is exact.** Restore walks each closed item down its chain exactly as for `supersedes_id`, and "still replaced" also looks in other items' `closes_ids`. Covered: the California → Alameda → Colorado → Undo row of §10, "Not this" on a closer, two closers with one undone, a line closed by one note and replaced by another, a closed line that is itself gone, and a resolved line coming back resolved.
- **Server-only tables.** `residence_backfill_report` has no `user_id`: it goes with the item it names, and account deletion removes it with the items. `semantic_runs` is keyed by account, mode (`report` or `apply`), rule and dataset versions.

**Schema fingerprint** (`supabase/tests/schema_fingerprint_hash.sql`, fresh builds):
- before B2: 865 lines, `a29ce75b99435b3009b9f699e4d1c715`;
- with B2: 959 lines, `68c5cd45393e0dfd05f535236db8e727`.

Compare production after `db push`.

### The phone

- `memory_item_facets` is mirrored **pull only**, after its line; tombstones follow. `closes_ids` and `resolves_id` arrive with `memory_items` and are never sent.
- **Deployment order is safe.** A build that knows the facets table can meet a server without it (migration not yet applied). That one table then reads as empty, and the sync, first sync included, goes on. Any other missing table is still an error. No facet means every line shows as itself.

### Place data (§6)

- **The build:** `scripts/semantic/build-places.ts`, from pinned dumps.
  - Each dump's URL, download day (UTC), size and SHA-256 are in `scripts/semantic/places/sources.json` and in the dataset. A dump that differs stops the build; `--check` proves a rebuild is byte-identical.
  - Sections of cities (PPLX) and historical places are left out.
  - Rows are sorted, one per line, so a new version diffs place by place.
- **`places-2026.10`:** dumps of 16 Oct 2026 UTC. 252 countries, 3,865 regions and 31,764 cities, about 2.8 MB. The brief estimated about 26,000 cities and 2 MB; GeoNames now lists more.
  - It lives in `supabase/functions/_shared/semantic/places/`. Nothing imports it yet: B3 does.
  - Metro refuses to bundle it, and a Jest test proves the app can't import it.
- **Aliases** (`scripts/semantic/places/aliases.json`, **for your review**): 56 entries, each resolved by the build to exactly one place.
  - US, USA, UK, NYC, SF, LA, DC, and the two-letter codes of the 50 states.
  - LA is Los Angeles (§6), so Louisiana has no two-letter alias.
  - IN, OR, ME, OK, HI and OH are also English words. Whether a bare code may stand alone, or only qualify a place ("Paris, TX"), is B3's matching rule, not the list's.
- **Attribution:** "Place data from GeoNames (geonames.org), CC BY 4.0" is in `THIRD_PARTY_NOTICES.md`.
  - **Settings › About: pending (a display change).** It ships with the first build that uses the place data.

### Tests and evidence

Run in this worktree:
- **pgTAP:** `68_v2_residence_facets` has 112 assertions; all 24 suites pass (659 assertions). `40_delete_account` now covers the two new user-owned tables. They ran on a throwaway Postgres 16, the version CI uses, with the same steps as `run-db-tests.sh` (its paths moved into the session's scratch folder).
  - Not run on Postgres 17 (production's version).
  - Not applied to the shared local Supabase stack: it serves another session's acceptance harness, and a migration that worktree doesn't have would break its migration history.
  - Five deliberate breakages of the migration were each caught.
- **Jest:** 87 suites and 750 tests pass with `TZ=UTC`, as CI runs, including the first-run gate and the new bundle guard. `memoryProofs` fails on a machine in another time zone; that is older than B2 and outside it.
- **`npx tsc --noEmit` and `npx eslint app src`:** clean.
- **`deno test supabase/functions`:** 345 passed, including the dataset's own tests.
- **The build's fixture tests:** `deno test --allow-read --config scripts/deno.json scripts/semantic`, 10 passed, now also in CI.

**Evidence level:** database and unit tests only. No device, live backend or model path is involved, and nothing is displayed yet.

### Before B3

1. **Your review of B2** (CC-23: stop after B2), including the alias list.
2. **Licence: already confirmed** (CC-20, decision 1); nothing new is needed.
3. **A decision B3 needs: "She moved" on a line the user edited.**
   - §8 guard 3 makes a protected line a CONFLICT question, and §8 rule 1 lets "She moved" close it.
   - B2 re-checks closures as targets are re-checked today, so a closure of an edited line is dropped even after that answer. That path fails open today: both lines stay current, with no composition.
   - If your answer should close the edited line, B3 needs a small forward migration that lets `resolve_capture_review` mark that closure as the user's own answer. No seeded fixture covers it yet; res-025 covers "Still there".
4. **A finding for B3's rules, from the real data.**
   - Some neighbourhood names are also foreign cities: "Pilsen" reads as Plzeň, Czechia. Next to "lives in Illinois", the comparator could call the pair DISJOINT and supersede.
   - The seeded fixtures still come out as expected (res-016, res-017 and res-027 keep an unknown side, or a real change).
   - B3 should add a fixture for this. The B6 report would list such cases as `false_supersession_suspect` or `contradiction`.
5. **Rollout:** merge (a merge commit), then `npx supabase db push`, then compare the fingerprint.
   - B2 changes no gateway or app behaviour, so it needs no redeploy and no new build.

**Next step:** you review and merge this PR and run `db push`; then B3 starts: `residence.ts`, `relate.ts`, the CONFLICT copy and the `semantic` corpus runner.

## 21. B3 design: a later explicit change may close a line the user edited (founder, 16 Oct, CC-24)

**Status: designed and approved by the founder as written (16 Oct, CC-24), not built.** B3 has not started; this is written now so B2's schema doesn't block it. It ships inside B3, which starts in a fresh session from these docs.

**The decision.** A user edit is high-authority current truth at that point in time, not immutable. A later grounded user statement can close it. A model inference alone never can. Supersession and history eligibility stay separate decisions (CC-20).

**What changes in §8 for a protected E** (edited or written by the user):

| N's own words (cue, §8) | Unprotected E (as approved) | Protected E: before | Protected E: B3 |
|---|---|---|---|
| change ("moved to", "now lives in") | SUPERSEDES `changed`: history-eligible | CONFLICT question | **SUPERSEDES `changed`**, closed directly: history-eligible. Example: Alameda (edited) → "Susan moved to Colorado" |
| correction ("actually … not Alameda") | `corrected` closes E: never history | CONFLICT question | **`corrected` closes E**: never history |
| none, DISJOINT ("Susan lives in Colorado") | SUPERSEDES, current truth only: never history | CONFLICT question | **Unchanged: CONFLICT question** "Is Susan still in Alameda?". "She moved" closes E as `changed` (the user's answer is the evidence, history-eligible); "Still there" keeps E. No silent replacement of the user's own words without a cue |
| only the model's target (UNKNOWN), no cue in N's words | the model's target, validated | dropped | **Still dropped**: a model inference never closes an edited line |

"Now lives in" is already a change cue in §8, so it is history-eligible.

**Why the plain case still asks.** CC-24 says a plain replacement *may* replace current truth through the comparator, and is never automatically history. Asking keeps "do not weaken user edits generally" for the one case with no cue. A "She moved" answer is then the grounded evidence. This keeps §8 guard 3 for the no-cue case only. **Approved by the founder (16 Oct).**

**The migration** (`v2_closure_of_edited_lines`, forward-only; replaces two function bodies; no table or column change; no backfill):
1. **`write_extraction`**: a `supersede` target or a `closes` id whose `user_state` is `edited` or `user_authored` is accepted only when one of these holds; otherwise it is dropped (fail open), as today.
   - (a) The item's `detail.transition` is `changed` or `corrected`, and the item sends `cue: {start, end}` (code points) that lies inside one of the item's own spans in the capture's text and matches a cue phrase of §8. The database re-reads the characters, so a gateway can't assert a cue the user didn't write.
   - (b) The call comes from `resolve_capture_review` for an item whose stored answer is the CONFLICT question's "She moved". The flag comes from the stored answer row (`capture_reviews`), never from the item JSON.
2. **`resolve_capture_review`**: passes (b) through for the items its stored answers say "She moved".
3. **Unchanged:** every other re-check (same person, subject, related person, live, active or resolved, not across shared lines, at most 8); the apply and restore triggers; facets.

**Provenance.** The closed line keeps `user_state = edited` and its history rows, so What Kinship knows shows it as "Edited by you", then closed by the later note. The closer's `detail.transition` (`changed` / `corrected`) says whether it may appear as history (§11).

**Exact Undo.** Edits are in place, with a history snapshot taken before each change. Closing changes only status and `valid_to`, and restore puts those back. So Undo (or "Not this" on the closer) returns the **edited** Alameda, never a pre-edit version. A line still closed by another live closer stays closed (B2).

**pgTAP (with B3):**
- an edited E closed by a change cue in the user's words;
- the same cue claimed outside the item's span: dropped;
- a model target with no cue: dropped;
- "She moved" answer: closed `changed`;
- "Still there": kept;
- `corrected`: never history;
- Undo restores the edited statement and version;
- `user_authored` behaves as `edited`;
- shared and cross-person lines are never closed.

**Not in this migration:** any semantic behaviour or backfill beyond the approved B3 sequence (B6's report-only run and the founder's stop still come before any existing data changes).

## 22. B3 as built (16 Oct 2026)

**Status:** built on `claude/phase4b-b3-9be47a`, from `main` `7bccd83`; in review (PR #34). Not merged; the migration is not in production; ai-gateway not deployed. **B4 is not started.** Readiness: **NOT READY**.

**Founder approval (16 Oct, night):** the Pilsen behaviour (point 4), "Susan moved" for "She moved", N13 and N15 as built, and one closure per note until B4 (point 11) are **approved**. N14 was widened to the city level the same night (point 4).

**Three deltas, 16 Oct (night), from the founder's review:** N13, the §5 re-derivation as already approved (no new decision); N14, the founder's rule for a bare locality against a broader residence; N15, the removal suite made weekday-independent (harness only). No migration changed or added.

### What B3 is

- **`supabase/functions/_shared/semantic/residence.ts`** (§5): where someone lives now, read from the line's own span of the user's words with the committed `places-2026.10` (server only). It returns the facet in the shape `write_extraction` accepts, and the cues in the same span, in code points.
- **`supabase/functions/_shared/semantic/relate.ts`** (§8): pair classes, the cue table, the protected-line rule of §21 and the combining rules. Pure.
- **`pipeline.ts`**, behind the residence check: a line whose own words state a current residence (and only once who and what it is about are settled) is related to the person's current residence lines by the table. Every other line, and every relation to a line that isn't a residence, keeps today's path. Without place data nothing changes: the 416 extraction fixtures and both replays are unchanged.
- **The gateway** reads the dossier lines' live facets (under the user's RLS) and sends each new line's facet and cue; a held residence line carries the question's line (`still_in`). `resolve.ts` turns the answer into a closure as a change ("Susan moved") or nothing ("Still there").
- **The residence question** in the review (`reviewModel.ts`, `ReviewSheet` unchanged): **Is Susan still in Alameda?** · **Still there** · **Susan moved** · Don't keep this. Its words live in one shared place (`_shared/semantic/questions.ts`).
- **The migration** `20261016090000_v2_closure_of_edited_lines` (§21) and pgTAP `69_v2_closure_of_edited_lines`.
- **The semantic corpus** runner `evals/semantic/residence.test.ts` (48 sequences, frozen in `evals/semantic/MANIFEST.json`), in CI.
- **Settings › About:** "Place data from GeoNames (geonames.org), CC BY 4.0" (CC-20, decision 1; B2 left it for the first build that uses the place data). One string shared with the dataset and `THIRD_PARTY_NOTICES.md`.
- **Re-derivation after an edit (§5, N13; added 16 Oct):** `_shared/semantic/rederive.ts` reads a changed line's residence again, model-free, from the user's own words (an edited or user-written line: its statement; otherwise its notes' quotes), with the same `residence.ts`. Two paths, as §5 says: the app reports the edit once it has synced (`Understanding.correct` → the gateway's `rederive` action, owner only, no AI consent, flag or quota), and the next Tell about that person reads any such line first (the safety net). Both write through B2's `write_facets`, which re-checks the version, eligibility and that the place words are the user's own. **Only lines B3 has read** (a residence reading, tombstoned, none live): a line told before B3 is never read here, so B6's report and the founder's stop still come first.

B3 writes facets and closures for new notes, and re-reads lines it had read when the user changes them. No backfill and no reading of a line told before B3 (B6's report and the founder's stop come first). Nothing is composed or displayed differently (B5, B7, B8).

### Choices made within the brief (for review)

1. **"Current" is a line with a live facet** (§8). A residence told before B3 has none and keeps today's path, with one guard: the model may still replace such a line as today, but never with a place that fits it or could be it ("Alameda" after "California", or two readings), and never merge a different place into it. Found live on 16 Oct: the model proposed merging "Susan lives in Pilsen" into "Susan lives in Illinois".
2. **A single reading is the usual reading, never a pin.** `place_ref` is set only by a qualifier in the same words ("Alameda, CA") (and, in B5, by the user's answer). The B2 column comment's "one reading in the data" isn't used for pinning, because of the Pilsen finding.
3. **A region's people, for the usual reading**, are the sum of its cities' people in the data (regions have no population in GeoNames): "Colorado" is the state, not the town in Brazil; "Georgia" has no usual reading (the country and the state).
4. **The Pilsen finding (§20) — proposal for the founder:** a city read in another country than the other line's place is **AMBIGUOUS, never DISJOINT** (the data has no neighbourhoods). Without a cue: two lines. With a change: one question. So "lives in Illinois" → "lives in Pilsen" never replaces Illinois, and "Pilsen" → "moved to Denver" asks "Is Susan still in Pilsen?" (fixture res-027 changed from the seeded "the model's target").
   - **At home too (founder rule, 16 Oct, N14):** a new city the user didn't qualify, whose reading falls **outside the region or country the existing line establishes**, is AMBIGUOUS as well (`relate.ts`, `localityOutside`). That place is the line's own when it is a region or country, and its region (else its country) when it is a city. The data can't say a bare name means that city and not a place there that shares it ("Hollywood" reads as Hollywood, FL; "Portland" as Oregon).
     - California or Los Angeles → "lives in Hollywood": both lines stay. Alameda → "lives in Portland": both lines stay.
     - With a change ("moved to Hollywood", "moved to Portland"): one question, "Is Susan still in Los Angeles?" / "… in Alameda?"; "Susan moved" closes it as a change. "Actually … not <its words>" corrects.
     - The user's own qualifier ("Hollywood, FL", "Portland, OR": a pinned reading) is DISJOINT as before.
     - Unchanged: two cities in the same region ("Alameda" → "lives in Oakland"), a region replacing a city ("Alameda" → "lives in Colorado": current truth, no history), region for region, a city inside the region, Pilsen.
     - **One choice within the rule, for the founder's review:** a change cue that names the line left ("moved from Alameda to Denver") closes that line as a change instead of asking. The user's words say she left Alameda; only the destination is open, and it keeps the user's words. Seeded fixture res-046 depends on it.
     - One-way on purpose: the rule is about the new, unqualified city.
5. **No usual reading on one side** (Georgia, Paris against a region it isn't in) is AMBIGUOUS too (§7: a missing reading fails open).
6. **Aliases count only as written, in capitals** ("CA", "NYC", "OR"); "or", "me", "in" are never places. A place word in lower case counts when the data knows it ("susan lives in alameda").
7. **Cues:** a correction wins over a change in the same words (never history). **"not <words>"** corrects only the line whose own words for the place follow it, compared exactly as the database compares them.
8. **A line the user edited:** a DISJOINT pair with no cue asks (§21); with a change or correction cue it closes. A SAME pair writes a new line (the database never merges into an edited line). With an unknown place, the model's target closes it only with a cue in the user's words.
9. **A residence whose person or subject is asked gets no reading**, and an answer that changes who it is about drops it (fail open): it was never related to anyone's residence.
10. **"Still there"** keeps the new line's reading (it composes, case E), except beside a line the user edited that it can't be (§8 rule 1): then only its words. The user's pin of an AMBIGUOUS reading ("Paris, Texas") is **not written** in B3: it would write a facet on an existing line (B5).
11. **One closure per note** (`supersedes_id`). `closes` (multi-item closure) is B4 (§18): "California → Alameda → moved to Colorado" closes Alameda now and California stays current, as before B3, until B4 (reported in the corpus).
12. **A plan or thread today's path closes** stays today's, unless the table closes a residence line, which then takes the one closure (B4 carries both).
13. **No stored clarification** for a residence-only hold: the app builds the question from the held line, and `write_extraction_with_review` (not replaced, §21) accepts only its four question types.
14. **Facets that can't be read:** the note is understood without residence (never as if no line had one).
15. **Deployment order is safe.** An app from before B3 shows a held residence line as "Remember this about Susan?"; its yes is read as "Still there" (nothing closes).

### The migration: `20261016090000_v2_closure_of_edited_lines`

Forward-only. Replaces `write_extraction` and `resolve_capture_review`, adds two internal helpers (`edited_line_closure_ok`, `span_signature`). No table or column change; no stored row updated; no backfill.

- An edited or user-written line (supersede target or `closes` id) closes only when:
  - **(a)** the new line's transition is `changed` or `corrected` and its `cue` lies inside one of its own spans, and the database reads the cue's characters itself: moved to · has moved (back) to · relocated to · moved from … to · now lives in · lives in … now (change); actually · I was wrong · I meant · correction · "not <the closed line's place words>" (correction); or
  - **(b)** `resolve_capture_review` finds, in the **stored** review row, a held line with the residence question about exactly that line, the same person and the same words, and the answered line replaces it as a change. It passes that list to `write_extraction` for this capture, in the same transaction only (a transaction-local setting the API can't reach).
- **Narrower than §21's words, on purpose:** the closed line must be a residence line (a live facet), about no one else, and the new line a stated, unshared, non-sensitive fact with its own reading.
- **What the database can't know:** the user's tap. As for every answer, the gateway turns it into the items; the database guarantees that only a question it stored, about that line, can let an answer close an edited line, and that no model target alone ever does.
- Provenance kept (`user_state` edited, history rows, the user_edit source); Undo returns the edited version (proved).
- **pgTAP 69:** 52 assertions (every §21 case: cue in the span, outside it, not a cue, cue for the wrong transition, the model target alone, "She moved", "Still there", a question about another line or another item, `corrected`, Undo returning the edited words and a new version, `user_authored`, `closes`, someone else's line, a shared line even with a reading left on it, a line with no reading, a closer about two people, an unedited line unchanged). Six deliberate breakages of the migration were each caught.
- **All 25 suites:** 711 assertions, on Postgres 16 (CI's) and **17.6** (the local Supabase container, a throwaway database; production's major version).
- **Schema fingerprint** (fresh build): 967 lines, `abeadd9ad9b1d2041f9884299872c03e` (B2: 959, `68c5cd45…`). Compare production after the merge.

### The corpus (§15)

`evals/semantic/fixtures/residence.jsonl`: the 29 seeded sequences and 19 added (the Pilsen fixtures res-030 to res-032, the unknown → known move res-033, the §21 rows res-034 to res-040, stays, "doesn't live in", two people, "moved from … to", lower case, "Alameda, CA" as the same place). Seeded rows changed: res-012 and res-013's choices ("Susan moved"), res-025 (§21: a change cue closes the edited line), res-027 (point 4). Each sequence runs the gateway's own code end to end with the real place data; a page is read as B5 would compose it (test code, not the product's composer).

- **73 / 73** pass (25 added on 16 Oct: res-049 to res-057 for N13, an edit step that runs `rederive.ts` reported or by the next Tell; res-058 to res-073 for N14: Hollywood next to California and next to Los Angeles, Portland next to Colorado and next to Alameda, Brooklyn next to Texas, "Hollywood, FL", "Portland, OR", "moved from Alameda to Portland", Oakland after Alameda, region for region, the correction); **zero-tolerance metrics: 0**; missed refinements: 0. The contradiction metric now needs both directions DISJOINT (N14 is one-way).
- **Reported, not failed:** res-006's second closure (B4) and the contradiction it leaves meanwhile; portraits (B7). res-018 (a line moved to someone else) now has its reading again.
- Breakages of relate.ts and residence.ts (silent closure of an edited line, no Pilsen rule, B closing, stays read as residences, a change cue for a correction) each fail it.

### Evidence

| Tier | Result |
|---|---|
| UNIT | PASS: Deno 405 (with the residence, relate, rederive, pipeline, resolve and gateway suites); Jest 90 suites / 808 tests (`TZ=UTC`), reviewModel and ReviewSheet residence question, Settings › About; tsc and ESLint clean (0 errors) |
| INTEGRATION | PASS: the corpus 73/73; Jest `residenceProofs` (16: the real pipeline, answer path, sync, review, the edit report and the safety net); extraction oracle, realistic and both replays unchanged. pgTAP 711 (PG 16 and 17.6) from before the deltas; not re-run, since no SQL changed |
| BLACK-BOX | PASS: `b3.blackbox.tsx` 20/20 replayed (real screens, local stack with B2 + B3 applied, this branch's gateway run beside the shared one, `GATEWAY_URL`): C with exact Undo, E (Susan moved / Still there), D, F, Pilsen, the three §21 rows, N13 ×5 (an edit on Susan's page through the real line sheet read again as Alameda; then "moved to Colorado" closed as a change and Undo returning the edited line; a bare "lives in Colorado" asking; "Actually … not Alameda" corrected; an unreported edit read by the next Tell) and N14 ×6 (Hollywood next to California and next to Los Angeles, both the bare and the "moved to" note; Portland and "Portland, OR" next to Alameda; Oakland after Alameda unchanged). Regression: removal 3 (Friday 16 Oct, N15), k4 36, k4legacy 18, k20 22, k19 2, k25 3, h4 2, k10 1, dates 2, today 2 |
| LIVE-MODEL | PASS: the same 16 with the live model (stub in record mode, 16 Oct): 15 in the full run; E failed only on its exact-words check (the model wrote "Susan lives in Alameda." with a full stop) and passed on its own once the check ignored a closing full stop. The new notes' replies are kept (`b3-lives-california`, `b3-actually-colorado`, `b3-hollywood`, `b3-moved-hollywood`). On "Susan lives in Hollywood" the live model proposed replacing California: the N14 guard kept both. City level, a live sample of 2 (Los Angeles → Hollywood, Alameda → Portland): PASS; the model proposed replacing Los Angeles and Alameda, and both lines were kept. The Oakland and "Portland, OR" replies are written by hand in the live shape (labelled so) |
| NATIVE-SIMULATOR | NOT RUN for the deltas: the simulator's app reaches the gateway only through the shared `functions serve`, which this session couldn't swap for the branch's gateway. Before them, PASS: a Release build of this branch on the iOS 27 simulator (iPhone 18 Pro), the local stack, this branch's gateway and the **live model**, a fresh local account: "Susan lives in Alameda." kept; "Susan moved to California." → **One thing to check · Is Susan still in Alameda? · “Susan moved to California” · Still there · Susan moved · Don't keep this**; **Susan moved** → "Kept for Susan · Susan moved to California · Replaces: ~~Susan lives in Alameda~~" (server: Alameda superseded, California `changed` with its reading); **Undo** → Alameda current again. Settings shows **About · Place data from GeoNames (geonames.org), CC BY 4.0** |
| FOUNDER-DEVICE | **PASS** (founder, 16 Oct, late): the B4 device checklist (`b4-device-checklist.md`) on a build with the gateway deployed from this branch; "no issues" |

### Before B4

1. **Founder review: done (16 Oct, night).** Points 4 (Pilsen) and 11 (one closure until B4) approved. Left for review: "moved from <the line's words> to …" closing that line (point 4).
2. **Copy: approved.** "Susan moved" for "She moved" (CC-20: names, never guessed pronouns); the question has no reason line; "Don't keep this" and "One thing to check" are existing copy.
3. **Re-derivation after an edit (§5): built (16 Oct, N13)**, as the approved contract says; see "What B3 is".
4. **The same-country locality (N14): built (16 Oct)** as the founder's rule; see point 4 above.
5. **Rollout:** merge (a merge commit; the integration applies the migration; compare the fingerprint and `list_migrations`), then the ai-gateway deploy on the founder's go, then a build (the question's app side, the edit report and Settings › About). Either order is safe (point 15). For N13 too: an app with the report against a gateway without `rederive` gets a 400 and drops the report (best effort); a gateway with it against an older app reads edited lines at the next Tell (the safety net).

**Next step:** the founder reviews this PR and the proposals above; after merge and deploy, B4 (`closes_ids` writes and the Undo matrix, §10, §18).

## 23. B4 as built (16 Oct 2026)

**Status:** built on `claude/phase4b-b4-77358f`, from `main` `e8eb975` (PR #34, B3, merged); in review (PR #35). **No migration:** B2's schema (`closes_ids`, the apply and restore triggers, "still closed by another live closer", 20261015090000) and B3's edited-line rule (20261016090000) already cover everything B4 needs; the schema fingerprint of a fresh build is unchanged (md5 `abeadd9ad9b1d2041f9884299872c03e`, as after B3). ai-gateway needs a deploy (the closures are sent from there); the app a build (the Kept card). **B5 is not started.** Readiness: **NOT READY**.

**Founder decisions folded in (16 Oct):** "moved from <the line's words> to …" closes that line as a change, the destination staying open (§22 point 4): approved, no longer a question; `relate.ts` is unchanged. The extra trust check asked for: a multi-item closure may include an edited or user-written residence line only where §21's grounded-cue rule allows it, and Undo returns the edited version (pgTAP 70, corpus res-075, `b4.blackbox` §21, `residenceProofs` B4).

### What B4 is

- **The gateway sends every closure.** `relate.ts` already found the full ordered list (`Decision.closes`, the most specific first). `pipeline.ts` now sends the first as the supersede target (as B3 did) and the rest as `closes` (`PlannedItem.closes`), which `write_extraction` (B2) re-checks one by one, exactly as it re-checks the target, and writes as `closes_ids`; the apply trigger closes each (status and `valid_to` only; facets untouched). Example: California → Alameda → "moved to Colorado" closes Alameda (`supersedes_id`) and California (`closes_ids`), both as a change; "moved to Oakland" still closes Alameda alone (California contains Oakland).
- **The residence question carries what else "Susan moved" closes** (`still_in.closes`, stored with the held line in `capture_reviews`). `resolve.ts` sends them as `closes` only with that answer, and only when it replaces the line the question named; "Still there" closes nothing. Through `resolve_capture_review` they get the same re-checks.
- **Exact Undo.** Undo (the note's own lines retracted and removed) and "Not this" on the closer run B2's restore trigger: what the closer replaced and every line it closed comes back from its last snapshot (and to `active` without one, after the 30-day purge), each unless another live closer still replaces or closes it. Facets were never touched, so the composition B5 will read is back exactly; `reasons_refresh` reopens a silenced Moment (N8).
- **The phone says everything a note replaced.** The Kept card shows **Replaces: ~~…~~** (H23's line) under a kept line for every line it replaced, the most specific first. Before B4 the card showed none of it: only the review sheet behind "Correct this" did (the B3 coverage row read "as any replacement does", which was the sheet). The sheet, What Kinship knows ("Before: …") and the line sheet now list each line too (`ItemLine.replaces` is a list; `earlierOf` reads `closes_ids`). The Portrait's quiet "was: ~~…~~" keeps the most specific line (H23), unchanged.
- **Every guard kept.** §21 for edited and user-written lines: a closes id the user edited closes only on the user's own cue in that note (the database re-reads it), or, for the line the question named, the stored "Susan moved" answer. Never across people or subjects, never a shared line, at most 8, a model inference alone never closes an edited line. N13 re-derivation, N14 (`localityOutside`), Pilsen, the question's copy and the backfill are untouched.

### Choices made within the brief (for review)

1. **The stored answer vouches only for the line the question named.** With two edited lines both incompatible with a plain "Susan lives in Colorado" (California and Alameda, both the user's own), the question is "Is Susan still in Alameda?"; "Susan moved" closes Alameda; California, which no question named and no cue in the note touched, is dropped from the closures (fail open) and stays current beside Colorado, two lines B5 will not compose. The alternative, letting the answer close every line the question carried, would close the user's own words on a question that never named them; it needs a small forward migration to `resolve_capture_review`. Logged as **N16** for the founder. With a cue in the note ("moved to Colorado") both edited lines close (§21 a), so this is the no-cue case only.
2. **"Replaces" on the Kept card** is a surface addition: H23's approved element on I4's approved card, under the kept line, one per replaced line. Recorded in `approved-design-coverage.md`.
3. **The Portrait's "was:"** stays the most specific line only; the full list lives in What Kinship knows.
4. **Order of the closures** is `relate.ts`'s (the most specific first; ties to the newest), so `supersedes_id` is always the most specific line (brief §2).

### The §10 Undo matrix, case by case

| Sequence | After Undo of the last note | Proved by |
|---|---|---|
| California → Alameda (refines) | California only; nothing to restore | corpus res-079; `b3`/`residenceProofs` case A |
| California → Alameda → moved to Colorado | Alameda and California both active; "Lives in Alameda, California"; their Moments back | corpus res-006 (its two DEFERRED entries removed) and res-075/077; pgTAP 68 (B2) and 70 (the reason reopened); `b4.blackbox` res-006 and "Not this"; `residenceProofs` B4 |
| Alameda → actually Oakland | Alameda active; no history | corpus res-080; pgTAP 69 (corrected, Undo) |
| A thread → resolved by a note | The thread active again (N8) | pgTAP 66 (B0) |
| Two closers of one item; undo one | The item stays closed | pgTAP 68 D (B2) |
| Not this on the closer after 30 days (history purged) | Back to `active` | pgTAP 70 |

Added by the founder's trust check: an edited line among the closures (via the cue; via the answer for the asked line only) and Undo returning the edited version: pgTAP 70, corpus res-074/075, `b4.blackbox` ("edited Alameda", "§21"), `residenceProofs` B4.

### Evidence

| Tier | Result |
|---|---|
| UNIT | PASS: Deno 408 (3 added: the pipeline's `closes` and `still_in.closes`, the answer path, the gateway's write and stored question); Jest 90 suites / 812 tests (`TZ=UTC`; the Kept card's Replaces lines, every surface's list); `npx tsc --noEmit` and `npx eslint app src` clean (0 errors) |
| INTEGRATION | PASS: the corpus 80/80 (7 added; DEFERRED empty; zero-tolerance metrics 0; withholding the closures from the pipeline fails 8 expectations in 5 sequences and reports 2 contradictions, then passes again). `residenceProofs` 19 (3 added). pgTAP 26 suites / 743 assertions (`70_v2_multi_closure` added, 32) on **Postgres 16** (CI's; Homebrew, the run-db-tests steps with psql in place of pg_prove) and **17.6** (the local container, a throwaway database). Schema fingerprint of a fresh build unchanged: md5 `abeadd9ad9b1d2041f9884299872c03e` |
| BLACK-BOX | PASS: `b4.blackbox` 5/5 replayed (the real screens, the local stack with B2 + B3 applied, this branch's gateway on :8000 and its stub on :8791, `GATEWAY_URL` / `STUB_URL`): res-006 with the card's two Replaces lines and exact Undo; "Not this" from What Kinship knows (two Before lines); California + an edited Alameda + "lives in Colorado" ("Susan moved" closes both, Undo returns the edited line); "Still there" (nothing closes); an edited California among the closures closed on the user's own "moved to" and returned as the user left it. Regression against the same gateway, every suite green: b3 20, k4 36, k4legacy 18, k20 22, k19 2, k25 3, h4 2, k10 1, dates 2, today 2, removal 3 (111) |
| LIVE-MODEL | PASS: 3 of the 5 with the live model (the stub in record mode, 16 Oct; 9 calls): res-006, the edited-Alameda question, "Still there". The live model proposed replacing California on "Susan lives in Alameda" every time (the table kept both, REFINES) and one target on "moved to Colorado" / "lives in Colorado"; the table closed Alameda and California both, and asked once beside the edited line |
| NATIVE-SIMULATOR | NOT RUN: no build this session (the app-side change is the card's and record's lines; the closures and Undo are the server's, proved through the real stack above) |
| FOUNDER-DEVICE | **PASS** (founder, 16 Oct, late): the B4 device checklist (`b4-device-checklist.md`) on a build with the gateway deployed from this branch; "no issues" |

### Rollout

1. Merge (a merge commit). **No migration**, so the integration applies nothing; compare the fingerprint anyway (unchanged, md5 `abeadd9a…`).
2. The ai-gateway deploy from `main`, on the founder's go (the closures are sent from the gateway).
3. A build (the Kept card's Replaces lines; the record's Before lines).
4. Either order is safe: an app from before B4 against the new gateway shows the card without the lines while the server closes and restores correctly (the `closes_ids` mirror has been in the app since B2); the new app against the old gateway sees one closure per note, as B3.

**Next step:** the founder reviews this PR (choice 1 / N16 in particular); after merge and deploy, B5 (`compose.ts`, the composed line and its sheet, §9, §12).
