# Semantic memory evals (Phase 4B)

Two corpora:
- **Categorization** (B1, built): `fixtures/categories.json`, run free in CI. See the last section.
- **Residence** for semantic v1 (`KINSHIP_2_DECISIONS.md` CC-19, CC-20; `docs/product/phase4-implementation-brief.md` §8–§15), below.

- **Seeded before the runner exists**, so it fixes the expected behaviour first. The runner arrives with the residence code (brief B3):
  - it pushes each sequence through `residence.ts` → `relate.ts` → the write rules → `compose.ts`, with fixture place data;
  - it is free and runs in CI.
- **Fixtures are written by hand from patterns, never taken from real users' data.**

## Format: `fixtures/residence.jsonl`, one sequence per line

| Field | Meaning |
|---|---|
| `id`, `title`, `tags` | `tags` names the rule the case pins (`cc20`, `cc19-A` … `cc19-F`, `refines`, `corrected`, `no_history`, `unknown`, `shared`…) |
| `people` | The people in People for this case (the first is the one the notes are about) |
| `steps[]` | What happens, in order (below) |
| `expect.pages.<Name>` | The end state on that person's page |
| `expect.must_not` | Text that must appear nowhere, on any page |

**A step is one of:**
- **a note:**
  - `note`: the user's words;
  - `item`: what the model proposes, as perfect proposals in oracle mode;
    - `statement` and `evidence`; `evidence` is a substring of the note;
    - defaults: kind `fact`, category `home`, subject `person`, certainty `stated`;
    - optional: `kind`, `certainty`, `subject` + `related`, `with` (other people in People: a shared line);
  - `model`: optional, the model's own merge / supersede proposal (`{action, target: step}`). It only matters for places outside the place data;
  - `protect: true`: the user then edits the line, so it is protected;
  - `answer`: the user's answer to a CONFLICT question, `still_there` or `she_moved`;
- **`undo: <step>`:** Undo that step's note;
- **`correct_person: {step, to}`:** move that step's line to someone else (I13).

**A step's `expect`:**
- `facet`: whether the line gets a residence facet;
- `outcome`: `NEW`, `SAME`, `REFINES`, `SUPERSEDES` or `CONFLICT`;
- `closes`: the steps whose lines it closes, the most specific first;
- `transition`: `changed`, `corrected` or `null` (replaced as current truth only);
- `question` and `choices`, for a CONFLICT;
- `value_text`, `resolved`, `candidates`, for the place reading.

**A page's expectations:**
- `current`: the residence lines in What Kinship knows › Background, composed or separate;
- `history`: its Before lines;
- `portrait`: the residence line on the Portrait (the head's own words);
- `sources`: how many notes stand behind the current line;
- `active`: statements still current on the page;
- `related`: a related person's lines, by relation.

## Metrics (CC-19, CC-20)

**Zero tolerance**, each counted and failing the run:
- incorrect supersession;
- wrong SAME;
- incorrect refinement;
- an unsupported composed fact (any word not in a member's own `value_text`);
- lost provenance;
- temporal contradiction (two current values Kinship knows are incompatible, or a past one shown as current);
- **unsupported history** (a "Previously …" or Before line whose closer has no change evidence);
- certainty upgrade;
- cross-person contamination.

**Reported, not failed:** a missed refinement (it fails open to separate lines).

Not in this corpus:
- N8 (Undo of a resolved thread, reopened Moments) is proved in pgTAP and the app's scenario proofs.
- The employer cases (CC-19 §33) are recorded in the brief §15 and become fixtures when employer is taken up.

## Categorization: `fixtures/categories.json` (B1)

Where a memory sits in What Kinship knows (brief §3; `supabase/functions/_shared/semantic/categories.ts`). Written by hand from patterns, never from real users' data.

- **Runner:** `supabase/functions/_shared/semantic/categories.test.ts`, inside `deno test` in CI. Free, no model.
- **A case:** `item` is a memory as stored, with a `detail` in the shape the database accepts. Defaults: kind `fact`, subject `person`, certainty `stated`, user_state `unreviewed`. `quotes` are the user's own words behind it (default: the line itself). `category` and `section` are the expected placement.
- **Tags:**
  - `founder`: the founder's cases (CC-19 §34 and the 8 Oct "Continue Phase 4" message);
  - `rule1` … `rule10`: the brief's rules, in order;
  - `own_words`: words count only when the user's own words and the kept line both say it;
  - `never_inferred`: no carbonara → Italian, basketball → sports, or surname → family.

**Zero tolerance**, each failing the run:
- a case placed in the wrong category or section;
- a memory changed in any way by categorizing it (the runner freezes every input);
- an output outside the closed set;
- a placement that depends on sensitivity, status or supersession.

