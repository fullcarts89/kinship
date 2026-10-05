# Kinship 2.0: hand-off to the next session

You are taking over the Kinship 2.0 build. The last session shipped a 2.0 app that technically worked, but it failed the founder on first open. It had no onboarding and no guidance. The screens were empty with nothing to explain them. A new user could not tell what the app was or what to do. Getting it onto the founder's phone also took many rounds of wrong instructions. Read this whole prompt before doing anything.

## Project

- **Repo:** `fullcarts89/kinship`. Expo SDK 54 with expo-router and EAS builds. Supabase project `kddpxiiyxgvjrtpdkvio`.
- **Working branch:** `claude/awesome-edison-3cuf6z`. 4 commits on it are not yet on `main` (`main` is at `50893b8`, the merge of PR #16):
  - `9ec20f3`: flags. At launch the app asks the server first (4 s timeout), falls back to the cached copy, and keeps answers that arrive late.
  - `cc9fc0c`: EAS profile `testflight-v2`. It is unused, because there is no App Store Connect app record.
  - `eda48b5`: EAS profiles `dogfood-v2` and `testflight-v2` now carry `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_V2_ENTRY=1`.
  - `a21465e`: `src/platform/entryShell.ts` now reads `process.env.EXPO_PUBLIC_V2_ENTRY` literally, so release builds inline it. Adds `app/__tests__/launchRouting.test.tsx`.
- **Docs to read first:**
  - `docs/phase2/session-summary.md`
  - `docs/phase2/wife-dogfood-readiness.md`
  - `docs/phase2/quiet-herbarium-build.md`. §6 holds the decision to defer the promise and onboarding screens. That decision was wrong for this audience.
  - `docs/phase2/v2-flow-friction-audit.md`

## Standing rules (non-negotiable)

- Never put model identifiers in commits, PRs or code.
- Migrations are forward-only. They reach production only by merging to `main`.
- Merge PRs with "Create a merge commit".
- Never paste secrets.
- Never look up accounts by email. Ask the founder for a user id, or read it from logs of their own device.
- Never enable flags globally. Enable per user id only, and only with the founder's explicit yes for that specific id.
- STOP before giving the founder's wife the build. She gets it only on the founder's go-ahead.
- Do not build Garden, Landscape, Intentions, Opportunity Engine, Ask, subscriptions or calendar.
- Keep to the design fidelity lock: the Quiet Herbarium tokens and components in `src/ui` and `src/design/tokens.ts`, and the approved canvas boards.

## Current state on the founder's phone

- The founder's iPhone has the internal-distribution build of profile `dogfood-v2`. Its user agent is `Kinship/2`. It is signed in as user `97748654-19f8-4f2f-a7e6-81c5aa0e5e57`.
- Flags `shell_v2`, `tell`, `ai_extraction` and `memory_v2` are ON for two users, via `user_flag_overrides`:
  - `21bb55a0-39fb-491c-adfd-52c637d16de1`, an id the founder gave.
  - `97748654-…`. The previous session enabled this one after reading the id from the phone's logs, without asking first. **Ask the founder to confirm `97748654` is theirs.** If not, turn it off.
- Flags are off for everyone else.
- The founder now sees 2.0. Their verdict: "incredibly basic", "awful", "no onboarding, no guidance… they don't even know what this is."
- Their 1.0 data (`persons`, `memories` and other tables) is not visible in 2.0 (`people`, `captures`), so the app opens empty.

## The task: make the first-run experience understandable

Build this, then prove it on the device:

1. **First-run intro after sign-in.** Write 2–3 short screens in the 2.0 style:
   - what Kinship is;
   - how you use it: tell it things in your own words;
   - what you get back: a timely nudge, with what you said last time.

   Then show the existing one-time consent sheet. Show the intro exactly once per account; skip it on later launches. **Before writing copy, ask the founder whether to draft it in the approved voice or use wording or a reference they provide.**
2. **A guided first step.** Add your first few people, from contacts or by typing names. No user should ever land on an empty app with no next step.
3. **Empty states that teach:**
   - Today with nothing to show explains what will appear there and gives one example of something to tell it.
   - An empty People list invites you to add someone.
   - A person with no notes shows how to add one.
4. **Optional, ask first:** bring the founder's 1.0 people into 2.0 so their own app isn't empty. If it needs a migration, it must be forward-only and go in via PR.
5. Update the readiness doc. "Ready" must now include: **a first-time user can say what the app is and do one useful thing within 60 seconds, without help.**

## How to work (the failures from last time, and the rule for each)

**1. Judge the product as a first-time user, not as the builder.** Before calling anything ready, walk through a brand-new account from install to first useful moment. Screenshot every screen. Ask yourself: would someone who has never heard of Kinship know what it is and what to do? Screenshots of screens full of seed data hid how empty a real new account looks. Always screenshot the empty, new-account state too.

**2. Don't defer the things a real user meets first.** If the brief says "defer X" and X is what a new user sees on first open, raise it with the founder before shipping. Don't decide it alone.

**3. Verify before giving any instruction.** The founder is not a developer, and they followed several wrong instruction sets. Before telling them to run, tap or install anything, check it first:
- **EAS config:** resolve the profile's env from `eas.json`, including `extends`.
- **Release bundle:** run
  ```
  EXPO_NO_DOTENV=1 NODE_ENV=production npx expo export --platform ios
  ```
  with the profile's env exported. Then run `strings` on the `.hbc` file:
  - the Supabase URL must be present;
  - the new screen copy must be present;
  - no `EXPO_PUBLIC_*` name should appear where it should have been inlined.
- **Launch routing test:** `app/__tests__/launchRouting.test.tsx`.
- **Full checks:** `npx jest` (280/280 at hand-off) and `npx tsc --noEmit` (clean).
- **Server state:** for flag questions, run the SQL with `request.jwt.claims` set to the user, then `my_flags()`.

**4. Lessons from the install mess:**
- A release build doesn't load `.env.development`. Every `EXPO_PUBLIC_*` value must be in the EAS profile's `env`, or the app falls into mock mode, which always shows 1.0.
- Expo inlines `process.env.EXPO_PUBLIC_X` only when it is written literally. Never read it through a variable or a default parameter.
- The installed app is a standalone build, not a dev client, so it has no server picker.
- There is no App Store Connect app record, so TestFlight and auto-submit fail. Use `dogfood-v2` (internal distribution, QR install). A new phone must first be registered with `npx eas-cli device:create`.
- `eas` isn't installed globally on the founder's Mac. Use `npx eas-cli …`.
- The founder's phone may be signed in to a different account than the one they name. Check the JWT subject in Supabase `edge_logs` (`request.sb.jwt.authorization.payload.subject`, filtered by user agent `Kinship/%`) before enabling anything. Get the founder's OK before reading their logs or enabling an id.
- The app picks 1.0 or 2.0 once per launch. To pick up a change, the user must fully close the app from the app switcher and reopen it.

**5. Instructions to the founder must be short and exact:**
- numbered steps;
- exact commands;
- what they should see after each step;
- what to do if they see something else.

Say plainly what you verified and what you could not, for example: "I can't see your phone; the device is the one unverified step." Don't claim certainty you don't have.

**6. Confirm before acting on anything outside the request.** That includes enabling an account, reading their device's logs, migrations and merges. Approval for one action doesn't cover the next.

## Definition of done

- On the founder's phone, signing in to a fresh account shows an intro that explains Kinship, then consent, then a guided first step. It ends with at least one person and one kept note. Every empty screen says what to do.
- The founder confirms it on the device, with screenshots.
- Tests cover these cases:
  - the intro shows once and only once;
  - empty-state copy appears on empty screens;
  - launch routing still passes.
- `npx jest` and `npx tsc --noEmit` pass. The work is merged by PR with a merge commit.
- Only then, and only with the founder's go-ahead, prepare the wife's build. Register her device, she signs in, the founder sends her user id, and you enable her flags only.
