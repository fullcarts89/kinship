# 00 · Creative diagnosis and research

**Status: EXPLORATORY · UNAPPROVED. Founder-requested research and design exploration only.** Nothing here changes production code, the approved design, `approved-design-coverage.md`, the roadmap or any decision. Fictional people and notes throughout. Where a claim below rests on documented research it is cited; everything else is design judgment and is labelled as such.

## 1. What was reopened, and why that is the right question

Two rounds produced the Garden Letter: editorial, botanical, calm, source-backed, coherent across Today, People and the portrait, with a provisional architecture for Ask (`../today-redesign-2026-10/round-2/`). The founder's wife asked whether it is too serious, subdued and contemplative for a product about friendship, and whether a younger person would ever be happy to open it. The founder reopened the design before implementing, which is the only cheap moment to do so.

The question is not "should Kinship be fun?" The product's mission is that someone shows up for a friend; its best day is a sentence, a door out of the app, and a friend who felt remembered. The question is whether the current identity **expresses the joy of having people** or only the **duty of remembering them**. Those are different emotional outcomes, and two rounds optimised the second.

## 2. The Garden Letter, assessed as a first-time user

The ten questions the brief asked, answered against the corrected round-2 prototype (`../today-redesign-2026-10/round-2/prototype.html`) and its stills.

