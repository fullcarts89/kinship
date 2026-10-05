# Wife dogfood — final review

**Readiness: READY FOR FOUNDER NATIVE PASS.** Not ready for wife dogfood.

**Why not further:** nothing in this build has run on an iPhone. This environment has no device, simulator or EAS credentials. Every screenshot below is a web render of the real components (Chromium, iPhone 15 size), which is a development tool, not product approval (contract §10). The founder's native pass, using the script in §13, is the next gate.

**Branch:** `claude/awesome-edison-3cuf6z`. **Base:** `main` at `50893b8`. **No migrations**, no edge-function changes, no flag changes. The founder's wife's account has not been requested or enabled.

References: `KINSHIP_2_PRODUCT_CONTRACT.md` (the rules), `approved-design-coverage.md` (every surface), screenshots in `screens/`, side by sides in `screens/compare/`.

---

## The first session, as built

```
Welcome (promise + sign in) ─▶ Setting up 1/3: consent ─▶ 2/3: who do you want to show up for?
  ─▶ 3/3: already worth knowing + tell one thing ─▶ Today (Kept line, or "Here's what I'll remember")
  ─▶ People (the people she picked) ─▶ a relationship page ─▶ Source ─▶ correction
  ─▶ a birthday or a dated event becomes Today's moment ─▶ Message ─▶ Messages ─▶ "Did you reach Maya?"
```

| Step | Screenshot |
|---|---|
| Welcome / promise / sign in | [light](screens/welcome.png) · [SE](screens/welcome-se.png) · [night](screens/night-welcome.png) |
| Consent (setup step) | [light](screens/setup-consent.png) · [night](screens/night-setup-consent.png) |
| Contacts not asked yet | [ask](screens/setup-ask.png) |
| Pick people | [list](screens/setup-people.png) · [picked](screens/setup-people-picked.png) · [search](screens/setup-search.png) · [SE](screens/setup-people-picked-se.png) · [night](screens/night-setup-people-picked.png) |
| Contacts refused / limited / add by name | [denied](screens/setup-denied.png) · [limited (iOS 18)](screens/setup-limited.png) · [add by name](screens/setup-add-name.png) |
| Already worth knowing + first Tell | [with birthdays](screens/setup-worth.png) · [no birthdays](screens/setup-tell.png) · [SE](screens/setup-worth-se.png) · [night](screens/night-setup-worth.png) |
| Tell / Kept / review / clarification / sensitive | [tell](screens/tell.png) · [kept](screens/kept.png) · [review](screens/review.png) · [which Sam?](screens/sams.png) · [remember this?](screens/keep.png) |
| Today first use | [with people](screens/today-first.png) · [no people](screens/today-first-empty.png) · [SE](screens/today-first-se.png) · [night](screens/night-today-first.png) |
| Today with a reason | [birthday today](screens/today-birthday.png) · [birthday this week + event](screens/today-birthday-week.png) · [event follow-up](screens/today.png) · [mature quiet day](screens/today-quiet.png) · [night](screens/night-today-birthday.png) |
| People | [populated](screens/people.png) · [empty recovery](screens/people-empty.png) · [night empty](screens/night-people-empty.png) |
| Relationship page | [full](screens/person.png) · [birthday only](screens/person-birthday.png) |
| Source / correction | [source](screens/source.png) · [correction](screens/correction.png) |
| Hand-off / return | [hand-off](screens/handoff.png) · [did you reach Ben?](screens/today-return.png) · [anything worth remembering?](screens/today-after.png) |
| Offline | [offline](screens/offline.png) |
| Approved vs implemented | [pick people](screens/compare/setup-people.png) · [worth knowing](screens/compare/setup-worth.png) · [Today](screens/compare/today.png) · [confirm](screens/compare/confirm.png) · [hand-off](screens/compare/handoff.png) · [person](screens/compare/person.png) · [night](screens/compare/night.png) |

---

## The questions

### First 10 seconds — what exactly will she see?
The paper splash with one sprig (dogfood build), then the welcome: a sprig, "KINSHIP", **"Remember what matters about the people you care about."**, "Kinship keeps it for you, and helps you show up.", then three plain lines on hairlines — *Tell it what's going on with the people you love, in your own words. / It remembers, and always shows where each thing came from. / When something matters, it brings it back, so you can reach out.* — and "Continue with Apple". No carousel, no features list, no AI.

### First minute — will she understand what Kinship is without coaching?
Very likely yes, on the evidence of the copy: the promise says what it is for, the three lines say how she uses it and what she gets back, and setup then asks the one real question ("Who do you want to show up for?"). **Unverified with a real person.** The three welcome lines are new copy, drafted in the approved voice; the founder should read them on the phone and change any word that isn't right.

