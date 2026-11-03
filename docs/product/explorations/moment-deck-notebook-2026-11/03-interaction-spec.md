# Interaction specification

**Status: PROPOSAL** for implementing the design consistently if the founder approves it. Where it says "unchanged", the existing rule document governs and this spec adds nothing.

## 1. Navigation

| From | Gesture / control | To | Transition |
|---|---|---|---|
| Bar | Today · People (words, no icons) | The destination root; the stack is cleared | 240 ms cross-fade |
| Today poster or deck card | Tap anywhere except a button | The expanded moment | **Expand** from the card's rectangle to full screen, 420 ms, ease-out (0.2, 0.9, 0.25, 1); the photo is the shared element |
| Expanded moment | ✕, swipe down from the top half, or iOS back-swipe | Today | Reverse of expand (collapse to the card) |
| Any provenance line ("From your note · Oct 8") | Tap | Source (the note) | Push, 340 ms; edge back-swipe returns |
| A line anywhere (Now, Knows, Pages highlight, mentions) | Tap | Line sheet | Sheet, 360 ms, no overshoot |
| "Open X's notebook", People tile, band avatar | Tap | Person, last-used lens (default Now) | Push |
| Person lenses | Tap the segment, or swipe horizontally on the content | Now ⇄ Pages ⇄ Knows | 200 ms slide; the header stays |
| Tell pill (Today, People, person) | Tap | Tell page (about the person when opened on a page) | Sheet to full height, 380 ms |
| Message / Call / an idea's "Message" | Tap | The other app (hand-off) | System app switch |
| Coming back from the other app | Automatic | Where you left: Today for moments, the page for page hand-offs | The return check is already in place above the content |

**Depth limit:** no path from Today or People goes deeper than three levels (destination → moment or person → source or sheet). There is one stack per destination. Changing tabs resets the stack, as built.

## 2. Today: the deck

- **Composition, top to bottom:**
  1. date (caps) and greeting (serif);
  2. the return check, if any;
  3. the poster, if a candidate clears the existing threshold;
  4. "Also coming up", a horizontal deck;
  5. the end card, "That's today."
- **The poster** carries:
  - when (lime chip);
  - the headline (the existing template for the moment kind);
  - the memory in the user's words;
  - an optional quote in italic;
  - the source;
  - one primary action and "Not now".
- **Poster styles, chosen deterministically:**
  - **Photo:** the person has a photo the user chose.
  - **Type:** no photo. The initial at 230 pt in the person's color at 9% ink, plus their flower.
  - **Tender:** the memory or its source line is in a sensitive class. Paper background, a small flower, the headline in Newsreader rather than Archivo Black, no lime. Any hard-time moment beyond a user's own promise waits for RSN-09.
- **The deck** contains only what the quiet-line rules already allow (Coming up 1–7 days, Waiting on, Kept, a question), at most three, then the end card.
  - **Card weight:** 214 × ≥232 pt, the person's color, a 64 pt circular portrait, the day as the headline.
  - **Questions** (a note waiting on "Which Sam?") are white with a magenta edge and always come first.
- **Gestures:**
  - Horizontal swipe on the deck, snapping per card.
  - A vertical scroll exists, but the page ends at the end card. There is never an infinite list.
- **"Not now"** dismisses that moment for the day (existing semantics). The next eligible candidate may take the poster; if none does, the quiet state shows.

## 3. The expanded moment

Order is fixed:
1. Media: photo, type, or tender header.
2. When.
3. Headline.
4. The memory in the user's words, plus the quote.
5. Why now: one fixed sentence ("It was yesterday.").
6. The source row.
7. "You could mention": up to two lines from `mentions.ts`, **excluding any memory an idea below is grounded in**, so nothing repeats.
8. The primary action. For the user's own promise, "I did this" comes first and Message is secondary.
9. **"Ideas for showing up"**: closed by default, a single control.
10. Footer: "Open X's notebook" and "Not now".

## 4. Ideas for showing up

**Where:** only in the expanded moment and on a person's Now lens. Never on the Today card, in a push, on the lock screen or in a widget (founder point 2, 19 Oct; FD-8 recommendation).

**What an idea is:**
- a CC-28 category (A gesture · Celebrate · Time together · Practical help · Follow through · Message · Check in);
- a title;
- one or more grounding memories, each shown as the user's words in quotes with its source.

**Generation (proposal, deterministic first):**
- Candidates come from the person's current lines by the same preference `mentions.ts` and `suggestions.ts` already use.
- **Grounding is mandatory.** An idea with no grounding memory is not shown, except "Just check in" for a moment that already has a reason.
- **Exclusions are SUA-1's:**
  - sensitive lines, except the user's *own* promise that names the help ("maybe bring dinner Thursday");
  - relatives' lines;
  - anyone Remembered or Paused;
  - anything retracted, superseded or expired.
