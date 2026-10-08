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
  1. Redeploy (put the token on its own line, never in chat; delete it in Supabase afterwards):
     ```
     export SUPABASE_ACCESS_TOKEN=sbp_…
     npx supabase functions deploy ai-gateway --project-ref kddpxiiyxgvjrtpdkvio
     ```
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
| 4 | **H16** milestones (+N7) | `milestones.ts`: the nine types from explicit words in the **source quote**; a day-precise date; stated or planned; subject person or shared; not sensitive; eligible d−3 … d; a phone-made Moment (`milestone:`) through Today's existing ranking, freshness and 7-day per-person cap; one Moment per item. N7: good news falls back to the told day only when there is no date | `todayModel` H16 + N7; no-nagging and no-date cases | No |
| 5 | **I2** trail (+N6): know it + ask it | Record `memory_item_id` and `moment_type` on Yes; the trail under Between you (newest 3, full list in What Kinship knows); manual one-tap entry; type labels from the channel; the conditional, non-blocking "Anything worth remembering?"; **remove "You reached out · <date>" under the name** (CC-20). Infer-it is **I2b**, after the trail is proven | `todayModel`, `interaction`, new trail tests; pgTAP for the CHECKs and N6 | **Yes** (§1, 4A) |
| 6 | **H4** Bring back | Inside the Worth step after Keep it, or after Skip (no new activation step, so "1 of 4" is unchanged): one screen, the real first Tell when it is already understood and would make a future Moment, else the grounded example | `firstRun.test.tsx` and `.maestro/fresh-install.yaml` **gain** the step; nothing loosened | No |

Each step is its own commit. All checks stay green: Jest, tsc, ESLint, Deno and pgTAP. The permanent first-run gates are never loosened.

---

## 18. Phase 4B order

These are your 16 steps, grouped into reviewable chunks on the branch. They were approved on 8 Oct (CC-20), and **N8 comes first**.

| Chunk | Your steps | Delivers |
|---|---|---|
| **B0** ✓ `6cc0436` | (N8) | **First, at the earliest schema opportunity** (CC-20). Built: migration `20261009090000_v2_exact_undo`, pgTAP `66_v2_exact_undo`. The `resolves_id` column, restoring a resolved thread on Undo, and `reasons_refresh` reopening a suppressed Moment. A small migration of its own, plus pgTAP. Working before the next vertical-slice native gate |
| B1 | 1 | `categories.ts` (§3) and its categorization evals. No display change yet |
| B2 | 2, 3 | The migration (§1 B–G); `places` build script, licence notice and versioned JSON (§6); pgTAP |
| B3 | 4, 5 | `residence.ts` (§5), `relate.ts` (§8) wired into `pipeline.ts` behind the residence check; CONFLICT question copy; the `semantic` corpus |
| B4 | 6, 7 | `closes_ids` writes, apply and restore, shipped **together**: closure never exists without its exact Undo (CC-20). The Undo matrix (§10) |
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