### Setup — how does she add the people she cares about?
One multi-select pass over her contacts: suggestions first (family names like Mom, Grandpa, Uncle; birthdays within a month), everyone else alphabetically, a search field, and "Add someone by name". Nothing is pre-selected. "Continue with N people" saves exactly those people: name, the phone's contact id and the contact's birthday. Nothing else from her address book leaves the phone. If she refuses Contacts, the screen says that's fine and offers Add someone by name, Open Settings, and Skip for now. No relationship type, cadence, interests or first memory is asked.

### Time to value — how long until something is personally useful?
If any picked person has a birthday in the next 14 days: **at the third setup screen**, about 60–90 seconds after install ("Maya's birthday is Saturday. From Contacts"). On the day itself, it is Today's moment with "Message Maya". If no birthdays are near, the first personal value comes from what she tells it: the relationship page shows it at once; Today speaks the day before or after a dated event. **There is no push yet**, so Today only speaks when she opens the app.

### Tell — can she tell Kinship something without thinking about structure?
Yes. The first Tell is a text box: "Tell Kinship one thing about someone. Say it the way you'd tell a friend." No person picker, no category, no date picker. Afterwards the Tell field sits above the two-item bar on Today and People (2 taps, no navigation), and on every relationship page. The keyboard's dictation works; there is no Kinship voice feature and no microphone is shown (D5).

### Memory — can she understand what was remembered?
A clear note shows a quiet "Kept: … · Undo" line for 5 seconds. A note that needs a look opens "Kept for Maya · Here's what I'll remember." with each line, tokens she can tap to change, × to forget, and Done. A genuinely ambiguous note asks one question ("Which Sam?"). Sensitive notes ask "Remember this about Sarah?" before anything becomes memory.

### Relationship page — does it feel meaningfully richer than Contacts?
Once she has told it things: yes — Lately, Coming up (including her birthday from Contacts within a month), You said you'd, Between you, each line with where it came from. **On day one it is thin:** a person she picked but hasn't told anything about shows the name, the sprig, possibly a birthday, and "What you tell Kinship about Maya will be here…" with "Tell Kinship about Maya". That is honest, but it is not yet richer than Contacts until she tells it something. "Your story together" is not built.

### Today — does she understand why she would open it again?
The first-use Today says what it is for: **"This is where Kinship brings things back."** and explains that birthdays, big days and things she said she'd do will appear there, with one action. Once she has told it something, a day with nothing to say becomes "Nothing needs you today." A birthday or a dated event takes the moment with one obvious action. **Risk:** in her first week, most days will be quiet; without push, she has to remember to open it.

### Friction — where might she hesitate, backtrack or wonder what to do?
1. **The Contacts prompt** comes up as the people screen opens. The screen's question is visible behind it, but she may hesitate. The permission text now reads "Allow Kinship to read your contacts on this phone so you can pick the people you care about. Only the people you pick are saved."
2. **Scrolling a long address book** to find people not in Suggested. Search helps; suggestions are deliberately short.
3. **The first Tell's blank box.** No example is shown (an example about invented people would read as data). She may not know what is "worth remembering". The explanation line helps; watch for it.
4. **The consent screen** names "Kinship's AI provider" and Anthropic (D2 requires it). It is the only place AI is mentioned.
5. **A note that needs a look** opens a sheet over Today on her very first Tell; she may not expect it.
6. **Today after setup** may say "This is where Kinship brings things back." even though she just told it something, until the note is understood and synced (seconds, online).

### Trust — can she correct and inspect provenance easily?
Yes. Every remembered line carries a provenance line; one tap opens the Source (her own words with the understood part marked). Corrections: 2 taps from the review or What Kinship knows; 3–4 from the relationship page. Birthdays say "From Contacts" and are not editable in Kinship (edit the contact).

### Real relationship action — can Kinship help her move into contacting the real person?
Yes, where there is a reason: Today's moment → "Message Maya" → the follow-up sheet → "Open Messages" (or Call, FaceTime, WhatsApp). Kinship opens the conversation and never sends anything. Because she picked people from Contacts, Kinship already knows which contact to open — no "choose contact" step. People added by name ask once. Within 10 minutes to 12 hours, Today asks "Did you reach Maya?" — Yes / Not yet. The relationship page's Message and Call work any time.

### Polish — what still feels prototype-quality?
See every rough edge below.

---

## Every known rough edge

**Blocking wife dogfood**
1. **No native-device verification of anything.** Fonts, safe areas, keyboard, sheets, permission prompts, Dynamic Type, VoiceOver, Reduce Motion, night, offline/relaunch, the hand-off apps — all unverified on hardware.
2. **Sign in with Apple has never completed on a device** with this build.
3. **The Maestro fresh-install flow (`.maestro/fresh-install.yaml`) has never run.** It needs a simulator and a dedicated e2e account whose flags the founder enables.