| # | Question | Assessment |
|---|---|---|
| 1 | What does it communicate in the first five seconds? | *Thoughtful, literary, grown-up, private.* Paper, a serif sentence, a hairline plant, an ochre dot. It reads as a well-made notebook or a very good newsletter. It does not read as "friends". |
| 2 | Who finds it especially appealing? | People who already like quiet, considered things: readers, people who keep journals, design-literate adults, anyone tired of loud apps. Probably 30–55, probably already thoughtful about relationships. |
| 3 | Who finds it uninteresting, formal, serious or dated? | Anyone whose phone is a social place rather than a desk. The engraved laurel and candle have a wedding-stationery register; the sundial and meadow are tasteful but nineteenth-century. A 22-year-old is more likely to respect it than to screenshot it. |
| 4 | Does the garden metaphor communicate meaningful relationships, or a wellness/journaling app? | The *sprig* works: one mark per person, identity only, a lovely idea. The *garden* around it does not: a meadow, a sky, a sundial and a season line are the vocabulary of meditation and journaling apps (Calm, Day One, Finch's garden). The metaphor describes the user's inner weather, not the friend. |
| 5 | Does it communicate friendship as an enjoyable part of life? | Not yet. Every kind of day is handled with restraint; a birthday gets a candle and a 6% band. Joy is *permitted*, never *shown*. The copy ("It's Maya's birthday.") is warm; the page is not. |
| 6 | Distinctively memorable, or beautifully understated? | Understated. The "remove the logo" test is passed by the sprig and the serif line, but a memory of the app is a memory of paper. Nothing in it is a thing you would draw for someone. |
| 7 | Are the illustrations expressive or decorative? | Decorative, by design (one engraving per kind of reason, no faces, no colour). They are good at *classifying* a day and poor at *feeling* it. |
| 8 | Could motion add joy, or undermine restraint? | Round 2's Resolve is right and should survive. Beyond it, the motion vocabulary (arrive, sheets, fades) is the vocabulary of every well-made iOS app. There is room for one or two signature movements that are the brand's own, without any reward mechanics (see `04-motion-and-interaction.md`). |
| 9 | Would a younger user understand it as something they would enjoy regularly? | They would understand it (it is clear) and might admire it; "enjoy regularly" is the gap. Nothing in the first five seconds says "this is about my people" in a way they would recognise from their own lives. |
| 10 | What should survive regardless of theme? | The experience architecture (Today · People · Tell dock · the sheet); the letter composition (kicker, statement, context, paraphrase, provenance, one action, Not now); the source-backed quotation rule; one meaning for the "understood" colour; Resolve after Yes; the plain rule for a hard day; the quiet day as a composed place; identity-only marks; the hairline row; the Ask architecture (AR-1…AR-9); every trust invariant. In short: everything that is *structure* survives; what is up for discussion is *skin, voice and temperature*. |

### The distinctions that got blurred

The brief lists seven emotional registers and asks that they not be treated as interchangeable. Where rounds 1–2 stand:

| Register | Rounds 1–2 | Comment |
|---|---|---|
| Calm and peaceful | Achieved | Correct for the product's silence rule |
| Serious and solemn | **Over-achieved** | The engraving set, the meadow and Newsreader at 36 pt together read as solemn even on a birthday |
| Intimate and personal | Partly | The user's own words in quotes is intimate; the rest is impersonal in the way a nice hotel is |
| Joyful and inviting | **Missing** | Nothing on any page is visibly glad |
| Playful and expressive | Missing, deliberately | Fine as a choice for *playful*; a mistake for *expressive* |
| Youthful and trend-dependent | Absent | Good: nothing here will date in two years |
| Emotionally warm and enduring | Half | Enduring yes; warm only in copy |

**What we got wrong in the first two rounds, candidly.** We equated thoughtful with quiet and quiet with serif-on-paper, and we spent two rounds refining a register rather than questioning it. We also let the *garden* grow around the *sprig*: the sprig is a friend's mark; the meadow, sky and sundial are the user's mood. And we built a celebration vocabulary (laurel, candle, rings) that is formally correct and emotionally inert.

## 3. What the research says, and what it doesn't

The brief asked for documented research to be separated from design interpretation. Below, **[R]** marks a documented source and **[J]** marks our judgment.

### Products people enjoy opening

- **Partiful** [R]: press coverage credits humorous, casual invitation pages where the cover art is the canvas; Google's best app of 2024 and an Apple finalist; a Pratt usability critique (2026) faults inconsistent iconography and an under-filled event page. [J] The lesson is not "be loud": it is that *the user's own content* (their cover, their guests) is the brand, and the chrome stays simple. Sources: [Wikipedia](https://en.wikipedia.org/wiki/Partiful), [Pratt critique 2026](https://ixd.prattsi.org/2026/09/design-critique-partiful-ios-app/), [NBC New York](https://www.nbcnewyork.com/news/business/money-report/meet-partiful-the-gen-z-party-planning-staple-thats-taking-on-apple/6231135/?amp=1).
- **Locket** [R]: a home-screen widget of friends' photos; a cap of 20 friends; no follower counts; reactions are not counted; a monthly recap of what friends shared; growth from TikTok; by late 2025 most new users of its Rollcall feature were Gen Alpha. [J] The strongest signal in the set for Kinship: a small circle, no metrics, a keepsake that accumulates, and *the friend's face where you look anyway*. Sources: [App Store listing](https://apps.apple.com/us/app/1600525061), [TechCrunch, Nov 2025](https://techcrunch.com/2025/11/03/lockets-social-app-is-picking-up-steam-with-gen-alpha), [Brandwatch](https://www.brandwatch.com/?p=184241).
- **BeReal** [R]: minimal, metric-free by design; peak ~73 m monthly users in 2022; daily posting became a chore; sold to Voodoo in 2024 for about €500 m with ads to follow. [J] A warning about *constraint as the whole personality*: once the novelty fades, there is nothing left to love. Sources: [Sherwood](https://sherwood.news/snacks/tech/unfiltered-social-app-bereal-is-sold-after-pandemic-growth-didnt-turn-into/), [Business of Apps](https://businessofapps.com/?p=79501).
- **Finch** [R]: a self-care pet; positive reinforcement only, "no negative enforcement for neglecting tasks", a gentle tone; critics raise intrinsic-vs-extrinsic motivation, paywalls and a busy home screen. [J] Kinship cannot use a pet (nothing may stand in for the relationship) but Finch proves that *gentleness* and *liveliness* are not opposites. Sources: [WhistleOut review](https://www.whistleout.com/CellPhones/Guides/finch-self-care-app-review), [Pratt critique 2026](https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/), [Vocal critique](https://vocal.media/critique/the-criousity-of-the-finch-app).
- **Duolingo** [R]: an official illustration system built from three rounded shapes ("pointy shapes are off-brand"), a few colours per drawing, rhythm from varied sizes, exaggeration toward caricature; the mascot is a character in use, not a logo. [J] The craft lesson (a bounded shape grammar, few colours, rhythm) is worth taking; the character and the streak economy are not. Sources: [design.duolingo.com/illustration](https://design.duolingo.com/illustration), [Duolingo blog, shape language](https://blog.duolingo.com/shape-language-duolingos-art-style/).
- **Spotify Wrapped 2025** [R]: a "visual mixtape" with a reduced palette, bold imagery, gradients and tactile textures; built in Rive with dummy data first and driven by real data later. [J] The production pattern (prototype motion with fixtures, then bind) is exactly how a Kinship motion layer should be built. Sources: [Spotify newsroom](https://newsroom.spotify.com/?p=37865), [Rive case study](https://rive.app/blog/spotify-used-rive-for-spotify-wrapped-2025).
- **Letterboxd** [R]: no official rebrand found; the enduring identity is a poster grid and a green-and-orange palette, and the key product choice is calling logs "diary entries". [J] Naming and a two-colour palette can carry a brand for a decade. Source: [design analysis](https://blakecrosley.com/guides/design/letterboxd).

### Younger adults and "maximalism"

- [R] Pinterest's 2025 forecast reports a move from muted minimalism toward playful, vivid colour and unexpected materials; a 2024 survey study in the *International Journal of Graphic Design* examines Gen Z preferences for white space, simple type and neutral colour but its results were not available to us. Vendor blogs assert that minimalism "communicates boredom" to Gen Z without data. Sources: [Storyboard18 on Pinterest Predicts](https://www.storyboard18.com/how-it-works/pinterests-2025-trend-forecast-bold-aesthetics-surreal-parties-and-maximalist-design-49607.htm), [Garuda study listing](https://ospro.usk.ac.id/article/garuda/4936616).
- [R] 2026 brand-trend coverage emphasises hand-made, imperfect marks as "human labour signals" against AI-polished visuals, and restraint paired with warmth. Sources: [Bigeye](https://www.bigeyeagency.com/insights/2026-design-trends-impact-on-consumer-brands), [Moburst](https://www.moburst.com/blog/top-mobile-web-design-trends/).
- [J] We found **no rigorous study** showing that younger adults prefer visually maximal apps. What the documented examples share is not density; it is *a small circle, no scores, the friend's own thing (a face, a cover, a photo) as the content, and visible human craft*. That is a brief Kinship can meet without becoming loud.

### Older adults and accessibility

- [R] A 2025 systematic review (132 studies) names simplified navigation, enlarged text and touch targets, voice interaction and error-tolerant interfaces as essential, and reports that participatory design improved usability. Practitioner guidance prefers 7:1 contrast for older eyes, body text at 16–18 pt, obvious tap feedback. Sources: [PMC systematic review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12350549/), [Glance guide](https://thisisglance.com/learning-centre/how-do-i-design-apps-for-elderly-people).
- [J] Every direction below keeps the approved 44 pt targets, 16 pt body, Dynamic Type to AX sizes, an immediate pressed state, and ink-on-ground text at ≥ 4.5:1 (7:1 for body in the finalists). Colour is carried by marks and fields, never by text alone.

### Delight versus reward

- [R] NN/g's distinction: UI embellishment yields only *surface* delight; *deep* delight needs functional, reliable, usable interfaces first. Source: [NN/g, emotional design topic](https://www.nngroup.com/topic/emotional-design/?page=3) and secondary summaries ([Infinum](https://infinum.com/blog/surprise-and-delight/)).
- [R] On streaks: GitHub's removal of public streak counters in 2016 reduced single-contribution "streak-keeping" days and streak abandonment spread socially (Chalmers); a Pokémon Go survey (n = 1,540, a master's thesis) found streaks induced fear of missing out and that gamification raised addiction likelihood via flow and stress; a qualitative study of a language app reports disappointment, self-recrimination and routine disruption from gamification misuse. Sources: [Chalmers](https://research.chalmers.se/en/publication/552903), [BI Norwegian thesis](https://biopen.bi.no/bi-xmlui/handle/11250/2623593), [arXiv 2203.16175](https://arxiv.org/pdf/2203.16175).
- [J] The evidence is strongest against *loss-aversion* mechanics (streaks, public counts) and silent on whether non-competitive delight moments carry the same risk. Kinship's rule stands: delight for the *friend's* moment, never a reward for the *user's* action.

### Motion tooling

- [R] Callstack's React Native benchmark on an old Android device: Lottie ~17 fps vs Rive ~60 fps for the same animation; Rive's own file-size claims are vendor-grade; Wikimedia engineers note both render at runtime and results depend on the asset and the device. Sources: [Callstack](https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation), [Wikimedia Phabricator](https://phabricator.wikimedia.org/T433250).
- [R] iOS 26 adds "Reduce Bright Effects" and makes Reduce Motion more reliably tone down Liquid Glass; "Prefer Cross-Fade Transitions" remains the user's control for replacing spatial motion. Sources: [9to5Mac](https://9to5mac.com/2026/03/23/ios-26-4-offers-two-liquid-glass-customization-updates/), [TidBITS](https://tidbits.com/?p=71909).
- [J] For Kinship: the proposed motions are small enough for Reanimated and `react-native-svg`; Rive is justified only if an illustrated direction (Bloom, Postmark) ships, and then only for the two or three signature pieces. Profile on the oldest supported iPhone before deciding.

### Typefaces considered (all OFL, Google Fonts)

Newsreader, Instrument Sans, Instrument Serif, Fraunces, DM Sans, Lora, Caveat, Courier Prime, Work Sans, Syne, Manrope, Bricolage Grotesque, Literata, Gabarito. [R] Fraunces, Instrument Serif and Bricolage Grotesque are confirmed OFL; Gambarino's licence could not be confirmed and it is not used. Source: [Bricolage repository](https://github.com/ateliertriay/bricolage), [Instrument Serif](https://rightfontapp.com/family/instrument+serif).

## 4. The emotional-positioning gap, stated

Kinship's intended emotional outcome is *"I'm someone who shows up"* (CC-25). The Garden Letter makes that feel like a virtue practised in private. The gap is that it does not make *having these people* feel like the good part of life. The six directions in `01-brand-territories.md` are six attempts to close that gap without touching a single trust, memory, consent or notification contract.

## 5. Principles that every direction in this exploration obeys

1. Nothing visual varies with history, recency, contact or "closeness": every person's mark is a pure function of their id and is drawn at one size per place (D8, extended to every direction).
2. One drawing per *kind* of reason, never per person; none for a sensitive reason; nothing celebratory ever appears near health, death, pregnancy, conflict or money.
3. One colour means "understood" and "something you said you'd do", and nothing else (the ochre rule, re-coloured per direction).
4. Quotation marks only around verbatim words; grounded copy in roman or italic; illustration never beside provenance (round 2 §3).
5. Delight for the friend's day; never a reward for the user's action; no streaks, points, progress, confetti on a message, growth or decay.
6. Every movement has a 150 ms fade twin that keeps its meaning.
7. Text is ink on ground at ≥ 4.5:1 everywhere; colour is carried by marks and fields.
8. The experience architecture, the two-item bar, the Tell dock, the sheet, the return check and the Ask row (AR-1…AR-9) are unchanged in every direction.
