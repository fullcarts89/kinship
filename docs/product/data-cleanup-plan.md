# Data cleanup plan — founder account (proposal, NOT executed)

*6 Oct 2026, Core Trust Closure pass. Nothing below has been changed. Each step needs the founder's explicit yes. Every step keeps provenance: no source or note is deleted, and replaced lines stay as history.*

## How the records were found

The records come from narrow read-only queries on the founder's account:
- people whose names contain "my" or "Kaiya";
- active or resolved memories mentioning Tahoe, Christmas, the zoo, "moving to Australia", "going away party", "getting married" or Box.

Only ids, statements, kinds, statuses and source counts were read.

All the bugs that created these records are now fixed in code:
- H20: "My daughter Kaiya"
- H13 / H5: shared duplicates
- H25: the unlinked Box update

The cleanup only repairs what those bugs left behind.

---

## 1. "My daughter Kaiya", a second Kaiya (H20)

| Record | id | Notes |
|---|---|---|
| Person **Kaiya** (relationship: daughter) | `7b40d758-…` | The real one, created Oct 6 17:26 with 1 memory |
| Person **My daughter Kaiya** | `a12a5ffb-…` | Created by the bug, Oct 6 17:34 |
| Memory "You and Kaiya are going to the zoo" (event, Sun Oct 11) | `8b6cd14a-…` | Filed on "My daughter Kaiya", 1 source |

**Proposed:**
1. Move the zoo memory to **Kaiya** (`person_id` → `7b40d758-…`). Its source (the note) stays.
2. Archive the person "My daughter Kaiya" (`state = archived`, soft delete). It has no other memories.

**Alternative, using the app:** rename it via H1 and move the line by tapping "Kaiya" on the line. That still leaves two Kaiyas, so step 2 is cleaner.

## 2. Tahoe told twice (H13)

| Record | id | Filed on | Shared with |
|---|---|---|---|
| "Ben and John went to Tahoe" (event, undated) | `d0001eaf-…` | Ben | John |
| "John and Ben went to Tahoe" (event, undated) | `5417f50d-…` | John | Ben |

**Proposed:** keep `5417f50d-…` (on John, shared with Ben).
- Give it the other line's source too (`memory_item_sources` row for the same note).
- Mark `d0001eaf-…` as superseded by it (`supersedes_id`), so it stays as linked history.

Optional: re-file the kept line as a past fact (G32c), so it no longer shows "No date yet". This changes kind only; its words and sources stay.

## 3. "Anthony and Natalia are getting married", three lines on three people (H5)

| Record | id | Filed on | Notes |
|---|---|---|---|
| "Anthony and Natalia are getting married" | `7b69b72f-…` | **Anthony** (older contact) | 2 sources (two notes) |
| "Anthony and Natalia are getting married" | `c540496a-…` | **Anthony Lopez** | 1 source |
| "Natalia and Anthony are getting married" | `0cde5e07-…` | Natalia | 1 source |

There are **two Anthony people**: "Anthony" and "Anthony Lopez". That's a duplicate contact, and Kinship has no merge-people feature (not built; out of scope). Needs the founder's call:
- **(a)** Which Anthony is real? Archive the other after moving its memories over.
- **(b)** Keep one wedding line on that Anthony, shared with Natalia. Move all three notes' sources onto it, and mark the other two as superseded by it.

## 4. Sam and Meesh, told once each way (H5)

| Record | id | Filed on |
|---|---|---|
| "Sam is moving to Australia with Meesh" | `5e3d742b-…` | Sam (2 sources) |
| "Meesh is moving to Australia with Sam" | `c7b0874b-…` | Meesh |
| "Sam and Meesh are having a going away party" | `efcd6626-…` | Sam |
| "Meesh and Sam are having a going away party" | `c3965cda-…` | Meesh |

**Proposed:**
- For each pair, keep the Sam line (shared with Meesh).
- Add the Meesh line's source to it.
- Mark the Meesh line as superseded by it.

## 5. Natalia and Box: the update that didn't link (H25)

| Record | id | Status |
|---|---|---|
| "Natalia is interviewing with Box" (thread) | `7a6de499-…` | resolved |
| "Natalia is no longer interviewing with Box because she got rejected" | `e1275a27-…` | active, `transition: cancelled`, no link |

**Proposed:** set `e1275a27-….supersedes_id = 7a6de499-…`. The interviewing line becomes linked history: it shows as "was: …" and its note still lists it.

## 6. Christmas: nothing to do

Only **one** active Christmas item now exists: "John is coming to visit in Alameda for the Christmas holidays, arriving 12/22" (`b319ca5c-…`), with **2 sources**. The earlier duplicate appears to have been merged already. No change proposed.

## 7. Older items worth knowing about (no change proposed)

- **"He wants to go back to Tahoe in December"** (`8042a16d-…`, John, thread) still says "He". It predates the stabilization pass's who-answer fix (G32a).
  - Proposed: reword to "John wants to go back to Tahoe in December".
  - This is a word edit with a user_edit source and its old wording kept (H30); the founder can do it in the app.

---

## How it would be executed (after a yes)

1. One reviewed SQL script in a transaction. It sets only the listed `person_id`, `supersedes_id`, `state` and source rows, never deletes a note or a source, and is run through the Supabase SQL editor by the founder or with explicit approval.
2. A read-only check afterwards: one active line per item above, every source still present, nothing orphaned.
3. Undo: every superseded line keeps its row, so reverting is clearing `supersedes_id` (restored by the existing trigger) and unarchiving a person.
