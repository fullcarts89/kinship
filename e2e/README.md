# Acceptance harness

How a founder scenario is proven before a build reaches the founder's phone. The rule (14 Oct): every
checklist step passes on the simulator first, with the live model, the founder's exact People (Anthony,
Anthony Lopez, Sam Eden, Sam Doughty, Chris, Ben, John), data like theirs and every reply shape the model
gives. Local test accounts only; nothing here touches production.

## Evidence tiers

Report each tier on its own: **UNIT · INTEGRATION · BLACK-BOX · LIVE-MODEL · NATIVE-SIMULATOR ·
FOUNDER-DEVICE**, each PASS / FAIL / NOT RUN / NOT APPLICABLE. Only FOUNDER-DEVICE makes an item VERIFIED.

| Tier | What runs | Stand-ins |
|---|---|---|
| UNIT / INTEGRATION | `npx jest`, `deno test supabase/functions` | Fakes for the server and the model |
| BLACK-BOX | `e2e/blackbox/*.blackbox.tsx`: the real screens, session classes, sync engine and network client, against the local Supabase stack and the real ai-gateway, driven only through what's on screen | sql.js for SQLCipher; mocked routing, auth context, safe area, contacts, hand-off and AppState; the model replayed from captured replies |
| LIVE-MODEL | The same suites with each model call forwarded to the real Messages API (`LIVE=1`) | As black-box, minus the replay |
| NATIVE-SIMULATOR | The real app built for the simulator against the local stack, driven by taps | The simulator's Contacts and Messages |

## The local stack

Colima (Docker), then from this checkout:

```bash
npx supabase start
```

```bash
npx supabase functions serve ai-gateway --env-file supabase/functions/.env.replay.local
```

`supabase status -o env > supabase/.env.harness.local` writes the local keys the harness reads (gitignored).
`.env.replay.local` points the gateway at the model stub (`ANTHROPIC_BASE_URL`, port 8790).

## The model stub

```bash
deno run --config e2e/deno.json --allow-net --allow-read --allow-write --allow-env e2e/model-stub.ts
```

- **Replay** (default): each note is answered with a captured reply from `e2e/replies/*.json`, the variant
  chosen by the test (`useReply`). The labels say where each came from ("live 10 (14 Oct, founder People …)").
- **Record** (`--record`, with `ANTHROPIC_API_KEY` from the gitignored `supabase/functions/.env.local`; set it
  with `zsh e2e/set-model-key.sh`, never in a chat): forwards each call to the real Messages API and saves the
  structured reply to `e2e/.captured/` (gitignored). New shapes worth keeping are copied into `e2e/replies/`.

## Running the suites

```bash
npx jest -c e2e/jest.blackbox.config.js
```

```bash
LIVE=1 npx jest -c e2e/jest.blackbox.config.js e2e/blackbox/live.blackbox.tsx
```

(the second needs the stub in record mode). One suite at a time: the stub's chosen reply is shared state.

