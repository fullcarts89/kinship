# Kinship 2.0: founder dogfood recovery pass

**Branch:** `claude/awesome-edison-3cuf6z`. Not merged. No flag, migration or edge-function change.
**Readiness:** **NOT READY** for wife dogfood. **READY FOR FOUNDER NATIVE PASS** once the build below is installed.
**Why not further:** nothing here has run on an iPhone yet (I can't run one from this environment), and the trust fixes on the server reach production only when the gateway is redeployed from `main` (see "Decisions for you").

The founder's feedback items are F1–F23 in `founder-native-feedback.md`.

---

## 1. Root causes found

| Symptom on the iPhone | Root cause | Evidence |
|---|---|---|
| No send button (first Tell, Today, person sheet); Apple button with no fill and its logo stacked; squeezed pencil | **NativeWind**, kept for 1.0, wraps React Native's `Pressable` on iOS/Android and turns a `style` *function* (`({ pressed }) => …`) into `{}`. The web build and Jest never load that wrapper, so browser renders and tests looked right. | A test that loads the wrapper exactly as the app does on a device: the Apple button's style becomes `{}`; the send button loses its size and fill. It fails on the old code and passes now (`src/ui/__tests__/nativeStyles.test.tsx`). |
| Email sign-in returned to Welcome with no error | Welcome left as soon as the sign-in call returned. AuthProvider applies the session a moment later (it first clears the previous account's data from the phone), so the app's entry saw no session and sent the user back to Welcome. | Supabase auth logs: two successful sign-ins (17:11:14 and 17:12:56 UTC) for one attempt that bounced. `signInSettles.test.tsx` reproduces it. |
| "John is the writer's brother" on Ben's page | (a) The model filed the brother fact under Ben (named in the note) and nothing checked the statement itself. (b) The prompt calls the user "the writer" and the model carried that into the statement. | Your test account's rows (structure only): fact, subject person, filed on Ben, no context page. Saved baseline of real model outputs: 22 of 397 items contain "the writer". |
| Setup skipped on the second account; consent as a sheet over Today; "Nothing needs you today." after adding Tyler | The setup gate guessed from incidental data. One old note (3 Oct) meant "set up", so setup and its consent step were skipped. First use ended as soon as one person existed. | Row counts for `97748654-…`: 1 capture from 3 Oct, 0 memories, 1 person (Tyler, 17:20 UTC). |
| Today's field floating with the tabs and a gap above the keyboard | The dock rose by the keyboard's whole height on top of a container that already ended above the home indicator, and kept the tab bar between the field and the keyboard. | Code reading; the new lift measures the real overlap (`keyboard.test.ts`). |
| Unsent note following every screen | The Today/People field is shared, and its text lived for the whole session. | — |

## 2. What changed

**Gate 1: native functionality**
- `@/ui/Pressable` opts 2.0 out of NativeWind's wrapper. ESLint forbids the raw import in 2.0 code. `nativeStyles.test.tsx` renders all 76 lab states with the wrapper on and off and fails on any difference.
- Keyboard:
  - Today's field rises by exactly the overlap, and the tab bar steps aside while you type.
  - Tap outside or drag down to put the keyboard away.
  - In a sheet, the first tap above it puts the keyboard away instead of closing the sheet (and losing your words).
- Sign-in leaves Welcome only once the app has the session. If it never arrives, Welcome says so. Email errors are said in words you can act on.
- Sends can't be double-submitted.

**Gate 2: trust**
- Server pipeline (needs a gateway redeploy):
  - "the writer" becomes "you/your", with verbs agreeing.
  - A person-statement that leads with someone else and doesn't name the filed person moves to the person it names. It is shown in the review for a yes. If that person is new, the review asks "Add John?". If two people fit, it asks which.
  - First names count for people picked from Contacts ("Ben" means "Ben Oxnard"), but only when written as a name.
- App (now, for anything already stored):
  - Statements are shown in the second person everywhere.
  - A statement plainly about someone else stays off that person's portrait and People line. It stays in What Kinship knows so you can move or edit it. That covers your existing "John is your brother" row on Ben.
- Edit on every remembered line, and "Edit the words" in the line's sheet. Forget asks Cancel / Forget.
- A correction keeps provenance: the note is never rewritten, and the item gets a `user_edit` source and an "edited" mark.

**Gate 3: activation**
- Explicit getting-started record: name (if needed) → consent (if offered) → people → first Tell → activated.
- It is kept on the account (auth user metadata, no schema change) and on the phone, and only ever moves forward. Setup resumes at the first step not done, on any phone.
- An account from before the record is decided once, then recorded: people plus memories means it's in use.
- "Activated" means the first Tell became memory. Until then Today keeps its first-use guidance.
- A first name is asked only when sign-in gave none. Apple's first-sign-in name is now kept. Today greets by name.
- Drafts belong to where they were started (general, or one person). They survive closing the app and fold to "Draft · …" when you leave.

**Gate 4: UX**
- Person page: Message · Call · Tell.
- Welcome: the promise, one example card (it opens "See how it works"), Apple → Google full width → email quiet. No carousel.
- See how it works:
  - The moment keeps Ben's hope.
  - Its last step plays the close of the loop: Yes → "Anything worth remembering about Ben?" with a reply → what Ben's page now shows.
- Today's real moment shows the event's own hope, in the note's own words.
- Consent: benefit first. The approved disclosure follows unchanged under "Who reads it".
- One primary action everywhere; the rest are quiet.
- Settings › Contacts shows what Kinship can see and how to change it.

## 3. Deviations from the brief, and why

1. **No device verification by me.** This environment has no iPhone, simulator or EAS credentials. Instead:
   - the defect is reproduced in the wrapper's own native code path;
   - a Maestro native smoke flow is added (`.maestro/smoke-tell.yaml`);
   - the release bundle was exported with the `dogfood-v2` env and checked (new copy present, env inlined).

   Your device pass below is the gate.
2. **The extraction prompt is unchanged.** "you/your" and the subject check are deterministic code after the model. A prompt change needs a paid live eval, which you authorize per PR. The free evals pass:
   - replay of the approved baseline's real model outputs: every gate passes, "the writer" 22 → 0, no false moves;
   - oracle and realistic oracle;
   - 124 Deno tests.
3. **The gateway is not redeployed.** Deploys have always been from `main` with a byte-parity check. Until then:
   - new Tells on your phone still arrive from the old pipeline;
   - the app's display guard shows them as "you" and keeps misfiled lines off the wrong page;
   - but they are filed as the old gateway filed them.
4. **The first name isn't used by understanding yet.** Passing it to the model is a prompt-input change, which needs its own eval. Today uses it for the greeting.
5. **Changed a permanent gate (`firstRun.test.tsx`).** It encoded the guess this pass removes ("an account with notes opens the app"). It now follows the explicit record and is stricter: the old-note account goes to setup. 7 cases, up from 5.
6. **The grounding test allows one new line:** "Ben was hoping to break four hours.", only in that form and only with the note's own words. You asked for it.

## 4. Automated tests added or changed

Jest 432 (up from 319) · tsc clean · ESLint 0 errors · Deno 124 · evals: replay, oracle, realistic oracle and manifest all pass.

| File | Proves |
|---|---|
| `src/ui/__tests__/nativeStyles.test.tsx` | Every 2.0 screen draws the same with NativeWind's native wrapper on; the send button keeps size and fill |
| `src/ui/__tests__/keyboard.test.ts` | The lift is the overlap, not the keyboard height |
| `src/features/welcome/__tests__/signInSettles.test.tsx` | The email bounce; leaving once; a stuck sign-in says so |
| `src/features/tell/__tests__/drafts.test.tsx` | Drafts by context; folded line with Send; the bar steps aside while typing |
| `supabase/.../voice.test.ts`, `pipeline.test.ts` (+5) | "you/your"; your exact note → John's page; "Add John?"; no false moves; contact names |
| `src/features/person/__tests__/subjectProofs.test.ts` | Your note through the real pipeline end to end; the legacy row; move and edit with provenance |
| `src/features/person/__tests__/editAffordance.test.tsx` | Edit on every line; Cancel / Forget |
| `src/features/setup/__tests__/activation.test.ts` | The record, merging, resume, legacy accounts, the name rule, first use until activated |
| `app/__tests__/firstRun.test.tsx` | Permanent gate on explicit state (7 cases) |
| `src/features/people/__tests__/settingsContacts.test.tsx` | Each contacts state has its action |
| `.maestro/smoke-tell.yaml` (new), `.maestro/fresh-install.yaml` (updated) | Native: controls drawn, Tell sends, the whole first session |

Screens: `docs/product/screens/recovery-board.png` and `screens/recovery/` (lab renders, for layout only).

## 5. Still rough

- Your existing "John is the writer's brother" row is now shown as "John is your brother", but it is still filed on Ben. It stays off Ben's portrait, and in What Kinship knows you can tap "Ben Oxnard" to move it to John.
- New Tells keep the old filing until the gateway is redeployed (see deviation 3).
- The review sheet can still rise on whichever screen you're on (unchanged; it was in the motion spec questions).
- Settings › Contacts' "Choose more contacts" only works on iOS 18 limited access.
- There is no way to rename a person in 2.0.

## 6. Deliberately deferred

- Person name and birthday editing (not needed for the loop).
- Using your first name in understanding (needs a prompt eval).
- The rule-5 cross-fades from the motion spec.
- Everything on the brief's "Do not build" list.

## 7. Decisions for you

1. **Gateway.** I recommend option (a), which matches how the gateway has always been deployed.
   - (a) Merge, then redeploy `ai-gateway` from `main` with the parity check. The new filing and voice are then live for every Tell.
   - (b) Approve deploying this branch's gateway for your native pass.
2. **A genuinely fresh account needs its four flags.** A brand-new account opens 1.0 until `shell_v2`, `tell`, `ai_extraction` and `memory_v2` are on, and the rule is your explicit yes per account. Create the account, send me its user id (Supabase › Authentication › Users), and say "enable these".
3. **Consent wording.** The approved sentences are unchanged, only reordered under a new lead line and a new button label. Please confirm, ideally with a legal read.

## 8. Your device pass: the exact journey

**Build.**
- `git fetch && git checkout claude/awesome-edison-3cuf6z && git pull && npm install`
- `npx eas-cli build --profile dogfood-v2 --platform ios`
- Delete Kinship from the phone first, then install from the link.

**Accounts.**
- A fresh account (flags enabled per decision 2) for steps 1–12.
- `21bb55a0-…` for step 13.

| # | Step | You should see | Notes |
|---|---|---|---|
| 1 | Open the app | Paper, then the welcome: the promise, the example card, a **black** Apple button with its logo beside the label, Google full width, "Use email" | Apple button not black, or logo above the text: stop and tell me |
| 2 | Tap the example card | "See how it works". On 3 of 4, "Ben was hoping to break four hours." On 4 of 4, tap **Yes**: the question arrives with a reply, then Next shows what Ben's page remembers. Got it returns to Welcome | |
| 3 | Sign in by email (fresh account) | Leaves Welcome **once** | Back on Welcome with no message = the bounce: stop |
| 4 | Setup | "What should Kinship call you?" (1 of 4). Then consent (2 of 4): what it does first, then "Who reads it". Allow understanding | Consent as a sheet over Today = wrong |
| 5 | Pick people | Pick 3–5, including someone with a sibling also in your contacts | |
| 6 | First Tell | Type a two-person note, e.g. "Ben wants to play the new Warhammer game with me and my brother John on weekends." **Keep it** is visible. Tap outside: the keyboard goes away | |
| 7 | Understood | The review: Ben's line reads "…with you and John…" | "the writer" anywhere = stop |
| 8 | Correct memory | If John is in People, "John is your brother" shows on **John's** page, never Ben's. If not, the review asks "Add John?" | Needs the redeployed gateway (decision 1). Before that, check it stays off Ben's portrait |
| 9 | Relationship page | Message · Call · Tell, all drawn the same size. Tell → type → **Send** visible above the keyboard → sent | |
| 10 | Today | "Good morning, Dana." No "Nothing needs you today." before your first memory. On Today, tap the field: it sits right on the keyboard with no tabs between | |
| 11 | Source and correction | Tap a line's provenance → the note with your words marked. Back, then What Kinship knows → **Edit** → change words → saved and marked edited. Not this → **Cancel / Forget** | |
| 12 | Drafts and handoff | Type in Today's field, switch to People: one "Draft · …" line. On Ben's page, Tell → type → close: Today doesn't show it, Ben's Tell does. Message → Open Messages → back | |
| 13 | `21bb55a0-…` | Your old "John is your brother" isn't on Ben's portrait; it's in What Kinship knows | |
| 14 | Interrupt setup | Fresh account: kill the app at the people step, reopen: resumes there | |
| 15 | Larger Text, Reduce Motion | Welcome, setup, the person page bar, the example's last step | |

Then run `.maestro/smoke-tell.yaml` on the same build if you have a simulator.
