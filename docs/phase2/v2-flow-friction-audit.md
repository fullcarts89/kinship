# Kinship 2.0: flow friction audit (current → proposed → built)

**Rule:** ask the user to decide only what Kinship genuinely cannot know. Remove steps aggressively, but never reduce trust friction by guessing.

## What "current" means

**CURRENT** is the 2.0 shell as merged in D1 (`8415943`), measured from its code. It was Tell-first:
- `/v2` was the Tell screen, with a "People" pill top right.
- People was a separate stack screen.
- A person's record was a flat list of every item with tokens.
- There was no Today, no reasons and no hand-off.

**BUILT** is this branch, `claude/awesome-edison-3cuf6z`. The 1.0 baseline numbers come from the original product audit.

## How taps are counted

- A **tap** is a deliberate touch, typing excluded.
- A **screen** is a full-screen destination.
- A **sheet** is a temporary surface over a screen.

## Deliberate friction we keep

These follow the founder's D1 trust checks and are unchanged:

| Kept on purpose | Why |
|---|---|
| Ambiguous identity ("Which Sam?") | Kinship can't know; guessing writes to the wrong person |
| Sensitive interpretation ("Remember this about Sarah?") | Trust-required: not memory until "Remember" |
| Genuinely ambiguous dates | Trust-required |
| Protected-memory conflicts ("This changed on another device") | The user's word wins; Kinship can't choose |
| Uncertain relationship subject ("Sarah, or Sarah's sister?") | Can't know |
| Look-over for mid-confidence and coarse-date readings | The founder asked to keep this policy unchanged during early dogfood. These are already saved, the sheet closes itself after 20 s untouched, and nothing is asked |

## Journeys

### 1. Open the app: "is there anything worth knowing?"

| | Start | Screens | Taps | Typing | Sheets | Waits | Choices | What the system already knew |
|---|---|---|---|---|---|---|---|---|
| 1.0 | Launch | 3.2 s loading animation, then Home dashboard (carousel, stat card, suggestions) | 0, then scanning | 0 | 0 | 3.2 s | Many | Everything; showed all of it |
| CURRENT | Launch | Tell screen: a text box and a "People" pill | 0 | 0 | 0 | 0 | 0 | Upcoming events were stored but never surfaced |
| **BUILT** | Launch | **Today**: date, greeting, one moment (or "Nothing needs you today."), at most two quiet lines, Tell field | **0** | 0 | 0 | 0 | 0 | Used: reasons from the user's own events, plus upcoming days this week |

Simplification: nothing to do but read. When nothing reaches the threshold, Today stays quiet.

### 2. Tell Kinship something (understood safely)

| | Start | Screens | Taps | Typing | Sheets | Waits | Choices | Classification asked |
|---|---|---|---|---|---|---|---|---|
| 1.0 | Home | Tend sheet (5 options), then Add memory (form), person picker, emotion chips, save: 4–6 screens | ~8–12 | Yes | 1–2 | — | Memory type, person, emotion | Yes: type and emotion |
| CURRENT | Tell screen | 1 | 2 (field, Keep) | Yes | 0 (a 4 s toast) | Understanding | 0 | No |
| **BUILT** | Today or People | **0 (no navigation)** | **2** (field, send) | Yes | 0: a quiet "Kept: … · Undo" line above the field for 5 s | Understanding | 0 | No |

From a person's page it is 3 taps (pen, field, send), and the note is already about them.

### 3. Tell something that needs a look (mid confidence, coarse date)

