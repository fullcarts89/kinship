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
