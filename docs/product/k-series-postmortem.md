# K-series: why the internal gate passed and the phone failed (13 Oct 2026)

*The founder ran `k-series-native-checklist.md` on build `bc43dfd` (merged, ai-gateway v9, migration applied). K4 rows 1 and 1b, K2 and N6 failed, and three latency problems showed up (ledger K8–K14). Roadmap work (H4, B2) is stopped for this reliability gate. Nothing below is a fix.*

## A. Postmortem

The internal gate tested the founder's **sentences**, not the founder's **path**. Every stage the phone exercised but the tests didn't is where these failures live. The report's phrase "exact founder scenarios replayed through the real code" overstated what ran.

### K4 ("…with Sam", then a question loop)
- **What the tests did:**
  - Ran the real pipeline and answer code in-process, with the model's reply written by hand in seven shapes.
  - Built the answers in code (`answersFor`) and sent them straight to the answer path.
  - Persisted and synced through TypeScript stand-ins (`FakeGateway`, `FakeServer`).
  - Asserted the stored row and the page models.
- **What they never did:**
  - Call the live model.
  - Render the review sheet, or tap "Someone else" and its person picker.
  - Touch the Kept line's own tappable words.
  - Run the real database functions (`write_extraction`, `resolve_capture_review`) or the real sync.
  - Re-enter the same note.
  - Run on a phone.
- **Today's probe:** all seven reply shapes × rows 1 and 1b save the words intact through that path. So the failure is in a skipped boundary, not in the shapes the tests had.
- **Leading lead (not proven):** a pick applied to Chris's kept line as a correction ("this line is about Sam Eden") moves the line and rewrites "Chris" → "Sam". That is exactly the observed words.

### K2 ("last Friday" → "By Monday, Oct 12")
- **What the tests did:** asserted the promise lifecycle given a stored due date on a fixed clock, and the server's parsing of hand-written date texts.
- **What they never did:** run the exact sentence; or trace a date from the model's reply through review, answer, correction and display to the stored row.
- **Today's probe:** the server parses "last Friday" as Fri Oct 9 for every hand-written shape, held for a yes as an ambiguous day. So Oct 12 enters somewhere the tests never looked: the live model's actual reply, the answer or correction path, or the app's display.
- **Found in passing:** for an ambiguous day, the answer path checks `detail.date`, but promises keep their day in `detail.due_date`.

### N6 and Today
- **Coverage gaps:**
  - The tests restored a **server Moment** after Not yet at the Today-model level. The founder's case was the user's own "call John tonight", a **Coming up line**, not a Moment.
  - No test asserted the headline and the lines together.
- **Proven from code:** the quiet headline is computed from the Moment and the return question only (`todayModel.ts`, `quietDay`), never the lines under it. So "Nothing needs you today" above "call John tonight" is the designed output, before and after Not yet.
- **Latency:** never measured. Every test uses instant stand-ins and fixed clocks.

### Why model variation isn't an excuse
Two runs of one note behaving differently is a product bug if the deterministic code lets a reply shape lose Chris or loop. The tests covered seven shapes chosen by me, not the shapes the live model produces.

## B. What the previous coverage was
Unit tests, plus in-process integration:
- the real pipeline and answer modules;
- the real app store and sync engine, against TypeScript stand-ins;
- Today and page models built directly;
- a few component renders.

There was **no** black-box, live-model or native-simulator evidence for K4, K2 or N6.

## C. Boundaries the tests skipped

| Boundary | K4 | K2 | N6 |
|---|---|---|---|
| Live model reply | skipped (hand-written) | skipped | skipped |
| Gateway HTTP entry from the app | handler tested apart, with fakes | same | n/a |
| Real database functions and sync | stand-ins | stand-ins | stand-ins |
| Rendered review sheet and pickers | skipped (answers built in code) | skipped | n/a |
| Rendered Today (headline with lines) | n/a | n/a | skipped (model only) |
| Background / foreground (Messages round trip) | n/a | n/a | skipped |
| Timing | instant fakes | instant | instant |
| Re-entering a note | skipped | n/a | n/a |
| The native build (Hermes, React Native on iOS) | skipped | skipped | skipped |