- **Titles.** Option A, the safest: a fixed template per category plus the verbatim quote ("A gesture" + “keeps talking about getting his new one, Comfort”). Option B, warmer: a grounded short title ("Get her the book she keeps mentioning") written under the existing grounded-phrasing rules: only entities in evidence, no invented specifics. The prototype shows B. **Founder decision.**
- **Order:** the user's own promise first, then by the moment's subject, then by recency. Never by any notion of what the person "needs".
- **Count:** 0–3. Zero is an answer: the control is hidden when there are none.

**Assist sheet, the "ways to do it":**

| Way | Status | Behaviour |
|---|---|---|
| Message / Call | BUILT | Hand-off; nothing pre-written; the return check follows |
| Help me start | PROPOSED (D9: "openers later, only on request") | Two openers built only from the grounding words. One tap copies; the user pastes. Never sends. Only after this explicit tap |
| Write a card | PROPOSED | Shows "you could mention" lines plus a blank field; copy only |
| Keep it in mind | PROPOSED (Intentions v0) | See §5 |
| Find it | FUTURE | A plain web search for the item's words only. No partner, no personal data, no commission (CC-28 R7/R8) |
| Nothing to set | BUILT | For birthdays and follow-ups that already return on their day |

The footer is always: "Kinship never sends, buys, books or invites anyone for you. Doing nothing is always fine."

## 5. Intentions ("Keep it in mind")

- **New intention.** The user picks a day (Tomorrow · Thursday · Saturday · Pick a day) and confirms a sentence pre-filled from the idea, *in editable words*. Saving writes that sentence as a **note** (source: "You saved this · Nov 2") that yields one **promise** line with that day.
  - The truth model doesn't change: an intention is a Tell.
  - It appears under "You said you'd" and on Today on its day (the existing "promise falling due" quiet line).
- **Idea grounded in an existing promise.** The sheet offers "Bring it back on Saturday" instead, which adds the day to that promise as a user edit. **Nothing new is added**, so there's no duplicate.
- **What intentions never do:** repeat, escalate, count, go overdue or say "still". After its day, an undone intention follows the existing promise rules (Lately, then only Knows).
- **Undo** is in the toast. Removal is "Not this" on the line.

## 6. Follow-through and closing the loop

**Evidence ladder.** These are kept as distinct records and never inferred from each other (founder point 3; G3 / G3b):

| Step | Signal | Recorded as | Shown as |
|---|---|---|---|
| Considered | Opened ideas or assist | Nothing (analytics: `gesture_shown` / `gesture_tapped`, content-free) | — |
| Intended | Saved "Keep it in mind" | A promise line from the user's sentence | "You said you'd" |
| Opened a channel | Hand-off | Nothing (T12) | — |
| Reached them | **Yes** to "Did you reach X about …?" | A conversation (I2) | "You messaged · Nov 4" in Between you and Pages |
| Did the thing | **Yes** to "Did you offer to help?" / "Did you make a plan?" (only after a Yes that followed an idea), or **"I did this"** on a promise | A kind enum (content-free) or the promise marked kept | "You kept it · …" |
| Learned | "Anything worth remembering?" → Tell | New lines through review, "Already known" deduplicated | New page in Pages, new lines in Now |

- **Acknowledgement:** one warm sentence ("Nice. Anything worth remembering from dinner with Sam?") and a green sprout line ("In Sam's notebook: You took Sam out to celebrate · Nov 6"). No confetti, no counts, no streaks.
- **"Not yet"** records nothing and lets the reason speak again while its window lasts (unchanged).

## 7. Tell and review

- **Tell page:** ruled paper, a serif at 21/34, the placeholder "Long or short, messy is fine. Several people at once is fine."
  - Keep is disabled until there is text.
  - Close keeps the draft (existing `drafts.ts`).
- **Understanding:** the text freezes, and each span Kinship read is underlined in its person's color, one after another, 600 ms each, 110 ms stagger.
  - Then the review replaces the page.
  - Reduce Motion: no sweep, a 150 ms fade.
- **Review layout:**
  1. header (who it was kept for, and how many questions);
  2. **Your words**, a collapsible card, five lines collapsed;
  3. **Needs you**: identity questions, then sensitive yes/no;
  4. one group per person: avatar, name, relation, then lines;
  5. a sticky footer: Done · Undo this note.
- **Phrase ↔ line mapping:**
  - Tapping an underlined phrase scrolls to its line and pulses it (yellow, 1.2 s).
  - Tapping a line's body flashes its phrase.
  - A removed line's phrase turns dotted and faded, but the words stay.
- **Line states:**

| State | Look | Meaning |
|---|---|---|
| Kept | White row, person-colored edge, × to remove | Saved (clear lines auto-save, as built) |
| Waiting | Faded, "Waits for your answer above" | Depends on an identity question |
| Held | In Needs you, magenta edge, Keep it · Don't keep | Sensitive class; not memory until yes |
| Removed | Struck through, ✓ to bring back | Not kept; the note is untouched |
| Already known | Grey, no × | Same fact as an existing line; the note becomes a second source; nothing new |
| Replaces | Blue tag "Replaces: …" with **Keep both** | The told-again question, as built |
| Edited | Tag "Edited by you" | The user's words win and are never re-extracted |

