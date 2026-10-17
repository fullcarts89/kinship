# Reconciliation: the prototype against `todayModel.ts` and the approved contracts

**Status: EXPLORATORY · UNAPPROVED.** The brief asked for an audit of the round-1 prototype against production before finalising. Each row says whether the gap was a fixture error (fixed in round 2) or a genuine proposal (labelled). The prototype is an exploration; nothing here is evidence that the React Native implementation behaves this way.

| # | Item | Production rule (as built) | Round 1 showed | Verdict | Round 2 |
|---|---|---|---|---|---|
| 1 | Maya's birthday | A birthday is the Moment on its day only; Coming up lists it 1–7 days ahead | "It's Maya's birthday." on Mon, Oct 12, with "Sat 17 · Maya's birthday" in the same week | **Fixture error** | The birthday state is dated Sat, Oct 17 and its week shows the following week |
| 2 | The duplicate primary action under the return check | An acted reason is excluded from the Moment (`local?.acted`); only "Not yet" (`notYet`) lets it speak again | The question above the letter and its "Ask how it went" pill | **Fixture error**; the composition is a proposal | The question is the moment; the reason is context; "Open Messages again" is a link (decision 9) |
| 3 | Busy-state counts and order | Questions / Kept first, then Waiting lines (cap 4 quiet lines total), then Coming up ≤ 3 (`COMING_SHOWN`) with "and N more"; one Moment | Coming up first, Waiting third, four lines plus "and 2 more" | **Fixture error** | Waiting on Tyler first, then three Coming up lines (the user's own promise in ochre), then "and 2 more" |
| 4 | First use | Setup ≠ first use ≠ quiet day (contract §8); first use shows orientation and one action; H4's bring-back once after the first Tell, no carousel, no extra screen | Text plus two pills; the hedgerow of picked people | Composition is a **proposal** | The worked example as a small letter labelled "An example", one action; the bring-back uses the user's own words in quotes (verbatim) and what was kept; no new steps |
| 5 | Promise and open-thread reasons | Not built (CC-25 Commit next); Today shows a user's own dated promise only under Coming up / Waiting | A "You said you'd" line in the week only | Correct as a week line; the Moment form is **future** | Shown as future Moments (RSN-06, RSN-07) in the architecture journeys only, labelled; the week keeps today's behaviour |
| 6 | Moment eligibility, ranking, per-person limits | Score ≥ 55; one primary per person per 7 days; freshness halves a repeat | Not represented | Not a view concern | Unchanged; the prototype never shows two Moments or a repeat |
| 7 | Source and provenance | Every durable statement has a source; the hope line is a template over `event_goal`; the detail shows the memory, why, when, source | The hope line in quotation marks | **Trust error** | Quotation marks only for verbatim excerpts (the detail's "From your note", a verbatim Between-you line, the bring-back's first Tell); the hope line in italic without quotes (decision 3) |
| 8 | Long text, Dynamic Type, overflow, the dock | Display reflows to 3 lines at AX1; the dock is pinned; content scrolls | The week ran under the hedgerow; larger text hid the week | Layout **bug** in the mockup | The content region ends above the ground; the SE layout tightens the letter; larger text moves the illustration above the statement (`compare.html` devices row) |
| 9 | State transitions: dismissed, completed, no longer eligible | Not now snoozes (time-flexible types); Yes records a conversation and the reason is done; Not yet records nothing; expired reasons leave quietly | Not now → quiet; Yes → after; Not yet → the moment | Consistent | Unchanged; plus the logistics case (a promise's Yes gets no memory prompt, I2) |
| 10 | People count | No counts anywhere a count could be read as a measure | "Fourteen people. Mid-October." | Withdrawn by the founder | Removed |
| 11 | The hedgerow and Remembered / Paused | Remembered and paused people get no proactive reasons; a remembered sprig is ink-quiet; Paused is visually identical | A hedgerow of 14 sprigs chosen alphabetically | A hidden ordering decision | Replaced by the contextual ground (decision 7); Remembered shown on the page and in People only |
| 12 | The return check's timing and recording | From 10 minutes after the hand-off, up to three days; Yes records once; Not yet records nothing; a hand-off alone never counts | A 2-second simulated wait | Prototype shortcut | The toast says so; the rules are unchanged |
| 13 | The Kept line | The dock alone says "Understanding…"; the Kept line above the field with Undo (5 s) | Shown after "Tell Kinship" | Consistent | Unchanged |
| 14 | Night prompt | "Anything worth remembering?" only after a signal (T6) | Only after Yes | Consistent | Unchanged |

## Genuine proposals that would change what a user sees (all FOUNDER APPROVAL REQUIRED; numbered in `03-founder-decisions.md`)

The kicker (2), the 36 pt statement (2), the hope line as italic (2, 3), Not now as a link (2), the occasion illustrations (4), the tints and the band (5), the sundial (6), the contextual ground (7), Resolve after Yes (8), the return composition and its two new sentences (9), press-lift and the slide (10), People's type and marks (11), the portrait's now line and shared ground (12), People's placeholder and the Ask sheet when Ask ships (AR-2, AR-3, AR-4).

## Fixture inconsistencies, fixed without any product change

Rows 1, 3, 8, 10, 12; the duplicate pill (2) once the production exclusion is respected.
