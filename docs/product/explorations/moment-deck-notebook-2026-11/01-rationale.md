# Moment Deck × Notebook × Showing Up

**Status: DESIGN PROTOTYPE · UNAPPROVED · founder review gate · NOT READY.** Nothing here changes product code, schema, flags, the coverage matrix or the decision register. It builds on PR #76 (five structures, competitive layer) and the CC-28 showing-up exploration, and it does not restart either. Every person, note and photo in the prototype is fictional sample data.

## The idea in one paragraph

Kinship is three things that hand off to each other. **The Notebook remembers:** you write the way you'd tell a friend, and Kinship shows what it understood beside your own words, which stay exactly as you wrote them. **The Moment Deck recognizes:** on the day it matters, one person comes forward as a full poster with the reason and its source, and the rest of the week waits in a short deck that ends. **Showing Up acts and follows through:** from a moment or a person, you can ask for ideas that come only from what you told Kinship. You choose one, Kinship opens the door (Messages, Phone, a saved intention in your words), and afterwards it asks once whether you did it and whether anything is worth keeping. That answer goes back into the notebook.

> Moment Deck makes Kinship worth opening. Notebook makes it worth trusting. Showing Up is why it exists.

## Why this, and not a nicer list

PR #76's competitive layer found that natural-language capture and review-before-save are now table stakes. What is still rare is: every line traced to the user's words, a yes for sensitive readings, the user's own promises brought back, and closing the loop after contact. It also found that the category dies of upkeep, not looks. This design puts the rare things on screen and removes upkeep:

| PR #76 hypothesis | Where it becomes felt in this design |
|---|---|
| **H1 · trustworthy memory** ("it remembers exactly what you told it, and shows you where") | Review keeps your words on top, each understood phrase underlined in its person's color; tap a phrase to reach its line. The person page has a **Pages** lens that is literally your notebook. Every line opens its source in one tap. |
| **H2 · follow-through** (promises and open threads come back once; the loop closes) | Your promise *is* a moment ("You said you'd check in on Elena"). "Keep it in mind" turns an idea into your own sentence, with a day. "I did this" and the return check close the loop, then "Anything worth remembering?" feeds the notebook. |
| **H3 · care without keeping score** | No counts, streaks, health, closeness or overdue anywhere. Equal tiles. Flowers are identity only. Ideas are offered only when asked. Doing nothing is always fine. |

## Major structural choices

