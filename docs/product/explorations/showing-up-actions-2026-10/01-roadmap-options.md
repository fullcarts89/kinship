# Showing-Up Actions: roadmap options

**Status: PROPOSAL · NO BUILD AUTHORISED.** This is the complete roadmap after CC-28, reconciled with CC-25, in CC-25's five buckets. **Every existing item is preserved in its bucket; nothing is reprioritised; nothing commercial or non-communication is inserted ahead of the Commit-next work.** The new material is one Explore-later frame, additions to the hold list, a prioritisation of the capabilities inside the frame, and two sequencing alternatives with a recommendation. The register of decisions is `02-founder-decisions.md`. Written 18 Oct 2026.

---

## 1. The complete roadmap (CC-25's buckets, with CC-28 applied)

### A. Committed / current (unchanged)

B4 → B5 → B6 (report only; the founder reads the production report and decides; their step) → **B7 → B8 → B9** → employer semantics evaluation → low-coaching wife dogfood. K27's fix (CC-27, PR #50) on the founder's go. Nothing from CC-28 enters here.

### B. Commit next (unchanged)

1. Internal showing-up measurement (never user-facing; its definition in §24 unchanged).
2. Promise reasons (RSN-06). *Reading under CC-28:* a promise to do something is itself a showing-up action; "Kept it" is its outcome. No change.
3. Open-thread reasons (RSN-07).
4. Minimal proactive push (the Moment Today chose; D4's caps; pause; permission after a useful Moment).
5. The trust floor before broader Alpha: Remembered / Paused (PER-06), export (SET-04), delete-account v2 (SET-05), safe duplicate merge (PER-05).

**Not inserted here:** any gesture line, any hand-off to a provider, any Ask mode, any event source. The MVE-1 interviews (`00-opportunity-brief.md` §12) can run alongside the dogfood because they build nothing.

### C. Alpha direction (unchanged; dependencies noted)

Grounded Ask (v1 retrieval; one capability with `retrieval_answer`); hard-time reasons (RSN-09); I2b for surfaced plans; reason feedback ("Not helpful"); Siri / Action Button; required Alpha trust and ops work.

*Dependencies CC-28 notes without committing anything:* the first probe (§4) would ride beside Alpha, not inside any of these; Ask's suggestion mode would build on Ask v1 and is not Ask v1; "Ways to help" would build on RSN-09's rules and the Remembered / Paused brief.

### D. Explore later (one frame added)

Existing, unchanged: Intentions v0; chapters / life groups; calendar as an evidence source; reconnect as a Today candidate; About You in Settings; year-ago and an occasional or yearly reflection; a dock mic / voice; a text share extension; the Landscape / Garden checkpoint; the Opportunity Engine's external-event experiment; subscriptions and pricing; growth systems.

**Added: the Showing-Up Actions frame.** One frame, not a set of epics, holding:

| Capability | What it is | Absorbs / relates to |
|---|---|---|
| **SUA-1 · The gesture line** | One fixed-template "You could…" line beneath the primary action on the hand-off sheet and the Moment detail, for a small set of grounded contexts; opens Messages | K26's `MENTION_OPENERS`; the proposed first probe |
| **SUA-2 · Ask's suggestion mode** | "What would be thoughtful / what could we do / how could I support": retrieved lines and labelled suggestions, kept apart | Ask v1 (bucket C); never a chat |
| **SUA-3 · Ways to help** | A quiet disclosure under a sensitive line or a hard-time Moment: three fixed non-commercial lines | RSN-09; Remembered / Paused; CC-28 safeguard 9 |
| **SUA-4 · Intentions as wanted help** | An Intention may name the kind of help wanted ("see the Austin crew in person this year") | Intentions v0 (already in D); no new item |
| **SUA-5 · User-shared invitations and calendar as evidence** | A pasted invitation or a matched calendar event becomes a Coming up line with its source; Today's eligibility unchanged | Calendar as an evidence source (already in D); D6; Partiful has no API, so links only |
| **SUA-6 · A plain external hand-off** | "Send something" / "Look for shows" opening a provider with nothing passed; disclosed if any commercial relationship | The Opportunity Engine's external-event experiment (already in D); subscriptions / pricing (already in D) |
| **SUA-7 · Group convening** | From a chapter or an Intention, a group message; introductions as two retrieved lines | Chapters / life groups (already in D) |

Items already in D are not duplicated; the frame only says how they serve showing up.

### E. Hold / drop / absorb (additions marked)

Existing: rhythm as a user-facing or neglect mechanism; a separate reconnect engine; a separate Brief product; monthly reporting by default; About You as a primary destination; the widget; semantic slots ahead of Ask evidence; `reason_generate` unless copy problems emerge; a general chatbot; a task manager; scores; timeline-heavy CRM UI; Garden vitality and growth mechanics.

**Added (CC-28):**
- A standalone Kinship shopping marketplace or gift catalogue.
- A separate Gifts or Events tab or destination without demonstrated need (the two-item bar stands).
- Autonomous purchases, bookings, RSVPs, invitations or messages.
- An event-hosting / RSVP platform inside Kinship.
- Relationship-health scoring in any form, including "ways you've shown up" counts.
- Commercially driven nudges (any line whose presence is explained by revenue).
- Unbounded proactive opportunity generation (searching the world for reasons).
- A general-purpose concierge with no relationship grounding.
- A multi-action dashboard on a Moment (five equal-weight actions).
- Scraping Partiful or any provider's undocumented endpoints.

## 2. Prioritisation framework

| Capability | User outcome | Core-loop fit | Existing capability reused | Minimum dependencies | Privacy / trust risk | Complexity | Learning value | Monetisation relevance | Phase | Evidence gate |
|---|---|---|---|---|---|---|---|---|---|---|
| **SUA-1 gesture line** | A plan made, help offered, a note sent, from a Moment the user already had | High: rides the hand-off and return | K26 preference and templates; I1 detail; §23 analytics; the return check | Nothing new; a brief with copy and contexts | Low: user-initiated, non-commercial, fixed templates, sensitive lines excluded | S | High **for the suggestion layer** (does a grounded action suggestion help without intruding); it does not by itself prove real-world actions | None | Early Alpha, after the wife dogfood | G2 (`00` §13): ordinary loop proven; MVE-1 says the need is real. Real-world action evidence: G3b, §4 |
| **SUA-2 Ask suggestion mode** | "What could we do together?" answered honestly | High through Ask | Ask v1, `retrieval_answer` | Ask v1 built and used | Medium: a derived suggestion must never read as memory; a chat smell | M | High | None | Later Alpha | G3 passed; Ask v1 evidence |
| **SUA-3 ways to help** | Support given without guessing or intruding | High | RSN-09 rules; the page; Messages | RSN-09 brief; Remembered / Paused brief | High: sensitivity; one wrong attribution is grave | S–M | High for a subset | None by rule | Later Alpha, after RSN-09 | RSN-09 proven; interviews |
| **SUA-4 Intentions as wanted help** | Help with the kind of showing up the user chose | High | Intentions v0 | Intentions v0 | Low–medium: no tracking | S on top of v0 | Medium | None | Later Alpha | Intentions v0 decision |
| **SUA-5 invitations / calendar as evidence** | Being there, not just knowing | Medium: an evidence source | Coming up; the event rules | D6 trigger; a parsing design for pasted links; later calendar permission | Medium: other people's data in invitations; attendance never inferred | M | Medium | None | Later Alpha / Beta | G6 |
| **SUA-6 plain external hand-off** | A gift or a show found from what the user knows, on the provider's surface | Medium: fulfillment after the action | The hand-off sheet | SUA-1 evidence; the monetisation decision; disclosure copy | Medium–high: perception; D2 if anything is passed | S | Medium | **The only item with any** | After Alpha | G5 |
| **SUA-7 group convening** | A chapter brought together | Medium | Chapters; Intentions | Chapters built | Medium: AI-defined groups forbidden | M | Medium | None | Later | Chapters decision |

Reading the table: **SUA-1 is the only capability that is small, non-commercial and dependency-free, and it tests the thesis's first link: whether a grounded, contextual action suggestion is welcome.** Whether the actions happen is a second, later question (§4). Everything else waits on an existing roadmap item or a founder decision.

## 3. Where it fits in the phases, without displacement

```
Phase 4B (A)        B7 → B8 → B9 → employer evaluation                       unchanged
Wife dogfood (A/B)  round 1 (no push) → round 2 (minimal push)                unchanged
                    + MVE-1 interviews (no build)                             ← new, costs nothing
Commit next (B)     measurement · RSN-06 · RSN-07 · minimal push · trust floor  unchanged
Alpha (C)           Ask v1 · RSN-09 · I2b · feedback · Siri · trust/ops        unchanged
                    + SUA-1 gesture line (the probe), own brief, own flag     ← proposed, not authorised
Later Alpha (D)     Intentions v0 · chapters · calendar · reconnect · …        unchanged
                    + SUA-2, SUA-3, SUA-4 as their dependencies land          ← proposed
Beta / later (D)    external events · subscriptions · growth · …              unchanged
                    + SUA-5, SUA-6, SUA-7                                      ← proposed
```

No phase is lengthened by CC-28. The probe's size (S: templates and copy over an existing deterministic mechanism, one analytics enum, no schema, no server, no model) is why it can sit beside Alpha without taking an engineering slot from Ask or the trust floor; if that estimate proves wrong in the brief, it waits.

## 4. The proposed first experiment (SUA-1), specified enough to judge

**A proposal.** Nothing here is authorised; it needs its own brief and the founder's yes (G2).

**What SUA-1 validates, and what it does not.** SUA-1 is a small exploratory probe of the *suggestion layer*: does a contextual action suggestion, grounded in what the user told Kinship and placed beneath the action they already chose, feel like help rather than a task, a nag or an ad, and do people use it? It does **not** validate that non-communication showing-up actions (a dinner, a visit, a meal, a gift) actually happen: a tap opens Messages, and Kinship then knows only what the return check and the user tell it. Treat its result as evidence about suggestions, never as evidence about outcomes.

**The later evidence needed to validate real-world actions** (a separate stage, its own brief and founder decision; FD-5 in `02-founder-decisions.md`):
1. *User-confirmed action, content-free.* After a Yes to the return check that followed a gesture tap, one optional question ("Did you make a plan?" / "Did you offer to help?" Yes · Not yet), recorded as a kind enum, never text, never required, never counted back to the user. Or an equivalent: "Kept it" on a promise that came from a gesture; a later Tell that names the action ("we're having dinner Friday"), read by the pipeline as a plan or a promise the way it already does.
2. *Self-reported outcomes in interviews*, with the question asked about specific Moments the participant had.
3. *A consistent story across the three layers* (`00` §9): outcome, assistance, and (absent here) transaction. Assistance without outcomes means the line is pleasant but idle; outcomes without assistance means the line was not needed.
4. *A §24 evolution* only after that evidence exists: the qualifying action may then include a confirmed action kind, under the same content-free rules, with a founder decision.

- **Where:** beneath Message / Call on the hand-off sheet (board 1's follow-up sheet) and in the Moment detail (I1), as one quiet line in the same voice as "You could mention", after it. Progressive disclosure: present only when a context matches; zero is an answer.
- **Contexts (fixed, deterministic, from `mentions.ts`'s existing tiers):** a milestone ahead (wedding, engagement, new home, baby…) → "You could invite them to dinner." / "You could offer to help."; an event ahead the user knows about → "You could ask if they'd like company."; good news → "You could send a note."; an open promise of the user's own → nothing new (the promise is the action). **Excluded:** any sensitive line, any relative-subject line, anyone remembered or paused, anything retracted, superseded or expired.
- **What a tap does:** opens Messages (the same hand-off), nothing pre-written (D9). Never a shop, never a provider.
- **Copy:** fixed templates, a proposal for the founder's yes, in the K26 register; clearly a suggestion, never the user's words.
- **Measurement:** `gesture_shown` and `gesture_tapped` with `kind` as a closed enum (plan · help · note · company), content-free; the existing return check unchanged; interviews. Optionally one extra optional question after a Yes that followed a tap ("Did you make a plan?" Yes · Not yet), decided in the brief.
- **Flag:** per-user, founder's yes per id, as always.
- **Evidence gate to continue (G3, the suggestion layer):** some taps; interviews say "helping, not telling"; no stop condition (a nag, a task, an ad, judgment). **Evidence to stop:** any stop condition, or no taps and interviews that say the line is noise. **A second gate (G3b, real-world actions)** uses the evidence listed above and is the one that would justify investing further in showing-up actions as outcomes.
- **What it must not become:** a second primary action; a list; a count; a reason for a push; a commercial door.

## 5. Sequencing alternatives

### Alternative 1 · Conservative (recommended)

Validate ordinary showing-up first: the wife dogfood as planned (round 1 without push, round 2 with the minimal push), the approved metric reading the ordinary loop, MVE-1 interviews alongside. Then, in early Alpha, SUA-1 as the first user-initiated thoughtful action, with its brief. Commerce deferred past Alpha.

- *For:* the thesis is tested in the right order (can Kinship cause a conversation before it suggests a dinner); the wife's two rounds each test one thing (the product, then push), uncontaminated; the probe reaches eight to twelve people, enough to hear patterns; nothing in the committed sequence moves.
- *Against:* the first direct evidence about non-communication actions arrives one ring later; if the wife is the person most likely to act on a gesture line, that signal is missed.

### Alternative 2 · Accelerated experiment

The same probe, but entering wife dogfood round 2 beside the minimal push, as copy over K26's mechanism, with no change to committed engineering priorities.

- *For:* earlier evidence from the one user whose reactions the founder reads best; still S-sized; still non-commercial.
- *Against:* round 2's question ("does push feel nagging or like a reminders app?") is confounded by a second new thing; n = 1 cannot distinguish "helpful" from "polite"; a to-do feeling in round 2 would be hard to attribute; and the probe's brief would compete for attention with the Commit-next briefs the founder has yet to review.

### A variant worth naming · Founder-only preview

Alternative 1, with the probe flagged on for the founder's own account during dogfood round 2 (a per-user flag, the founder's yes for their own id). The wife's experience is untouched; the founder gets a feel for the line before writing the Alpha brief. Costs the same as Alternative 2's build, risks nothing in the wife's rounds. Whether the build is worth doing a ring early is the founder's call.

### Recommendation

**Alternative 1**, with the Founder-only preview as an optional variant if the probe's brief turns out to be as small as estimated. The trade-off accepted: later evidence in exchange for clean dogfood rounds and a sample larger than one. In both alternatives, **the probe is an experiment, not an authorised build**, and commerce stays deferred.

## 6. What is a proposal and what is authorised

| Item | Status |
|---|---|
| The thesis, the value order, the ten safeguards, the two standing tests | **Approved** (CC-28) |
| Bucket D's Showing-Up Actions frame; bucket E's additions | **Approved as roadmap placement** (CC-28); no build |
| MVE-1 interviews during dogfood | A recommendation; the founder decides (G1) |
| SUA-1 the gesture line | **A proposal.** A probe of the suggestion layer, not of real-world outcomes. Needs a brief and the founder's yes (G2) |
| SUA-2 … SUA-7 | **Hypotheses.** Each waits on an existing roadmap item and a founder decision |
| Any commerce, affiliate, revenue share, partnership | **Not approved; deferred.** FD-1 and FD-2 in `02-founder-decisions.md` |
| Any change to §24's metric | **Not approved.** A note only; FD-5 |
