# Moment Deck × Notebook × Showing Up (1 Nov 2026)

**Status: DESIGN PROTOTYPE · UNAPPROVED · founder review gate · NOT READY.**
- No app code, schema, migration, flag, coverage row or decision register changed.
- No production implementation starts until the founder has reviewed this and approved a direction.

This follows PR #76 (five whole-app structures plus the competitive layer) and the CC-28 showing-up exploration, and builds on both. It designs the combination PR #76 §G recommended but did not design: Notebook-led capture and person pages, the Moment Deck as Today, People as a light index, and the founder's addition that **Showing Up** (act and follow through) is the third pillar connecting them.

## Where to look

**The prototype.** <https://claude.ai/artifact/FNJ5o5eqaL1sDk3Q85uAvv> (private until shared). The same page runs locally:

```bash
python3 -m http.server 8765 --directory docs/product/explorations/moment-deck-notebook-2026-11
```

Then open <http://localhost:8765/>. Its tabs:
- **Prototype:** the app, plus the presenter rail. The rail has six journeys with live steps, days (first run, Mon, Wed, Fri, quiet), density (typical, dense), state jumps, and a BUILT / ALPHA / PROPOSED / FUTURE overlay.
- **Rationale · Before / after · Interaction spec · Implementation · Decisions · Evaluation:** the six documents below, rendered.

| File | What it is | Brief's output |
|---|---|---|
| [`01-rationale.md`](01-rationale.md) | The unified concept, why it differentiates, the major structural choices, answers to the eight structural questions, the visual system | A |
| [`index.html`](index.html), `app.js`, `data.js`, `notes.js`, `proto.css` | The clickable prototype (vanilla JS, no build, no network beyond fonts and `marked`) | B |
| [`02-comparison.md`](02-comparison.md) | Current alpha vs proposed, surface by surface, with interaction states; borrowed conventions vs distinctly Kinship | C |
| [`03-interaction-spec.md`](03-interaction-spec.md) | Navigation, gestures, transitions and timings, moment and deck rules, ideas, intentions, the evidence ladder, review states, notebook lenses, accessibility, copy | D |
| [`04-implementation.md`](04-implementation.md) | What reuses the current React Native code (by file), new components, new logic, what needs decisions, suggested order | E |
| [`05-decision-log.md`](05-decision-log.md) | Sixteen founder decisions (departures marked), the founder's three 19 Oct showing-up points and how they're answered, tradeoffs, open questions | F |
| [`06-evaluation.md`](06-evaluation.md) | Self-review on memory, moment and showing-up quality; contract checklist; where I'd push back on my own design | — |
| `shots/` | Stills of every state, rendered from the prototype (`index.html#shot=<state>`) | — |
| `cur/` | Current-app screens, copied from `claude/alpha-integration` `docs/product/screens/alpha-rc/` | — |

## The six journeys (all run end to end in the prototype)

1. **Remember to connect:** Ben's marathon follow-up → why now → source → Message → return check → optional "anything worth remembering?" (with a sensitive line held).
2. **Tell something meaningful:** one messy note with three people, a relative, a self-correction, a vague date, a told-again change, good news, a promise and a sensitive line. You answer "Which Sam?", say yes to the private line, pin the date, and correct an over-read sentence in place; then Done → Undo.
3. **Revisit someone's life:** search "flour" → Rosa's Pages → the line and its source ("the 00 one") → an idea → "Bring it back Saturday" on your own promise (nothing duplicated).
4. **A thoughtful gesture:** Maya's birthday → Ideas for showing up → the book she keeps mentioning → Find it (future), Write a card, Keep it in mind for Thursday.
5. **Follow-through:** Wednesday, your promise to check in on Elena returns quietly → bring dinner Thursday → Help me start (proposal) → Messages → return check → "Did you offer to help?" → tell what you arranged.
6. **Connection becomes memory:** Friday, "I did this" → tell how dinner went → "Already known" prevents a duplicate → Sam's notebook shows the new page, the kept promise and her new start date.

The states also cover a quiet day, first run, a missing photo (Elena), sparse data (Aiko) and dense memory (35 people, Leo's two years).

## Evidence level and limits

- **Browser prototype: design evidence only.** Nothing ran on a device, against the gateway or with the live model.
- The understanding shown for the journey stories is **hand-written** to match existing rules. It is not a claim about what the pipeline outputs.
- Today's moment order on Wednesday is pinned for Journey 5; the real order is the unchanged eligibility score.
- Night appearance is not designed (see Decisions §D).

## Assets and provenance

- **People and botanicals:** reused from PR #76 (generated 31 Oct 2026 through the workspace image connector; job ids are in that PR's README). Every person is fictional sample imagery standing in for photos a user would choose. No new images were generated for this round.
- **Grain and garden pieces:** from WS-2's `assets/images/garden/`, via PR #76.
- **Fonts:** Archivo Black, Instrument Sans, Newsreader, from Google Fonts under the SIL OFL.
- **Library:** `marked` 4.3.0 from cdnjs (MIT), only to render these documents in the page.

## Founder review asks

1. **Direction (DN-1).** Is this the right combination of Notebook, Moment Deck and Showing Up?
2. **Departures that need a recorded yes:**
   - T4 (DN-2);
   - Pages as the first step toward "Your story together" (DN-4);
   - Intentions v0 (DN-7);
   - hard-time promise moments (DN-9).
3. **Showing Up.** Do ideas behind an explicit control, grounded only in what was told, with the five-step evidence ladder, answer your three 19 Oct points?
4. **Order of work.** Implementation §6 suggests the review screen first and the look last. Does that match how you want to sequence it, alongside the distribution work PR #76 flagged?