**Test-only implementations** that duplicate production logic, to be parity-checked or replaced in acceptance tests:
- `FakeGateway`: re-implements `write_extraction`, `resolve_capture_review` and their quote checks in TypeScript.
- `FakeServer` / `FakeRemote`: sync, ownership checks and conflicts.
- sql.js in place of the device's SQLCipher.

## D. Proposed harness (closest feasible to the founder's path)

**This machine today:**
- available: iOS simulators, Homebrew, Postgres 16 (used for pgTAP), Deno, Xcode;
- not installed: Maestro, Java, Docker;
- not visible to this session: the model key.

1. **App-level black box (no installs).** Render the real screens with the real stores and sync engine, and drive them by their visible labels:
   - Tell input;
   - the review sheet and its pickers;
   - Today;
   - the person page.

   No answers are built in code and no state is injected between steps. Assert the complete rendered Today and page after every transition, including the headline invariant.
2. **The real backend, locally.**
   - **Stack:** all migrations in a local database, the real ai-gateway handler served by Deno, and the app's real Supabase client pointed at it.
   - **What it removes:** the stand-ins, for acceptance tests. They stay for unit tests, with parity tests.
   - **What it needs:** Docker (Colima via Homebrew) for `supabase start`, or PostgREST via Homebrew with locally signed sessions. Test accounts exist only on this local stack, never production.
3. **Native simulator.** A simulator build of the dogfood app pointed at the local backend, driven by **Maestro**, the tool the repo's own `.maestro` flows already assume:
   - **K4:** runs A and B, repeated, plus re-entry.
   - **K2.**
   - **N6:** "call John tonight", Message, Not yet.
   - **Removal.**

   Needs Java and Maestro via Homebrew. Until then, the session's simulator control can confirm by hand, but that isn't repeatable.
4. **Live model.**
   - **What runs:** the exact K4 sentence (≥ 10 times) and the K2 sentence, through the real prompt and model.
   - **Where the output goes:** the structured outputs are saved to a development report, never production telemetry. They are then replayed through tiers 1–3, so variation is tested deterministically.
   - **What it needs:** a model key you place in an untracked local file (or a command you run), at a cost of cents.

## E. Root-cause investigations
- **K8 (Chris → Sam):**
  - Reproduce through the rendered sheet in each reply shape and with live replies.
  - Test the question's "Someone else" against the Kept line's own person picker.
  - Check whether picks reset when the questions change under an open sheet.
  - Moving a shared line's owner should never rewrite another participant's words.
- **K9 (loop):**
  - Re-enter the note through the screens.
  - Trace review-changed and re-ask paths, duplicate pending questions, question keys across sync, and merging with the earlier memory.
- **K10 (date):**
  - Capture the live structured reply.
  - Trace date text → parsing → `due_date` → stored row → review line → page, including the ambiguous-day promise branch (`date` vs `due_date`).
  - Matrix on a fixed clock (Tue Oct 13, 2026): yesterday, last Friday, this Friday, next Friday, Friday, last Monday, tonight, tomorrow, Oct 9, October 9, in October, in 2026. Precision is never raised, and a day is never substituted.
- **K11:** one derived Today state; the headline comes from everything visible.
- **K12 / K13:** development-only stage timings, with no content:
  - Tell accepted → understood → saved locally → Today rebuilt → synced;
  - Message tapped → background → foreground → return question visible.

  Find any polling, backoff or awaited sync.
- **K14:** whether removal waits on the network or a sync. The narrowest safe local removal that a sync race can't undo.

## F. What finished looks like (this gate)
Each item names the evidence level it needs:

