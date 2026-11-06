# Implementation assessment

**Status: ASSESSMENT ONLY · no build authorised.** File references are to `claude/alpha-integration` (the alpha release candidate), because that is where the Electric Garden system, SUA-1, promise moments, Ask v1 and person photos exist. Sizes are rough design-side estimates (S = days, M = about a week, L = several weeks), not commitments. Nothing below needs a migration except where it says so.

## The headline

**Almost all of the truth model is reused unchanged.** The design asks for:
- presentation changes on top of existing models;
- **one new deterministic module** (ideas);
- **two new read paths** (a person's notes for Pages; spans on the review for mapping);
- **one new write** that is really an existing write (an intention is a Tell).

Extraction, provenance, sensitivity, identity questions, told-again, Today eligibility, the Portrait rules and the return loop are untouched.

## 1. Reuse as is (model and rules)

| Area | Code | Used for |
|---|---|---|
| Today selection, thresholds, quiet lines, return check, first use | `src/features/today/todayModel.ts` | Which poster, which deck cards, when the deck ends |
| Moment detail content | `momentDetail.ts` | The expanded moment's line, why now, timing, source |
| You could mention | `mentions.ts` | Mentions, and the candidate preference for ideas |
| SUA-1 contexts, exclusions, outcome kinds, content-free analytics | `suggestions.ts`, `src/platform/analytics.ts` | Idea eligibility and exclusions; the G3b outcome question |
| Hand-off and return | `useHandoff.tsx`, `HandoffSheet.tsx` | Message / Call / FaceTime / WhatsApp, the return check |
| Portrait sections and caps | `src/features/person/portraitModel.ts` | The Now lens, unchanged |
| What Kinship knows sections, Before, composed lines | `recordSections.ts`, `composedRecord.ts`, `PersonRecordView.tsx` | The Knows lens |
| Between you trail | `trail.ts` | Between you, plus showing-up entries in Pages |
| Line sheet: Edit, Not this, person, date | `ItemSheet.tsx`, `src/features/tell/Pickers.tsx` | Line sheet, review date token |
| Source view with marked runs and Option A partials | `NoteView.tsx`, `app/v2/source/[captureId].tsx` | Source, and the rendering primitive for Pages |
| Review model: held, which-person, replaces, known, spans with `start` and `quote` | `src/features/tell/reviewModel.ts` | Review states. **Spans already carry offsets**, so phrase ↔ line mapping needs no pipeline change |
| Drafts, consent, Tell flow | `drafts.ts`, `ConsentSheet.tsx`, `TellFlow.tsx` | Tell page |
| Ask v1 word retrieval | `src/features/ask/retrieve.ts` | People search over your words |
| Person photos (user-chosen, on this phone) | `PortraitView.tsx` (`photoUri`, "Add a photo") | Posters, tiles, headers |
| Tokens, botanicals, fonts | `src/design/tokens.ts`, `assets/images/garden/` | The visual system |

## 2. New components (presentation)

| Component | Replaces / extends | Size | Notes |
|---|---|---|---|
| `MomentPoster` (photo · type · tender) | Today's headline block | M | Pure view over the existing moment. Type and tender variants need art direction in Night too |
| `MomentDeck` (horizontal snap list + end card) | Quiet lines | S | `FlatList` horizontal with `snapToInterval`; becomes vertical at large Dynamic Type |
| Expand transition (card → moment) | Moment detail sheet | M | Reanimated 4 layout transitions or a measured overlay. Shared-element APIs in Reanimated 4 are still experimental, so the safe build is: measure the card rect, animate an overlay's clip and corner radius, then mount the moment |
| `MomentView` (full screen) | `MomentDetailSheet.tsx` | M | Same content, plus Ideas and "I did this" |
| `IdeasDisclosure`, `IdeaCard`, `AssistSheet` | `SuggestionLine.tsx` | M | Ways as rows. Help me start and Keep it in mind are each one subview |
| `PersonNotebook` with lenses (Now · Pages · Knows) | `app/v2/person/[id]/index.tsx` and `knows.tsx` | M | Knows moves from its own route into a lens; keep the route as a deep link |
| `PagesTimeline` | new | M | Renders notes with `NoteView`'s marked runs, filtered to this person, interleaved with trail entries |
| `PeopleIndex` (date band + equal tiles + A–Z rail) | `PeopleView.tsx` | M | `SectionList` with letter sections. The rail only above about 25 people |
| `UnifiedSearch` | "Find someone" + "Ask your memory" | S | Names locally; words through `retrieve.ts`; results link to Pages |
| `TellPage` with the understanding sweep | `TellSheet.tsx` | S–M | The sweep needs the spans back from the gateway first; until then the review opens directly |
| `ReviewWithWords` (your words card, mapping, grouped lines, inline sentence edit) | `ReviewSheet.tsx` | L | The largest UI change. The model is unchanged, but layout, mapping and in-place edit are new |
| `ToastWithUndo` | Kept card | S | Already exists in shape (Kept card plus Undo) |

## 3. New logic (small, deterministic)

| Logic | Size | Where | Notes |
|---|---|---|---|
| **`ideas.ts`**: grounded ideas from current lines | M | Next to `suggestions.ts` | Same inputs and exclusions as SUA-1; output `{category, title, groundIds[]}`. Option A titles are templates (no model); option B needs grounded phrasing (see Decisions) |
| **Pages query**: notes that yielded a line about this person | S–M | Store / repositories | Source ids already exist on every item (DB constraint). This is a distinct-captures-by-person read, newest first |
| **Intention save** | S | Tell pipeline | Writes a note (`source = "intention"` or the existing manual-entry source) with the user's sentence; the pipeline yields one promise. Needs a decision on whether it runs through the model at all, or is written directly as a user-written promise (preferable: deterministic, no model, `user-written` evidence) |
| **Promise day edit** ("Bring it back Saturday") | S | Existing edit path | A user edit of a promise's due day. User edit wins (trust invariant 4) |
| **People date band** | S | `PeopleView` model | Next 14 days, dated non-sensitive lines and sourced birthdays, soonest first; never another order |

## 4. Needs a product or architecture decision before building

| Item | Why it can't just be built | Decision owner |
|---|---|---|
| Retiring T4 (search-first A–Z list) | A contract §6 override | Founder |
| Ideas titles: templates vs grounded phrasing | Grounded phrasing touches the model and copy-grounding rules | Founder |
| Intentions (Keep it in mind) | Coverage row 33 lists Intentions as Explore later. This would pull "Intentions v0 as a user-authored sentence" forward, and make it user-facing, not only a relevance signal | Founder |
| Help me start (openers) | D9 says "later, only on request" | Founder |
| Tender moments for the user's own promise about a hard time | RSN-09 (hard-time reasons) is unbriefed; RSN-06 promise exclusions may exclude these today | Founder + RSN-09 brief |
| Pages as the "story" surface | Coverage row 13 "Your story together" is NOT BUILT and "timeline-heavy CRM UI is on hold" | Founder |
| Find it (web hand-off) | CC-28 R7/R8: no commerce or partners until G5 | Founder (later) |
| Night appearance of posters, type posters and tender | Not designed in this prototype | Design, then founder |
| Understanding sweep timing | Needs spans before the review renders; today the review arrives with them, so the sweep is a 1–2 s presentation delay on top of real latency. Measure first: **calibration says about 1.5 s per proposed memory** | Engineering, measured |

## 5. What does not change (explicitly)

- The schema: no migration for anything above, if intentions are written as user-written promises through the existing note/item path. If a new note `source` value is needed, that is a small forward-only migration, merged to `main` only.
- The gateway, the extraction prompt, sensitivity classes, the identity question, told-again, Option A partials.
- Today eligibility and scoring, the Portrait rules, the return loop, T12.
- Flags: anything built ships behind a per-user flag, enabled only with the founder's yes per id.
- Gates: `app/__tests__/firstRun.test.tsx` and `.maestro/fresh-install.yaml` stay as they are; first run in this design satisfies both.

## 6. Suggested build order (if approved)

The order puts the loop and trust ahead of the look:

1. **Review with your words + mapping** (H1, the trust moment).
2. **Moment expand + Ideas + Assist (Message / Call / Keep it in mind)** on top of SUA-1, with the outcome question (H2).
3. **Person notebook lenses + Pages.**
4. **Today poster + deck.**
5. **People index + unified search** (after T4).
6. **Help me start** and the tender variant (after their decisions).

Each step needs:
- its own brief and the founder's go;
- simulator acceptance on the founder's real path (rendered UI, real gateway, live model);
- evidence levels reported apart.

Readiness labels stay NOT READY until a native pass.