- **Inline corrections:**
  - **Date token** (dotted underline) opens a three-option picker. *As you said it* comes first and is the default for vague dates. *A day you wrote* is offered only when the note contains one ("the 15th I think"). Then *Another day…*.
  - **Sentence:** tap to edit in place, with "From your words: “…”" shown above the field.
  - **Person:** tap the group header → "Who is this about?" (built).
- **Ambiguity is asked only when consequential:**
  - two candidate people (always);
  - a vague date only when the user taps it (never a blocking question).
- **Partial notes (Option A, unchanged):** words the understanding did not reach stay visible in Your words, grey and dotted. The header and Source keep "Tell the rest" exactly as built. Nothing is dropped silently.
- **Done** with unanswered questions leaves them waiting: a question card leads Today's deck until answered.
- **Undo this note** removes the note and every line from it.

## 8. Person notebook

- **Header:**
  - portrait, or type plus flower;
  - name in Archivo Black;
  - relation in italic serif with its source dot (tap → source);
  - Message · Call · Tell.
- **Now:** exactly the Portrait rules (Coming up, You said you'd, Lately, Between you; at most 3 each; time order), then "Ideas for showing up" (if any), then "What Kinship knows about X →", which switches to Knows.
- **Pages:**
  - every note that yielded a line about this person (plus the relation's source), newest first, with year dividers;
  - each note in full, with this person's kept spans highlighted (sensitive spans in lavender);
  - tap a highlight → line sheet;
  - showing-up entries (confirmed conversations, kept promises) interleaved by date in green;
  - "Find in X's pages" filters and highlights.
  - Only notes about *this* person appear; other people's lines in the same note are not highlighted.
- **Knows:** What Kinship knows, in the approved section order: Background · Into · Hoping to · Plans · Their people · Between you. Before / was lines and resolved threads as built.
- **Sparse page:** the coverage-approved invitation sentence, a Contacts birthday if any, "Tell Kinship about X", and nothing else. No lenses until there is something told.

## 9. People

- A search field ("Find someone, or something you told Kinship"). Results show people first, then "In what you told Kinship": your own words around the match, the person, the date. Tap → the person's Pages, scrolled to that note and outlined.
- **"Coming up for them":** people with a dated, non-sensitive line or a sourced birthday in the next 14 days, ordered by date only. Each appears once, at their soonest date.
- **Everyone:** equal 4:5 tiles, three columns. Name: first name only, or the full name where two people share it. One distinguishing line from the user's told relation, else the Contacts birthday, else "Added from Contacts".
- Above about 25 people, letter breaks and an A–Z rail appear.
- No sort options, no groups, no pins, no counts.

## 10. Accessibility and motion

- **Touch targets:** at least 44 pt everywhere. The deck cards and tiles are whole buttons.
- **Contrast:** text on photos sits on a scrim with ≥ 4.5:1. Measured pairs:

| Text on | Ratio |
|---|---|
| Ink on pink (the lowest) | 4.66:1 |
| Ink on orange | 5.38:1 |
| Quiet ink `#57645C` on paper | 5.42:1 |
| Orange-text on its tint | 5.13:1 |
| Magenta "needs your yes" on white | 5.57:1 |
| White on navy | 14.9:1 |

  The understood-green `#3B8A1C` is used only for dots and icons (3.79:1 on paper, above the 3:1 non-text minimum), never for text.
- **Dynamic Type:**
  - Headlines wrap rather than truncate.
  - The poster grows in height before the type shrinks.
  - Above XXL, the deck becomes a vertical list of the same cards.
- **VoiceOver:**
  - A poster reads as "Ben Carter. How did it go for Ben? Ben ran the New York Marathon on Sunday, November 1. From your note, October 8. Button."
  - Underlined phrases are links ("Shows the line: Priya is back from Lisbon for good").
  - Ideas read category, title, then the quote.
- **Reduce Motion:** expand, push, sheet, sweep and stagger all become 150 ms fades. No parallax, no autoplay.
- **Color is never the only signal.**
  - Meaning colors always come with a word: "You said you'd", "Needs your yes", "From Contacts".
  - Person colors are always paired with a name.
- **Night:** this prototype does not design Night. The existing night-garden token set must be applied and reviewed; the type poster and tender variant need night versions. See Decisions.

## 11. Copy rules

- People are spoken about in serif, in the user's words. The machine speaks in sans, short and plain.
- Never: overdue, late, still, streak, score, health, "you haven't", "it's been".
- Questions are asked once, with their reason ("Did you reach Anthony about the wedding?").
- Ideas are phrased as possibilities. The idea's title is never in the user's voice; the quote is.