| Item | Needs |
|---|---|
| K4 runs A and B, exact flow, repeated, plus re-entry: one shared memory; the right people linked; Chris's word kept; "Sam" kept when Not sure; no loop | BLACK-BOX (tier 1–2) and NATIVE-SIMULATOR (tier 3) |
| K4 across ≥ 10 live replies: Chris never lost or renamed; one independent question per ambiguous name; answers never cross; no loop, overwrite or duplicate; anything unsafe is asked | LIVE-MODEL, replayed BLACK-BOX |
| K2: the exact note gives Fri Oct 9, never Oct 12; the date matrix holds; precision never raised | UNIT, BLACK-BOX, LIVE-MODEL |
| Today never shows the quiet headline alongside anything actionable: after Tell, while syncing, after refresh, after hand-off, with the return question open, after Not yet, after restart | BLACK-BOX and NATIVE-SIMULATOR |
| Not yet restores one coherent Today | BLACK-BOX and NATIVE-SIMULATOR |
| Return question latency measured, within an interactive threshold | NATIVE-SIMULATOR (timed) |
| Removal leaves the screen promptly, and the server confirms afterwards | BLACK-BOX and NATIVE-SIMULATOR (timed) |
| Full Jest, Deno, pgTAP, typecheck, lint, relevant evals | as before |
| Independent reviewers challenge the result | review |
| The founder's short native check | FOUNDER-DEVICE (only then VERIFIED) |

The report will keep UNIT, INTEGRATION, BLACK-BOX, LIVE-MODEL, NATIVE-SIMULATOR and FOUNDER-DEVICE evidence apart.

## G. Reliability gate results (13 Oct, night)

Branch `claude/native-pass-13oct`: `ca48f33` (K10), `959ecec` (K11, K13), `ae17ba4` (K8, K9), `6e4e831` (K12, K14), `512d44c` (N9, N10). Each was reproduced before it was fixed. Nothing is VERIFIED.

**Harness tiers used.** BLACK-BOX means the real screens, session classes, network client, database functions and ai-gateway, over a local Supabase stack, driven only through what's on screen. Its stand-ins are sql.js for SQLCipher; mocks for routing, auth context, safe area, contacts, hand-off and AppState; and the model replayed from captured live replies. LIVE-MODEL means the same path with each call forwarded to the real model (17 calls tonight, 10 earlier). The phone-like profile adds 3 ms per store statement, 250 ms per round trip, and 160 earlier lines in the account.

| Root cause | Proof |
|---|---|
| K8/K9: the model tells one sentence as one piece per person and asks "which Sam?" alongside. Each piece became a memory; the ask made Chris's own piece ask whose it was, and the answer renamed Chris. Re-telling made a duplicate | Pre-fix code, live reply: five questions with repeats, three memories, "Anthony Test goes ice skating with Anthony and Sam" |
| K10: an answered line merged into a same-words memory on another day | `k10.blackbox` on the pre-fix code |
| K11: the headline ignored the lines under it | `today.blackbox` on the pre-fix code |
| K13: Today recomputed on minute ticks; negative elapsed time | `today.blackbox` on the pre-fix code |
| K12: 21 sequential requests per note, plus a transaction per recent row per sync | Phone-like: 10.4 s Tell → screen with no model time; now 2.5 s |
| K14: removal waited for a full page rebuild; the note then said "Understanding…" for good | Phone-like, 80 lines: 727 ms; now 69 ms |

| Check | Result |
|---|---|
| K4 runs A and B, 14 reply shapes (9 live-captured), replay | 28/28: one memory, the right people, no repeat, pages agree, nothing on reopening |
| K4 on an account with the 12 Oct line, 9 shapes × A/B | 18/18: one memory |
| K4 live, 12 runs (6 A, 6 B) | 12/12, same invariants |
| K2 live, 3 runs | 3/3 "By Fri, Oct 9"; never Oct 12 |
| N6 live, 2 runs | 2/2 one truth on Today; return question 0–1 ms after foreground |
| Live model latency (12 calls) | 5.1–7.9 s, median 6.1 s |
| NATIVE-SIMULATOR | NOT RUN. The e2e-sim build of `512d44c` doesn't launch on the only installed simulator runtime, iOS 27.0, which needs the UIScene life cycle (N11). Maestro isn't installed either: its install needs the Command Line Tools updated (26.5 → 27, the founder's password) |
| FOUNDER-DEVICE | Pending: `reliability-gate-device-checklist.md` |

**Not done from F:** the native-simulator rows, pgTAP (no migration changed this gate; the runner needs Linux Postgres binaries), and independent reviewers (self-review only). **Deploy:** merge, then the ai-gateway deploy from `main`, then a new build. No migration this gate.