| | Taps | Sheets | Notes |
|---|---|---|---|
| CURRENT | 2 + Done (or 20 s idle) | 1 | Policy kept unchanged |
| **BUILT** | 2 + Done (or 20 s idle) | 1 ("Kept for Ben · Here's what I'll remember.") | Unchanged on purpose (founder: don't relax confirmation during the first days). Items are already saved; × forgets one; a token corrects it in place |

### 4. Clarification (one genuine question)

| | Taps | Notes |
|---|---|---|
| CURRENT | 2 + 1 choice (+ Done) | The question sat under a "Kept" heading |
| **BUILT** | 2 + **1 choice** | When nothing is kept yet, the question is the whole sheet, in the display serif: ask one thing, resolve, done. A skip ("Don't keep this") is always offered and never assumed |

### 5. Sensitive reading (trust-required)

| | Taps | Notes |
|---|---|---|
| CURRENT | 2 + "Remember" | Not memory until accepted (D1 §0) |
| **BUILT** | 2 + "Remember" | Unchanged. The prompt reads "Remember this about Sarah?" with who and when underneath |

### 6. Find a person

| | Start | Taps | Typing | Notes |
|---|---|---|---|---|
| 1.0 | Home | Garden tab (1), canopy carousel / list sorted by growth (scroll), tap (1) | 0 | Sorted by points |
| CURRENT | Tell | "People" (1), alphabetical list with no search (scroll), tap (1) | 0 | Names only |
| **BUILT** | Anywhere in the tab bar | **People (1), tap (1)**, or type in the search at the top | Optional | Each row shows the sprig, the name and one live line |

### 7. Person: "who are they to me right now?"

| | Screens | Notes |
|---|---|---|
| 1.0 | Person dashboard (1,892 lines: plant, vitality, next action, texture, AI insight) | Dashboard |
| CURRENT | A flat record: every item with four tokens and "Not this" | CRM-like |
| **BUILT** | **A portrait**: name and sprig, then Lately / Coming up / You said you'd / Between you, only when non-empty. Every line shows its provenance | The full editable list moved one tap away ("What Kinship knows about Ben →") |

### 8. Add a person

| | Screens | Taps | Notes |
|---|---|---|---|
| 1.0 | 6-step wizard | ~6 per person; **~90 to add 15 people** | Photo, relationship, frequency, notes… |
| CURRENT | People | 3 (People, field at the bottom of the list, Add) | The field sat under the whole list |
| **BUILT** | People | **3: People, +, Done** (after typing the name) | From a search with no match, "Add Sam" is prefilled. Mentioning someone new in Tell also adds them, after one explicit "Add Maya" |

15 people now take about 31 taps. Picking from contacts during onboarding (E16) will bring that to about 2 + 15.

### 9. Correct a memory

| | Path | Taps |
|---|---|---|
| CURRENT | Record: tap a token → picker → pick | 2 |
| **BUILT, from the portrait** | Tap the line → focused correction sheet → tap the token → pick → Done | 3–4 |
| **BUILT, from "What Kinship knows"** | Tap the token → pick | 2 |
| **BUILT, in the review** | Tap the token → pick | 2 |

**Trade-off, flagged for review.** The portrait doesn't show tokens on every line, which keeps it a portrait and not a form. That costs one tap. The correction sheet opens on the line with its tokens, its source and "Not this", so nothing needs hunting for.

### 10. Where did this come from?

| | Taps |
|---|---|
| CURRENT | 1 (provenance → Source) |
| **BUILT** | **1**, from Today's moment, the portrait, the review and What Kinship knows |

### 11. Act on a reason

| | Path | Taps to the real app | Logging required |
|---|---|---|---|
| 1.0 | Reach Out screen, then Text/Call/"Reach Out", which did **not** open the real conversation; then a check-in form | n/a | Yes, manual |
| CURRENT | None | — | — |
| **BUILT** | Today → "Ask how it went" → follow-up sheet ("You could mention…") → **Open Messages** / Call / FaceTime / WhatsApp | **2** | **None.** Opening a channel writes nothing |

The first time for a person, they also pick that person's contact once (+2 taps: "Choose Ben" and the system picker). After that, their number is read on the phone at tap time.

### 12. Return after reaching out

| | Path | Taps | Logging |
|---|---|---|---|
| 1.0 | Check-in screen (537 lines): type, notes, emotion | Many | Manual |
| **BUILT** | Today shows "Did you reach Ben? **Yes** · **Not yet**", only 10 min–12 h after a hand-off Kinship opened | **1** | "Yes" records the contact (source `return_check`). It then offers "Anything worth remembering about Ben?" (optional; Tell opens about Ben). No answer logs nothing, ever |

### 13. Understanding consent (D2/D3)

| | Taps |
|---|---|
| CURRENT | None in 2.0. Notes were silently kept as written when consent was missing |
| **BUILT** | Asked **once**, on first open: the approved sentence, **Allow** or "Keep notes as written" (1 tap). It can be changed under People → Settings |

## Summary: before → after

| Journey | 1.0 | D1 (current) | Built |
|---|---|---|---|
| Know what matters today | Dashboard scan | Nothing shown | 0 taps |
| Tell (clear) | 4–6 screens, ~8–12 taps | 2 taps, 1 screen | 2 taps, 0 navigation |
| Find someone | Scroll by points | 2 taps + scroll | 2 taps, or search |
| Add someone | 6 steps | 3 taps | 3 taps |
| Correct | Deep edit screen | 2 taps | 2 (knows/review), 3–4 (portrait) |
| Act on a reason | Didn't open the app | — | 2 taps to Messages |
| Record that you connected | Manual form | — | 1 tap ("Yes") |

## Proposed next simplifications (not built; for your decision)

1. **One-channel shortcut.** When a person has exactly one way to reach them, "Ask how it went" could open Messages directly and skip the sheet. Board 2 draws the sheet; this would be a deviation, so it needs your call.
2. **Corrections on the portrait.** A long-press on a line could open the words editor directly (saves one tap). This is invisible to VoiceOver unless it's an action, so it would need the accessibility pass first.
3. **Onboarding picker (E16)** to bring people in from contacts in one pass.