1. **Two destinations plus Tell, unchanged:** Today and People in a two-word bar, Tell pinned above it. No Actions tab, no chat tab, no Garden.
2. **Today is a deck that ends.** At most one poster (the existing single-moment rule), then the existing quiet lines rendered as smaller cards, then "That's today." Nothing below it.
3. **A moment expands in place.** The poster opens into the moment (a shared-element expand), not a separate page. That's where the reason, the source and the ways to act live.
4. **Showing up lives inside moments and people.** "Ideas for showing up" is a closed, explicit control in the moment and on the person's Now lens. It is never on the Today card and never in a push.
5. **The person is a notebook with three lenses,** not stacked sections: **Now** (the Portrait: coming up, you said you'd, lately, between you), **Pages** (your notes over time, with what you did interleaved), **Knows** (the organized reference, What Kinship knows). Each line lives in one lens, so nothing repeats.
6. **People is a light index** with no upkeep: one search field for names *and* what you told Kinship, a "coming up for them" band ordered by date only, and equal portrait tiles A to Z. No groups to maintain.
7. **Tell is a page.** Write freely, then watch understanding sweep under your words before the review appears.

## The eight structural questions

**1. What is the primary navigation model?**
Today and People are the only destinations, as the contract says. Everything else is contextual and reached from them: a moment, a person, a source, a review, an assist sheet. Tell is a pinned field on Today, People and every person page. The back stack is shallow: Today → moment → source is the deepest common path (three levels).

**2. How does a user move from a moment to a person, a source or an action?**
From the expanded moment:
- **Source:** one tap on "From your note · Oct 8" opens the note, with the exact words highlighted.
- **Person:** "Open Ben's notebook" at the foot.
- **Action:** the primary button (Message, Call, or "I did this" for your own promise), and below it the explicit "Ideas for showing up".

The same three exits exist on every line in the person notebook (tap a line for its source sheet; ideas from the Now lens; Message, Call and Tell under the name).

**3. How does Tell fit in without dominating?**
It's one pill above the bar, always in the same place, with no badge and no mic. It opens a full-height page that closes back to where you were. It's also the answer to two questions Kinship asks at the right time: "Anything worth remembering?" after contact, and the empty person page's invitation. Tell is never home, and Today never becomes an input screen.

**4. How does a user retrieve information about someone?**
Three ways, by intent:
- **Browse a person:** People → tile → Now for what's live, Knows for the reference.
- **Find a detail:** search on People matches names and anything you told Kinship, showing your own words with their date. Inside a person, "Find in Rosa's pages" filters the notebook.
- **Recognize:** Today and the "coming up for them" band bring people forward by date.

Ask Kinship is preserved as a future capability. Here it appears only as search over your words (Ask v1 is word matching), never as a chat.

**5. How does the system connect remembering, acting and following through?**

```
Tell (your words) ─▶ understood lines with sources ─▶ a moment on its day
      ▲                                                     │
      │                                         ideas from those same lines
      │                                                     │
"Anything worth remembering?" ◀── return check / "I did this" ◀── you act (Messages, Phone, in person)
      │                                                     ▲
      └── new lines on the person's page          "Keep it in mind" = your sentence + a day
```

Every arrow uses the existing truth model:
- An idea quotes the memory it comes from.
- An intention is a note in your words, so it has a source.
- An action is recorded only when you say so: a Yes to the return check, or "I did this" on your own promise.
- What you tell afterwards goes through the same review, with "Already known" so nothing is duplicated.

**6. What is the distinction between a moment, a memory, a story and an action?**

| Term | What it is | Lifetime | Where it lives |
|---|---|---|---|
| **Story** (a note, a page) | What you wrote, exactly as you wrote it | Permanent until you delete it | Pages lens, Source |
| **Memory** (a line) | One sourced statement understood from a story: a fact, an event, a plan, a promise, an open thread, something between you | Until replaced, resolved, edited or forgotten; history kept | Now and Knows lenses; review |
| **Moment** | A time-bound opportunity Today raises from one memory (or a Contacts birthday) because its day has come | One day (or its window), then it ends | Today, the expanded moment |
| **Idea** | A suggestion derived from one or more memories, shown only when you ask, always with its grounding | Not stored | The moment, the person's Now lens |
| **Intention** | Something you decide to do, saved as your own sentence with a day (a promise you make to yourself) | Until done or removed; never overdue | "You said you'd", and Today on its day |
| **Action / showing up** | What you do in the real world | Recorded only when you confirm it | Between you, and the Pages timeline |

**7. What appears when Kinship knows very little?**
- **First run** keeps the contract's state model. Today says "This is where Kinship brings things back", offers three prompts that open Tell about a real picked person, and shows "Already worth knowing" from Contacts birthdays only.
- **A sparse person** (Aiko) shows their portrait, the sentence the coverage matrix already approves ("What you tell Kinship about Aiko will be here…"), any Contacts birthday, and one Tell button. There are no ideas, because there is nothing to ground them in.
- **No photos** gives a type poster: the initial, the person's color and their flower. These are equal and first-class, not a placeholder.

**8. What does it look like after hundreds of memories across dozens of people?**
- **People** stays an equal grid, with letter breaks and an A–Z rail at about 35 people. The date band never grows past the next 14 days.
- **A person's Now** still shows at most three lines a section, by time only. Everything else is in **Knows**, organized and sourced, or in **Pages**, which is grouped by year and searchable (try "Dense" in the prototype: Leo's two years).
- **Today** doesn't change at all: one poster, a short deck, an end. More memory means better-grounded ideas, not more items.

## Visual system (unified, from Electric Garden Direction A)

FD-30b made Electric Garden the visual system, so this design extends it instead of mixing aesthetics:

- **Type.**
  - Archivo Black for headlines and names: one loud voice.
  - Newsreader for people and their words: serif, with italic for quotes.
  - Instrument Sans for the machine.
- **Two kinds of color, never confused.**
  - *Identity:* each person gets one color and one flower, assigned once, never changing with history (D8).
  - *Meaning:* green dot = understood, with a source. Orange = something you said you'd do. Magenta edge = needs your yes. Sky dot = from Contacts.
- **Composition.**
  - One dominant object per screen (a poster, a name, your words).
  - Cards only where a thing can be acted on.
  - Ruled paper only where your own words are.
- **Photos are optional and equal.** A type poster is designed, not a fallback. Kinship never infers anything from a photo.
- **Tender variant.** A moment about a hard time drops the photo, the loud type and the bright color: paper, a small flower, a serif headline.
- **Motion.**
  - Arrive: 320 ms rise.
  - Understand: a 600 ms underline sweep in each person's color.
  - Sheets: 360 ms, no overshoot.
  - Moment: a 420 ms expand from the card's own rectangle.
  - Reduce Motion: every one of these becomes a 150 ms fade.

## The prototype

The **Prototype** tab is a working mobile-first app with a presenter rail:

- **Six journeys,** each with live step tracking:
  1. Remember to connect
  2. Tell something meaningful
  3. Revisit someone's life
  4. A thoughtful gesture
  5. Follow-through
  6. Connection becomes memory
- **Days:** first run, Mon, Wed, Fri, and a quiet day.
- **Density:** typical (14 people) and dense (35 people, plus Leo's two years of pages).
- **Jumps to states:** a sparse person, no photo, a dense notebook, a source.
- **An overlay** tagging each element **BUILT** (on main), **ALPHA** (unmerged PR #74/#75), **PROPOSED** (this design) or **FUTURE** (a later integration).

**Evidence level:** browser prototype, design evidence only. Nothing has run on a device, against the gateway or with the live model. The journeys use fixed, hand-written understanding of the example stories. This is not a claim that the pipeline produces exactly these lines.
