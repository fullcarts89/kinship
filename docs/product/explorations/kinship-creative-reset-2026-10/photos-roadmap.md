# Photos in Kinship: a proposed capability (design and product research only)

**Status: PROPOSAL · not authorised · not on the roadmap.** Recorded at the founder's request alongside the checkpoint A refinement so the designs can be judged with and without photos. Nothing here starts a build: no storage migration, uploader, permission change, production change or resequencing. B7–B9, the employer evaluation, the household dogfood and the rapid-relationship-understanding workstream (PR #52) are unchanged. Placing this in a roadmap bucket is a founder decision; the suggestion below is **D · Explore later**, after the trust floor.

## 1. What already exists (checked 19 Oct 2026)

| Where | What | State |
|---|---|---|
| `src/lib/photoPicker.ts`, `src/lib/photoStorage.ts` (P0-15) | The 1.0 camera-or-library chooser; picked images copied to `<documents>/photos/<user id>/<uuid>.<ext>`; kept across sign-out of the same account, removed when another account claims the device, deleted with the account (F0-D1) | Built, 1.0 only; the plan maps it to a future `src/platform/photos.ts` (Later) |
| `src/hooks/usePersonPhoto.ts` | The 1.0 person-photo hook | 1.0 only |
| Schema | `people.photo_url` and `memories.photo_url` (1.0 tables, `20260615…`); `captures.source` admits `photo` (`20261002…`); the plan's memory model gives **Shared moment** a `photo_ids?: uuid[]` detail | Columns exist in 1.0; nothing in 2.0 reads them; no bucket exists ("0 buckets. Photos have never left the device.") |
| `app.json` | `NSPhotoLibraryUsageDescription` / `NSCameraUsageDescription` ("…attach them to memories in your garden") | Present; the plan's Phase 0 item 10 asks for the permission list to match an allowlist |
| `KINSHIP_2_COMPLETE_PLAN.md` | Capture row "Manually selected photo: `source=photo`; EXIF date + user caption; image stays in private storage; **model sees caption, not image, in V1**" (Later); Phase 0 item 9: 2.0 uses a private Storage bucket `photos/<user_id>/…`, signed URLs, EXIF location stripped; the value/cost table rates photo input **High** privacy (faces, locations), "only user-picked photos; no library scanning", Later | Planned, not built |
| D2 | Photos are on the never-sent-to-the-provider list unless a future capability is explicitly approved | In force |
| Contract §4 | Photo radius 10 in the approved token set | A token only |

So the legacy groundwork is real: a picker, a local store with the right account semantics, two columns, a capture source, a memory detail and a permission string. What is missing is everything that makes photos a 2.0 capability: a private bucket, a photo entity with provenance, the person/memory attachments, the UI, and the privacy decisions below.

## 2. The two capabilities, as the founder framed them

1. **A person photo**: optional, user-chosen, one per person, replaceable and removable at any time. It is identity, like the sprig or the bloom; it changes nothing about how Kinship treats the person. No person is ever asked for one; no empty frame says "add a photo" on Today (the design must be complete without it, as the no-photo variants show).
2. **Memory photos**: a photo attached to a shared moment, an experience or several people, with an optional **user-authored caption**. The caption is the only text that exists about the photo; Kinship never writes one. A memory photo is a source-backed item like any other: it carries who attached it, when, and to which memory, and it can be detached or deleted like a line.

## 3. What Kinship must never do with a photo (design rules, carried into the prototypes)

- Never infer a name, a face, an event, an emotion, a place or a relationship from an image. No face detection, no tagging suggestions, no "is this Ben?", no album scanning, no auto-import of recent photos.
- Never send an image to the AI provider (D2). If a caption is captured as a Tell, the caption text may be extracted; the image is not.
- Never make a photo mandatory, and never make its absence visible as a gap.
- Never let a photo change ranking, eligibility, frequency or anything in Today's choice (a Moment with a photo is not more important).
- Never show a photo on the lock screen or in a push.
- Sensitive memories (health, death, conflict, money) show no memory photo on Today even if one is attached; the photo stays on the person's page behind the same restraint as the line.

## 4. The minimum architecture and privacy decisions it will require

| # | Decision | The default this exploration assumes | Why it is a founder decision |
|---|---|---|---|
| PH-1 | **Where photos live**: device-only (as 1.0) or a private Storage bucket (`photos/<user_id>/…`, RLS, signed URLs) | Bucket, so photos survive a new phone and sync with the memory they belong to | Cost, the "photos have never left the device" fact in the plan, and the privacy policy both change |
| PH-2 | **Strip EXIF location** (and whether to keep EXIF date as the memory's `date` hint) | Strip location always; offer the date as a suggestion the user confirms, never applied silently | A date hint is useful; a location is a leak |
| PH-3 | **Encryption at rest and in transit** beyond the provider's default (D11 scope) | Provider default plus signed URLs with short expiry; client-side encryption deferred | D11 was decided for text; photos raise the stakes |
| PH-4 | **The data model**: a `photos` table (id, user, storage path, width/height, created, caption, caption_source, attached_to: person / memory, many-to-many for several people) vs. reusing `photo_url` columns | A `photos` table with explicit attachments; the 1.0 columns stay unused | `photo_url` on a row cannot carry provenance, several people or deletion semantics |
| PH-5 | **Provenance**: a photo is a source like a note; the caption is a quotation of the user | Yes; the UI shows "Your caption · May 3 · attached to …" | Consistent with "every durable statement has a source" |
| PH-6 | **Captions and extraction**: whether a caption is a Tell (goes through extraction) or stays a label | A label by default; the user can "Tell Kinship about this" separately | Keeps D2's boundary visible: the caption, not the image, might be sent |
| PH-7 | **Permissions**: photo library (limited access first), camera; the usage strings; the Phase 0 allowlist | Limited library access; the picker only; strings rewritten for 2.0 | Phase 0 item 10 asks for the permission list to be tested |
| PH-8 | **Deletion and export**: photos in delete-account v2 and export (SET-04/05, the trust floor) | Both include photos; deletion is immediate from the bucket | Trust floor scope grows |
| PH-9 | **Remembered / Paused people and photos** | A remembered person's photo stays on their page, never on Today (D13) | Grief: a photo of someone who died is the most sensitive object in the app |
| PH-10 | **Where it sits in the roadmap** | D · Explore later, after the trust floor; design can proceed now | CC-25's buckets are the founder's |
| PH-11 | **Cost ceiling** | The plan's estimate (≈ 36 GB at 6,000 users × 20 photos) stands; a per-user cap is a decision | Storage and egress are the first real variable cost |

## 5. What the prototypes show

In both Overgrown and Fragments: the default is no photo and is complete; a person photo, if the user chose one, takes the place of the person's mark (the bloom silhouette becomes the frame; the duotone plate becomes the photo with a scrim); a memory photo, if the user attached one to a memory that is relevant to this Moment, is shown as the picture with the user's caption in quotation marks and its own source line ("Your caption · May 3 · attached to …"). Which memory photo is "relevant" is a rule to be written when the capability has its brief; the prototype assumes the same person and the same kind of memory (a race), and claims nothing more. The images in the prototype are drawn stand-ins; no photograph of a real person is in the repository.
