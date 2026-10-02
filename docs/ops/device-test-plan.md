# Phase 0 physical-device test (exit gate)

Run on a real iPhone, using an EAS development build pointed at production Supabase. Record a result and a short note (or screenshot) for every step in the **Result** column, then paste the table into `KINSHIP_PHASE_0_REPORT.md` §17.

## Before you start

1. Make sure these are in place:
   - `ANTHROPIC_API_KEY` is set in Supabase.
   - Email confirmation and leaked-password protection are on.
   - `kinship://login` is in Auth → URL Configuration → Redirect URLs.
   - The Sentry DSN is set (for step H).
2. Build and install:
   ```bash
   npx eas-cli build --profile development --platform ios
   ```
   Install the build on the iPhone, then run `npx expo start --dev-client` and open the app.
3. You need two accounts:
   - **A:** an Apple sign-in account, or a confirmed email account.
   - **B:** a second email account.

## A. Normal use

| # | Step | Expected | Result |
|---|---|---|---|
| A1 | Fresh install, sign in as A | Home loads; no demo people | |
| A2 | Create a person | Appears in People | |
| A3 | Add a memory with a photo | The memory and photo show | |
| A4 | Force-quit, relaunch | Person, memory and photo still there | |

## B. Offline

| # | Step | Expected | Result |
|---|---|---|---|
| B1 | Airplane mode on; pull to refresh Home and People | An error or "couldn't load" state; **no demo garden** | |
| B2 | Try to add a person or memory | Clear failure message; nothing appears that wasn't saved | |
| B3 | Force-quit and relaunch, still offline | Still safe: no demo data, no crash, still signed in | |
| B4 | Airplane mode off; refresh | Real data returns; nothing was saved under another identity | |

## C. AI consent

| # | Step | Expected | Result |
|---|---|---|---|
| C1 | Settings → Privacy & Data: AI off. Open a person with notes. | No AI suggestion; the non-AI copy shows | |
| C2 | Turn AI on | Toggle saves (shows an error if offline) | |
| C3 | Open the person again | A real AI suggestion appears (production 200) | |
| C4 | Turn AI off again; reopen | No AI suggestion (server returns 403) | |

## D. Sign-out isolation

| # | Step | Expected | Result |
|---|---|---|---|
| D1 | As A (with people, a memory and a photo), sign out | Back to sign-in | |
| D2 | Force-quit, relaunch, sign in as B | B sees **none** of A's people, memories, photos, suggestions or reminders | |
| D3 | As B, open the photo picker paths and memory screens | A's photos are not reachable | |

## E. Same-account sign-out

| # | Step | Expected | Result |
|---|---|---|---|
| E1 | Sign out of B, sign back in as A | A's data loads from the server | |
| E2 | Check A's memory photos | A's photos are gone: B claimed the device in D2, which removes the previous account's photos (F0-D1) | |
| E3 | As A, add a photo, sign out, sign in as A again | A's own photo is kept (F0-D1) | |

## F. Session revocation (where practical)

| # | Step | Expected | Result |
|---|---|---|---|
| F1 | Signed in as A, background the app | — | |
| F2 | Revoke A's sessions: Supabase Dashboard → Authentication → Users → A → "Sign out user", or change A's password elsewhere | — | |
| F3 | Foreground the app and refresh | The app signs out safely, the device is wiped, and no stale data of A remains visible | |

## G. Account deletion

| # | Step | Expected | Result |
|---|---|---|---|
| G1 | Create a disposable account C with a person and a memory | — | |
| G2 | Settings → Privacy & Data → Delete account | "Deleting…", then signed out and the device cleared | |
| G3 | Try to sign in as C | Fails with the generic "Invalid login credentials" (deliberately the same message as a wrong password, so the screen never reveals whether an account exists) | |
| G4 | (Claude verifies) the server has 0 rows and no auth identity for C | Confirmed via SQL | |

## H. Sentry

| # | Step | Expected | Result |
|---|---|---|---|
| H1 | Trigger the test crash (a dev-only button, added when the DSN is set) after typing a note mentioning a person | — | |
| H2 | In Sentry, open the event and read every field: message, breadcrumbs, contexts, tags, user | None of: note text, contact or person names, email, device name, AI input or output, relationship data | |
