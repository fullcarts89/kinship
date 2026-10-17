# Round 2 critique: what round 1 solved, what it didn't, and whether it is more engaging or only more illustrated

**Status: EXPLORATORY · UNAPPROVED.** The founder adopted the Garden Letter as the leading creative direction (not for production) and asked this round to close one gap: round 1 made Kinship more beautiful without yet proving it would be more engaging.

## The five weaknesses from round 1, revisited

| # | Round-1 weakness | Round 1 did | Still open after round 1 | Round 2 does |
|---|---|---|---|---|
| 1 | Every kind of day looks the same | A kicker, a kind-specific illustration and a warm band per kind of moment | Only celebrations were shown; difficult days had no treatment | A plain variant (no kicker, no illustration, no band) for a hard time; a remembered person; a sensitive line on a page |
| 2 | Sixty percent unintended paper | The meadow and the hedgerow | The hedgerow added inventory, not meaning, and an ordering problem | Three grounds compared; the contextual one recommended: a sprig appears only where there is a grounded reason, the quiet day gets the meadow |
| 3 | The only image is 46 pt and never moves | Light, a sundial, a standing sprig, an engraving | The sundial's usefulness is unproven | Kept as a thing to validate on device, not argued for |
| 4 | The showing-up moment has no moment | Press + light + root mark (1.5 s of spectacle) | Reads as a task completed and a reward collected; the letter is crushed | Three motions compared live; "Resolve" recommended: the question becomes its answer in place, one haptic, nothing crushed |
| 5 | The week reads as a to-do list | Day numerals, ochre for your own promise | The busy fixture broke production's order and counts | Production's order (a Waiting line first, three Coming up lines, "and N more") and counts, exactly |

## Weaknesses round 1 introduced, now fixed

- **Unsupported quotation marks.** The hope line (`hopeLine()` in `todayModel.ts` builds "Ben was hoping to break four hours." from `event_goal`) was set in quotation marks as if the user had said it. It is a grounded paraphrase. Round 2's rule: quotation marks only for verbatim source text; italic without quotes for grounded copy; roman for the statement. The verbatim note appears in the detail sheet under "From your note", so the source is one tap away and never implied on the page. (`02-design-system.md` §3.)
- **The return check competing with the moment.** Round 1 showed the question above the letter and its pill. Production never does this: an acted reason is excluded from the moment (`todayModel.ts`, `local?.acted`). Round 2's composition makes the question the moment, the reason its context, and the hand-off a quiet link.
- **A fixture that lied.** Maya's birthday was "today" and "Saturday" in the same prototype. Round 2 dates each state honestly (the birthday is Saturday, Oct 17, and the week on that day shows the following week).
- **A count on People.** "Fourteen people. Mid-October." is gone.
- **A third meaning for ochre.** The root mark existed only for the hedgerow; with the contextual ground it has nothing to mark. Withdrawn.

## Is it more engaging, or only more illustrated? A candid answer

Illustration alone would not make Kinship more engaging; a laurel on a page nobody returns to is wallpaper. The engagement case rests on four things that are not decoration, and each is now visible in the prototype:

1. **Every open is different in kind, not just in words.** The kicker, the illustration and the band mean a birthday looks like a birthday before you read it, a race's aftermath looks like a question, and a hard time looks like paper and ink. The variation is deterministic and comes only from the reason type, so it costs nothing in trust.
2. **The person has presence.** The profile now opens on who they are and the one current thing, with the shared ground set apart and the user's own words honoured as quotes. A page that feels like Priya is a page you visit; a list of facts is not.
3. **Showing up is answered in Kinship's own voice.** "Did you ask Ben how it went?" becomes "You asked Ben how it went." in place. It is a sentence, not a reward. It is the kind of acknowledgment a friend would give.
4. **The quiet day is composed.** Nothing is invented, and the page is still a place: the hour, the season, the meadow.

What the design cannot do, and does not try to do, is manufacture a reason to come back. If the household dogfood shows that people open Kinship no more often than before, the honest reading is that the memory is not yet useful enough, not that the page needs more decoration. Engagement here is a consequence of usefulness made visible, and the measurement that will tell is CC-25's showing-up metric, not sessions.

## What remains open after round 2

- The sundial, the exact tint levels and the 36 pt statement need a native build to judge; a browser cannot settle them.
- The hard-time treatment is a sketch; the tone and lock-screen rules of RSN-09 are not written yet, and the design must follow them when they are.
- People's personality is modest by intent: a serif name, letter marks, an index. Efficiency wins on that screen, and the founder's review agreed.
- The profile's "now" line is a proposal about *emphasis*, not about information architecture; it must not pre-empt B8's work on What Kinship knows. It is marked as such in the decisions.
- Nothing here is evidence that the native React Native implementation will feel the same. Every motion value is a starting point for the device.