| Suite | Founder scenario |
|---|---|
| `k4.blackbox.tsx`, `k4flow.ts` | K4 / K15–K17: "Anthony and Sam love ice skating with Chris", runs A and B, every captured shape: one memory, the right people, every page agrees, the card lists everything kept |
| `k4legacy.blackbox.tsx` | K4 told again on an account with the 12 Oct line |
| `k20.blackbox.tsx`, `k20flow.ts` | K20 / K19 / K23: "I need to call John tonight" in every shape, fresh and told again the next day; Today, the return loop from Today and from John's page |
| `k19.blackbox.tsx` | K19: Today never a bare header, told, asked, kept or reopened |
| `today.blackbox.tsx` | N6 / K11 / K13 |
| `k10.blackbox.tsx`, `dates.blackbox.tsx` | K2 / K10 dates |
| `removal.blackbox.tsx` | K14 / N9 / N10, also on a phone-like profile. The note's weekday is never the run's own (N15): Friday, or Tuesday from Thursday to Saturday (UTC) |
| `live.blackbox.tsx` | K4, K20, K23, K2, N6, K14 with the live model |
| `b3.blackbox.tsx` | Phase 4B B3 residence: C with exact Undo, E (Susan moved / Still there), D, F, the Pilsen finding, the §21 rows through the real database, N13 (a line edited on Susan's page is read again; then a move, a bare replacement, a correction, Undo; the next Tell's safety net) and N14 (a bare "Hollywood" next to "California"). The local database needs the B2 and B3 migrations (`npx supabase migration up --local`) and this branch's gateway. Replies `e2e/replies/b3-*.json` (live, 16 Oct); with `LIVE=1` it runs on the live model |
| `b4.blackbox.tsx` | Phase 4B B4 multi-item closure and its exact Undo (brief §8 rule 2, §10): res-006 through the screens (California → Alameda → "moved to Colorado": the Kept card says both lines it replaces, both close, Undo brings both back exactly), "Not this" on the closer from What Kinship knows (which lists both "Before:" lines), an edited Alameda beside California with a plain "lives in Colorado" ("Susan moved" closes both; Undo returns the edited line; "Still there" closes nothing), and an edited California among the closures closed on the user's own "moved to" (§21). Same stack and replies as `b3`; no new migration |
| `k28.blackbox.tsx` | K28 + K26 (founder, 17 Oct): Susan's wedding "this fall" with no day, through the real page, sheet and return check: offered under "You could mention" with the fixed suggestion, Messages opened, "Did you reach Susan?" on the page and on Today, Not yet (nothing), Yes (exactly one conversation in the user's own word, nothing attached, no reason), "Anything worth remembering?" → Nothing today, survives reopening and sync, retracted in What Kinship knows, and a channel that never opened asks nothing; a sparse page's generic hand-off; Fluffy's own line before the shared ice-skating memory on Chris's follow-up. Accounts past first use (the K20 note, replayed); Today's reasons refreshed by hand after seeding (the ten-minute throttle) |
| `k27.blackbox.tsx` | K27 (founder, 18 Oct, CC-27): "Chris has a dog named Fluffy" told (Fluffy becomes Chris's related dog), Fluffy's vet appointment yesterday, Today's follow-up → Ask how it went → Messages → back → Yes → "Anything worth remembering?" → Tell Kinship → "Fluffy will make a full recovery": kept for Chris, never "Who is Fluffy?", never held as his health; and the same on an older account where note 1 was a plain fact with no row. Replies `e2e/replies/k27-*.json` (live, 18 Oct); with `LIVE=1` it runs on the live model. Needs this branch's gateway |
| `b6.blackbox.tsx` | Phase 4B B6 the residence dry run (brief §14): the session's first pass asks the gateway once (one `semantic_runs` row); California + Alameda + a Denver stay reported as exact ids and buckets in `residence_backfill_report` (the reply content-free), then "moved to Colorado" (history-eligible, nothing suspect), a rerun replacing the rows in full, `already_reported` without `again`; a line removed since a run loses its rows on the next; every user table byte for byte unchanged, and every public table's row count unchanged save the two report tables, around each run (`tableCounts`); another account's token with this account's id gets its own empty report, and the app's client can't read the report tables. Same stack and replies as `b3`; no new migration |
| `b7b8.blackbox.tsx` | Phase 4B B7 and B8 (brief §13; §4, §11): California → Alameda: the Portrait's Lately says "Susan lives in Alameda" once (never also California), What Kinship knows one composed line under Background; "moved to Colorado": Background says "Moved to Colorado" and, under Before, "Previously lived in Alameda, California" dated by that note, the Portrait the move with its "was:", then Undo from the Kept card brings the composed line back and clears Before; a plain "lives in Colorado" and an "Actually … Oakland, not Alameda" correction leave no history; a stay in Denver sits in its own section beside the residence, no empty section shown. Same stack and replies as `b3`; no new migration. B7 and B8 are app-only, but the gateway must be B3 or later (readings), so run this branch's own gateway (`GATEWAY_URL`) when the shared one is older |
| `showingup.blackbox.tsx` | WS-3 (FD-30d/e, 30 Oct): "I need to call John tonight" (the K20 note, replayed as a promise) is Today's Moment on its day ("You said you'd call John tonight." · Message John); its detail says "It's due today."; Message → back → "Did you call John tonight?" with "Didn't happen" offered; Not yet keeps it; Yes records one conversation (`moment_type` promise) and keeps the promise (status resolved; it leaves "You said you'd", stays in What Kinship knows). Then a thread told 42 days ago (`earlierLine`) and Felix's wedding ten days ahead: "Did Felix decide?" · Ask Felix; the sheet mentions the wedding with its opener and, beneath the channels, the one SUA-1 line ("You could invite them to dinner."); the line tapped opens Messages and nothing else; back → Yes → "Did you make a plan?" → Yes → "Anything worth remembering?" → Nothing today; one conversation (`moment_type` thread), the thread untouched, the check-in gone. Needs migration `20261030120000` on the local database; the K20 helpers (`k20flow.ts`) now find John's line as the Moment or the quiet line |
| `b5.blackbox.tsx` | Phase 4B B5 the composed residence line (brief §9, §12): "Lives in Alameda, California" in What Kinship knows from two notes with "and 1 other note" (nothing composed stored); the sheet of its notes, each with its own source, Edit and Not this; Not this on California from the sheet leaving "Susan lives in Alameda" (California retracted, its reading gone); California → Alameda → "moved to Colorado" → Undo from the Kept card, the composed line back with the same server rows. Same stack and replies as `b3`; no new migration |

## The simulator build (NATIVE-SIMULATOR)

Xcode 27 builds launch on iOS 27 since N11 (`plugins/withSceneLifecycle.js`). The e2e-sim environment
(eas.json) points the app at `http://127.0.0.1:54321`.

```bash
EXPO_PUBLIC_V2_ENTRY=1 EXPO_PUBLIC_E2E_LOCAL=1 npx expo prebuild --platform ios --no-install --clean
```

Prebuild rewrites `package.json`'s `ios`/`android` scripts; discard that change. Then, in a UTF-8 locale
(CocoaPods fails without one):

```bash
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

Build Release for the simulator with the e2e-sim variables exported (`EXPO_PUBLIC_V2_ENTRY=1`,
`EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` from eas.json's e2e-sim
profile, `EXPO_PUBLIC_ANALYTICS_ENABLED=false`, `EXPO_PUBLIC_E2E_LOCAL=1`, `SENTRY_DISABLE_AUTO_UPLOAD=true`):

```bash
xcodebuild -workspace ios/Kinship.xcworkspace -scheme Kinship -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath <dir> build
```

Keep code signing on (Xcode signs simulator builds locally): with `CODE_SIGNING_ALLOWED=NO` the keychain
has no entitlement and the app can't keep a session. `eas build --local --profile e2e-sim` also works but is
slower and builds from git.

- A test account: `node e2e/make-local-account.mjs` (credentials in the gitignored
  `e2e/.captured/sim-account.local.json`; sign in with "Use email").
- A contact with a phone number for hand-offs (the system picker needs no Contacts permission): write a
  vCard and `xcrun simctl addmedia booted john.vcf`.
- Data like the founder's (an earlier day's line): `earlierLine` in `blackbox/localStack.ts` writes one into a
  local test account.
- Typing through the simulator tools drops text after a space: type a word at a time.
- Never stop a process by its port (`lsof -ti tcp:… | xargs kill`): Colima's forwarder holds those sockets too, and killing it takes Docker down (16 Oct). Stop the stub or `functions serve` by its own PID.
- A second stub for a branch's own replies can run beside the shared one (`STUB_PORT=8791`), with the gateway's env file pointed at it and `STUB_URL=http://127.0.0.1:8791` for the suites.
- A branch's own ai-gateway can run beside the shared `functions serve` too, without stopping it: `deno run --config supabase/functions/deno.json --allow-net --allow-env --allow-read supabase/functions/ai-gateway/index.ts` from that branch (port 8000), with `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from `supabase/.env.harness.local` and `ANTHROPIC_BASE_URL` set to the stub. Then `GATEWAY_URL=http://127.0.0.1:8000` sends the suites' gateway requests there (and only those). It skips the platform's JWT check in front of the function; the gateway checks the user itself.
