# 06 · Founder decision register

**Status: EXPLORATORY · UNAPPROVED.** A merged exploratory document is never an approved product requirement; a yes is recorded only in `approved-design-coverage.md`. Categories follow round 2: **A** directionally approved for future planning · **P** provisional, requires implementation or native evidence · **D** deferred, requires a future founder product decision.

## 1. Existing approved product rules (unchanged by this exploration; every direction obeys them)

| Rule | Source |
|---|---|
| The north star, the core loop, the permanent rules (silence beats a wrong detail; every statement has a source; nothing quantifies a relationship; no maintenance; the app leads back to the person) | Contract §2 |
| Intelligence is invisible; no AI iconography, badges, model names, confidence, chat as a primary surface | Contract §3 |
| Two destinations (Today, People); the Tell dock; everything else contextual | Contract §5 |
| Sprigs are identity-only; `sprig_marks` off; history never changes a mark | D8 |
| People search-first and alphabetical; no closeness ordering | T4 |
| Trust-required memory needs a yes; sensitive classes always confirm | §7, D1 |
| A hand-off alone never counts; only Yes records contact; K28's page-origin return check | T12, CC-26 |
| First use is not a quiet day; the fresh-install gates | §8, §10 |
| The roadmap buckets and the post-B9 pivot; Ask as grounded retrieval; no commerce ahead of relationship value | CC-25, CC-28 (PR #51, open) |

## 2. Previous but unapproved design proposals (rounds 1 and 2; status as recorded there)

Round 2's sixteen decisions (`../today-redesign-2026-10/round-2/03-founder-decisions.md`) and AR-1…AR-9 stand as recorded: the Garden Letter as the leading direction (A), the editorial Moment (A; 36 pt P), the quotation rule (A), the engraving vocabulary (A), the atmosphere (A; levels P), the sundial (P), the contextual ground (A), Resolve (A), the return composition (A), press-and-lift (P), People's treatment (A), the portrait (A; featured line P), the hard-time treatment (A; channel D), Ask's placement (A/P/D), the push (A/D), Remembered / Paused and Ask (D). **This exploration does not revoke any of them.** It proposes that some of the *visual* ones (the engravings, the atmosphere, the sundial, the ground, the sprig as the identity mark) be reconsidered under decision BD-1 below; the *structural* ones (the Moment composition, the quotation rule, Resolve, the return composition, People's order, the portrait's architecture, Ask's placement, the push) are carried into every direction unchanged.

## 3. New recommended creative direction

| # | Decision | Recommendation | Category |
|---|---|---|---|
| BD-1 | **The identity:** keep the Garden Letter, evolve it (Bloom), adopt a new direction (Woven), combine, or defer | **Adopt Woven as the identity on the Garden Letter's skeleton** (the letter composition, the quotation rule, Resolve, the plain rule, the quiet day, the two-item bar, the sheets, the Ask architecture). Keep Garden Letter's structure; replace its skin and temperature. Reasoning in `07` | **A** proposed; the founder's call |
| BD-2 | **The person mark:** the sprig (built, tested) vs the band | The band, with the sprig's exact guarantees (id-only seed, fixed size per place, constant visual weight, a CI property test) and the same generator architecture. The sprig is retired from the UI, not from the code, until the decision is final | **P** (depends on BD-1 and the study) |
| BD-3 | **The voice:** Gabarito statements (F) vs Newsreader statements (F′) | Gabarito, subject to the study; both are in the prototype | **P** (study) |
| BD-4 | **The occasion vocabulary:** engravings (A) vs charms (F) vs flat art (B) | Charms: small, bounded, cheap, and nothing on a hard day | **A** proposed |
| BD-5 | **The atmosphere:** the hour's tint, the sky, the sundial, the meadow | Withdraw all four under Woven (they belong to the garden); keep the season line on a quiet day; keep the celebration treatment as charms only | **A** proposed |
| BD-6 | **The "understood" colour:** ochre → teal | One colour, two meanings, as approved; the hue follows the direction | **A** proposed |
| BD-7 | **The six motion concepts** (`04`) | Adopt the principles; adopt Understood, Arrival, Yes-with-nod and Press as the set; Celebration and Into-a-person after a native pass | principles **A**; 1, 2, 4, 6 **A**; 3, 5 **P** |
| BD-8 | **Bloom's lesson:** colour fields per kind of day | Not adopted (fields fight content and need an enforced plain rule); the *kicker and charm* carry the kind of day | **A** proposed (a no) |
| BD-9 | **Keepsake's lesson:** the user's verbatim words in a distinct face | Worth testing in any direction (Instrument Serif italic in Woven already does this quietly); handwriting itself not adopted | **D** |
| BD-10 | **Postmark's lesson:** a place-and-experience register for plans and shared experiences (CC-28) | Not adopted as identity; a future "make a plan" secondary action can use a postcard-like sheet if ever built, under its own brief | **D** |

## 4. Provisional details requiring native testing

- The nod on Yes (4°, 480 ms): whether it reads as acknowledgment or cuteness on a device.
- The weave on arrival (520 ms) against the "nothing scales or bounces" intent.
- The shared-element Into-a-person transition: feasibility and feel in React Native.
- Band legibility at 56 × 10 in a row on a non-Retina-class older device; the floss palette under True Tone and Night Shift.
- Gabarito at 36/40 vs Newsreader at 36/40 for a three-line statement at AX1 on an SE.
- Every contrast pair in light and night with the tokens as finally set.

## 5. Unresolved founder decisions (not decided here)

| # | Question | Why it matters |
|---|---|---|
| FD-1 | Whether to run the study (`08`) before deciding BD-1, or decide on judgment and validate in the household dogfood | The study is two weeks; the dogfood is the real test but comes with the Garden Letter build cost already spent if the decision is wrong |
| FD-2 | Whether the sprig's withdrawal is acceptable given the approved "three signatures" (contract §4) | The band would become the second signature; the serif line and the provenance dot remain; the contract's wording would change in a founder-reviewed PR |
| FD-3 | Whether the first Tell as one person, one story (PR #52) is adopted, which this exploration drew but did not decide | It changes two approved setup surfaces' copy |
| FD-4 | Whether CC-28 (PR #51) is merged, which fixes the showing-up vocabulary this exploration assumed | A secondary action on a Moment and Ask's suggestion mode are drawn as Future; they stay undesigned until their own briefs |
| FD-5 | Whether any direction's celebration motion should exist at all before the minimal push ships (the push's lock-screen privacy rules are stricter than Today's) | A celebration never reaches the lock screen in any direction; the question is only about Today |
| FD-6 | Timing: whether the visual redesign remains after the household dogfood (as recorded) or whether a tokens-only step (colour, type, mark) could precede it | A tokens-only step is cheap but means the wife sees two identities in two builds |