**Product gaps she will notice**
4. **No push notifications.** Kinship cannot reach her while the app is closed; Today only speaks when she opens it.
5. **Today is quiet most days early on.** Reasons exist only for birthdays and exact-day, non-sensitive events.
6. **Sensitive events (health, loss) never become reasons** in this version, by design until the hard-time rules exist.
7. **Relationship pages are thin until she tells Kinship things.** No "Your story together", no "Friend since", no photos.
8. **No "A year ago" line** on Today.
9. **No voice.** Typing only; the keyboard's dictation works.
10. **Settings is minimal:** understanding on/off, a Contacts explanation, sign out. No export, no delete-account screen in 2.0, no lock-screen settings (no push yet).
11. **No way to mark someone Remembered or Paused** in the app (rendering exists; the control does not).

**Rough in the details**
12. The **Terms and Privacy Policy** pages linked from the welcome are still 1.0-styled.
13. The **home-screen app icon** is still 1.0's.
14. The **Calendar and Photos permission strings** in the binary still mention "garden" (2.0 never asks for either).
15. A birthday hand-off's "Yes" is recorded as a user-confirmed contact without a reason id (birthday moments are worked out on the phone; server birthday reasons are RSN-05). Nothing she sees changes; analytics can't attribute it to the birthday.
16. The picker hides contacts whose name matches someone already in Kinship. Two different people with the same name would show only once.
17. If her account's flags arrive late on first launch, the consent step can be skipped in setup and asked instead as a sheet over Today (the old fallback).
18. Display names are the full contact name ("Maya Okafor"); Today and sheets use the first name.
19. The picker's footer (lock line + button) takes about a quarter of an SE screen.
20. Comparisons in `screens/compare/` show the approved boards with fallback fonts (this environment cannot load Google Fonts); the implementation uses the real bundled fonts.

---

## Tap-count and time audit (first-run, after this change)

| Journey | Taps | Target | Notes |
|---|---|---|---|
| Install → Today, picking 12 people, one Tell | ~5 + 12 picks (Apple, Face ID, Allow, Contacts OK, 12 rows, Continue, Keep it) | setup < ~3 min | Estimated ~1.5–2.5 min with typing; unmeasured on device |
| People selection | 1 pass, 1 tap per person | one multi-select pass | ✓ |
| Tell from Today / People | 2 (field, send) | no navigation | ✓ |
| Find a person | 2 (People, row) or search | ≤ 2 | ✓ |
| Source | 1 | 1 | ✓ |
| Correction | 2 (review / knows), 3–4 (page) | 2–4 | ✓ |
| Act on a reason | 2 (Message Maya → Open Messages) | ≤ 2 | ✓ for picked contacts (contact already linked); +2 once for people added by name |
| Return check | 1 | ≤ 1 | ✓ |
| Contacts refused → continue | 1 (Skip for now) or name + Done per person | no dead end | ✓ |

## State coverage

| State | How it's handled | Verified |
|---|---|---|
| Fresh install / new account | Setup, never empty Today | Jest gate (`app/__tests__/firstRun.test.tsx`) |
| Zero people | Skip → Today first use "Add your people"; People empty "Add from contacts / Add by name" | Jest + lab |
| One / many people | Picker count; People list | Lab |
| No memories | Today first use; person invites Tell | Jest + lab |
| Existing memories | Mature Today; reinstall skips setup | Jest |
| Birthday available / none | Worth-knowing lines or straight to first Tell; Today moment / quiet line | Jest + lab |
| Online / offline | Kept on the phone at once; understood when online (D1 behaviour) | Existing Jest; device ⏳ |
| Extraction pending / failure | D1 behaviour unchanged | Existing Jest |
| Ambiguous person / sensitive item | One question / "Remember this?" | Existing Jest + lab |
| Denied / limited contacts | Recovery states | Jest + lab; device ⏳ |
| Auth failure | Welcome error states (unchanged) | Lab; device ⏳ |
| Long names / statements | Rows wrap at 2 lines; statements wrap | Lab partial; device ⏳ |
| App killed during setup | Resumes at the saved step | Jest |
| App killed during clarification | D1: question waits and shows on Today | Existing Jest; device ⏳ |
| Light / night | Tokens | Lab |
| Large text / VoiceOver / Reduce Motion | Text caps per style; checkbox roles and labels; fades | Partial (roles in Jest); device ⏳ |

## Automated results (this branch)

