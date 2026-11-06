# 02 · Comparative gallery and scorecard

**Status: EXPLORATORY · UNAPPROVED.** `gallery.html` shows all six directions on the same five states (a Moment, Priya's portrait, a birthday, a hard day, a quiet day) with live phones; `prototype.html` with *All six* shows any scenario side by side. Scores below are **design judgments with their reasoning, not user-research findings**. Sums are a summary of the judgments, not the decision; §3 names what only testing can settle.

## 1. The scorecard (1 = weak · 5 = strong; for cost and resemblance, 5 = cheap / low risk)

| # | Criterion | A Garden | B Bloom | C Keepsake | D Orbit | E Postmark | F Woven |
|---|---|---|---|---|---|---|---|
| 1 | Distinctiveness, memorability | 3 | 4 | 4 | 3 | 4 | **5** |
| 2 | Emotional warmth | 3 | 4 | 4 | 2 | 4 | 4 |
| 3 | Joy and playfulness | 2 | **5** | 4 | 3 | 4 | 4 |
| 4 | Appeal to younger adults | 2 | 4 | 3 | 4 | 3 | 4 |
| 5 | Appeal across age groups | 4 | 3 | 3 | 3 | 4 | 4 |
| 6 | Trust and credibility | **5** | 3 | 3 | 3 | 4 | 4 |
| 7 | Fit with the real-world mission | 4 | 3 | 3 | 2 | 4 | **5** |
| 8 | Sensitive moments | **5** | 3 | 2 | 3 | 3 | 4 |
| 9 | Readability and accessibility | **5** | 4 | 2 | 4 | 3 | 5 |
| 10 | Displaying sourced memory | **5** | 3 | 3 | 4 | 4 | 5 |
| 11 | Motion and interaction potential | 3 | 4 | 3 | 4 | 4 | 4 |
| 12 | Implementation and maintenance (5 = cheap) | 4 | 3 | 2 | 4 | 2 | 4 |
| 13 | Long-term visual durability | 4 | 2 | 3 | 3 | 3 | 4 |
| 14 | Resemblance risk (5 = low) | 3 | 3 | 3 | 2 | 2 | 4 |
| | **Sum** | 52 | 48 | 42 | 44 | 48 | **60** |

### Reasoning, row by row

1. **Distinctiveness.** Woven's band is the only element here you could draw from memory and that means "friend" before it means "app"; Keepsake and Postmark are distinctive but belong to known genres; Bloom's flowers are bold but flat florals are everywhere; Garden and Orbit are tasteful categories, not identities.
2. **Warmth.** Garden is warm in copy only; Orbit is cool by construction; the rest are warm in different temperatures (Bloom hot, Keepsake cosy, Postmark sunny, Woven hand-made).
3. **Joy.** Bloom shows it on every screen; Keepsake, Postmark and Woven show it in bounded places; Garden permits it; Orbit is pleasant rather than glad.
4. **Younger adults.** Bloom, Orbit and Woven look like things a 22-year-old already has on their phone or wrist; Keepsake and Postmark can read as nostalgic genres; Garden reads as their parents' stationery. (Judgment; §3 asks for testing.)
5. **Across ages.** Garden, Postmark and Woven are legible and dignified at 60; Bloom and Orbit skew young; Keepsake's density and tilt cost older eyes.
6. **Trust.** Garden's typographic gravity is unmatched; Woven and Postmark keep it because the composition is the letter; Bloom's fields and Keepsake's tape spend some of it; Orbit's gradient-free geometry is credible but corporate.
7. **Mission fit.** Woven's object *is* friendship; Postmark's object is showing up somewhere; Garden's is remembering; Bloom's is a mood; Keepsake's is keeping; Orbit's is "connection" in the abstract, the word the contract distrusts.
8. **Sensitive moments.** Garden's plain letter is the model; Woven's plain page with a quiet band is close; Postmark's plain card and Orbit's quiet room are acceptable; Bloom needs its plain rule enforced to be acceptable; Keepsake cannot fully stop looking crafty.
9. **Readability.** Garden and Woven keep the approved type scale and contrast; Bloom and Orbit are fine; Postmark's fixed-height card fights Dynamic Type; Keepsake's tilt, texture and 11 pt typewriter labels fail AX sizes without special-casing.
10. **Sourced memory.** Provenance lines, quotation rules and the detail sheet are identical everywhere; what differs is whether the decoration competes. Garden and Woven never do; Orbit's cards and Postmark's rule hold; Bloom's fields and Keepsake's slips sometimes do.
11. **Motion.** Every direction has a signature move (`04`). Garden's is the subtlest; Orbit and Postmark have the most natural ones; Bloom's unfold and Woven's weave are the most *ownable*; Keepsake's drop is charming but heavy.
12. **Cost.** Garden is already specified; Orbit and Woven are one generator plus tokens; Bloom needs an illustration set and fields; Keepsake and Postmark need an asset per kind of reason and density/height rules.
13. **Durability.** Garden and Woven will look the same in ten years; Bloom is a 2024–26 flat-floral moment; Keepsake and Postmark are nostalgia genres that date gently; Orbit's lavender-and-violet is this decade's SaaS.
14. **Resemblance.** Garden → wellness/journal; Bloom → greeting card/habit app; Keepsake → social scrapbook; Orbit → fintech/social graph; Postmark → travel/events; Woven → a craft shop, which is the least damaging of the six.

## 2. Emotional first impressions (our answers; to be replaced by participants')

| Question | A Garden | B Bloom | C Keepsake | D Orbit | E Postmark | F Woven |
|---|---|---|---|---|---|---|
| What kind of app is this? | A journal, or a very good newsletter | A birthday-card app | A scrapbook | A finance or planning tool | A travel or events app | Something about friends |
| How would I feel opening it? | Composed, slightly dutiful | Cheered, possibly over-cheered | Fond, slightly cluttered | Efficient | Sunny, outward | Warm, at home |
| Would I show it to a friend? | For its taste | Yes, for the flowers | Yes, for the handwriting | Maybe | Yes, for the postcard | Yes, for *their* band |
| Does it make me want to do something thoughtful? | Yes, quietly | Yes, loudly | Somewhat | Not especially | Yes, especially plans | Yes |
| What might make me stop using it? | It feels like homework | The colour gets tiring; it feels silly on a bad day | It gets messy; it feels childish | It feels like work software | It feels like it wants me to travel | The craft reading wears thin; a hard day with a bright band |

## 3. What only testing can settle

1. Whether Woven reads as "friendship" or as "craft / camp / girls' summer" across genders and ages, and whether that reading is a liking or a disliking.
2. Whether Bloom's joy survives a week of use or becomes noise, and whether its plain hard-day page feels like the same app.
3. Whether the Garden Letter's "serious" reading is a rejection or a respect that converts to use (older cohorts may prefer it outright).
4. The typographic voice for Woven (Gabarito vs the serif voice F′): warmth versus friendliness is a taste question with a measurable "would you open this" answer.
5. Whether the band's fixed width is *read* as fixed, or whether participants still infer meaning from colour or pattern; the same for Bloom's petal count and Orbit's arrangements.
6. Floss-colour separation for colour-vision-deficient participants.
7. Whether any direction's celebration motion is perceived as a reward for the user rather than a cheer for the friend.

The study design for these is in `08-study-proposal.md`.

## 4. Finalists

**F Woven, A Garden Letter, B Bloom**, in that order, go to `03-finalist-explorations.md`.

- Woven leads on the mission, on distinctiveness and on cost, and holds trust and sensitivity; its risks are testable, not structural.
- Garden Letter is the baseline the founder adopted and the strongest on trust; it must be compared at full strength, and its structure survives in every finalist.
- Bloom is the most direct answer to "more colour and life" and the clearest test of whether that answer is right; it is included because the question deserves a real, not a straw, version of it.

Not taken forward: **Keepsake** (cost and density defeat it on a rich portrait and at AX sizes; the handwriting idea is kept as a candidate for verbatim words in any direction), **Orbit** (the least human and the closest to the forbidden readings), **Postmark** (the right warmth, the wrong product: it describes going places, and its card fights content and type size; its stamp idea survives as a note).