| Check | Result |
|---|---|
| `npx jest` | 306 / 306 (47 suites), including the new permanent first-run gate, setup model and views, Today birthdays and first use |
| `npx tsc --noEmit` | clean |
| `npx eslint app src` | 0 errors, 130 warnings (same as before) |
| Release bundle (`dogfood-v2` env, `expo export --platform ios`) | Supabase URL inlined; all new first-run copy present; no un-inlined `EXPO_PUBLIC_*` |
| pgTAP / Deno | Not run: no SQL or edge-function changes |
| Maestro | Written, not run (no simulator here) |

## Backend and flags

- **Migrations:** none added. All 25 repository migrations are applied on production (checked 5 Oct).
- **Edge functions:** unchanged (`ai-gateway` v2, `delete-account` v5, `ai-insight` v6).
- **Flags:** every flag defaults off. `shell_v2`, `tell`, `ai_extraction` and `memory_v2` are on only for `21bb55a0-…` and `97748654-…` via `user_flag_overrides`. **Still open from the previous session: please confirm `97748654-…` is your account;** if it isn't, it should be turned off. Nothing was changed.
- **Native config:** the contacts permission string changed (needs the new build anyway).

---

## 13. Founder native-pass script

I can't see your phone; everything below is what to check, in order. Each step says what you should see.

**Build and install** (from this branch; no merge needed because there are no migrations):
1. `git fetch && git checkout claude/awesome-edison-3cuf6z && git pull`
2. `npx eas-cli build --profile dogfood-v2 --platform ios`
   You should see the build start on EAS and finish with a QR code / install link.
3. On your iPhone, delete the current Kinship app first (so this is a fresh install), then install from the link.

**Which account to use.** I counted rows only (no content): the account `21bb55a0-…` (the id you gave first) has no 2.0 people and no notes, so it goes through the whole setup. The account your phone is signed in to now, `97748654-…`, already has one 2.0 note, so it skips setup and opens Today's first-use screen ("This is where Kinship brings things back." with "Add your people") — also worth checking, but it isn't the first-run flow. A brand-new account would open 1.0 until its flags are on, and I won't enable anything without your explicit yes for that id.

4. **Open the app.** Expect the paper splash with a sprig, then the welcome with the three lines. ❌ If you see the cream 1.0 screen: stop and tell me.
5. **Sign in** with the `21bb55a0-…` account. Expect "Setting up · 1 of 3 — So Kinship can understand what you tell it". ❌ If you land on Today or People: the gate failed — screenshot it.
6. **Allow.** Expect "Who do you want to show up for?" and the iOS Contacts prompt with the new wording. Allow access (choose full access if iOS offers a choice).
7. **Pick 8–15 people.** Check: suggestions make sense; nobody was pre-ticked; search works; "Continue with N people" counts right. Try "Add someone by name" once.
8. **Continue.** Expect "Already worth knowing" with real birthdays from your contacts (if any within 2 weeks), or "Tell Kinship one thing about someone."
9. **Type one real thing** (e.g. "Maya starts her new job on Monday.") → **Keep it**. Expect Today, then within seconds a "Kept: … · Undo" line or the "Here's what I'll remember" sheet.
10. **People:** everyone you picked, alphabetical, each with a sprig. Open one → their page; tap the provenance line → the Source with your words marked.
11. **Correct something:** tap a line → change a date → Done.
12. **Today:** if a picked person has a birthday today, "It's …'s birthday." → Message → Open Messages → Messages opens with nothing typed. Come back after 10+ minutes: "Did you reach …?"
13. **Contacts refused:** Settings › Privacy & Security › Contacts › Kinship → None, then People › Add from contacts: expect "Kinship can't see your contacts, and that's fine." with Add someone by name and Skip for now — never a dead end.
14. **Kill the app during setup** (at step 7 or 8, the first time through) and reopen: it should resume at the same step.
15. **Night:** switch the phone to Dark Mode with the app open: the night garden palette.
16. **Larger Text** (Settings › Accessibility › Display & Text Size › Larger Text, a few notches up): nothing cut off on the welcome, picker or Today.
17. **Airplane mode:** tell something; it should say it will understand it when you're online; turn airplane mode off; it gets understood.

18. **See how it works** on the welcome (before signing in): 4 steps, each labelled "An example"; Got it returns to the welcome.
19. The native-pass review items in `activation-pass.md` §8 (provenance size, Contacts helper copy, Settings copy, Today quiet lines, keyboard on Tell, sheet heights, small screen, Dynamic Type and VoiceOver).

Send screenshots of anything that looks wrong, plus how long steps 4–9 took.

**Then:** I fix what you find → you approve → only then do we prepare her build and, with your explicit yes for her user id only, enable her four flags.
