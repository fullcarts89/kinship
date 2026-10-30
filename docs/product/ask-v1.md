# Ask Kinship v1: grounded retrieval from People's search field

**Status:** built on `claude/ws6-ask-kinship-72d73c` (PR #73, draft), 30 Oct 2026, under the founder's end-to-end completion directive (FD-30a, `docs/agent-loop/PRODUCT_DELIVERY_HANDOFF.md`). Shape: `KINSHIP_2_DECISIONS.md` CC-25 ("Ask Kinship: the first major Alpha expansion"), bounded by CC-28 (a retrieved memory and a derived suggestion are different things). Coverage row 22. Readiness: **NOT READY** (no native pass yet).

## What it is

The People search field already finds a name. Now, when the words say more than a name, Kinship looks through the user's own memory and shows, under the people the words name, **"In your memory"**: every line that answers, in the words the person's page shows, with its source. Nothing is phrased, summarised, suggested, counted or ranked. When nothing answers, one quiet line says so.

It runs on the phone, over the mirrored store, with no model call and no server change. The same lines, provenance, composed residence line and "View Ben" deep link the person's page uses (`recordFor`, `personFocusHref`) are reused, so a found line is the page's line.

## What it answers

| You type | Kinship shows |
|---|---|
| `What is John into?` | John's interest and taste lines ("Loves pottery", "Is into trail running"), newest first |
| `What gift did Susan mention?` | Susan's lines with "gift" in their words or their topic |
| `Who do I know in Alameda?` / `Alameda` | Everyone whose residence line reads Alameda ("Lives in Alameda, California"), each under their name; a remembered or paused person last |
| `When did I last see Sam?` / `When did I last talk to Sam?` | The conversations the user confirmed with Sam, in the trail's words ("You messaged · Oct 6 · Sam got the Stripe job", "You saw Sam · Sep 20"), newest first, and any moment with Sam. Both Sams if two are in People; never a guess between them |
| `Where does Chris live?` | Chris's residence line (from its reading, so "Chris moved to Denver" answers) |
| `Michelle` / `What is John's sister up to?` | The line about John's sister Michelle (a related person's name or relation) |
| `Who works at Meta?`, `Chicago`, `Fluffy`, `Ben four hours` | Lines whose words, place, topic, goal, attribute or value say it |
| `Who has a birthday?` / `When is Ben's birthday?` | The people with a birthday on their record ("Ben's birthday · Oct 12 · From Contacts") |
| `Who do I know in Oakland?` (Susan moved) | Susan's earlier line, marked **Earlier**, only because her page shows it under Before |

Tap the line's words → that line on the person's page. Tap "You told Kinship · Oct 8" → the note (a composed residence line → the notes it comes from, as on the page). VoiceOver reads each line with its words; type follows Dynamic Type like every other line.

## What it declines

- **Nothing invented.** Every row is a stored line (active or resolved; superseded only as Earlier, by the page's own history rule), filed on a person in People. Retracted and deleted lines are never found. A lone word that matches nothing is not a question: People keeps "No one called … yet".
- **"I don't know" is an answer.** A named person with no matching line: "Kinship knows nothing about that for John yet." Nothing named, nothing found: "Nothing about that in your memory yet." No conversation recorded: "No conversation with Sam recorded yet."
- **No synthesis, no suggestion, no chat.** No answer sentence is composed from several lines (CC-25's "then, only if needed"; a founder decision after v1's evidence). No "What would be thoughtful for Susan?" (CC-28: a separate brief). No Ask button, bubble, screen, model, badge or history.
- **No ranking of people.** Groups follow People's own order (alphabetical), remembered and paused people last; nothing is scored, counted, or "days since".
- **No general-world answers.** A question about anything outside the user's own lines gets the quiet line.
- **Empty account:** an account with no one in People never sees the section (contract §8).

## How a question is read (`src/features/ask/retrieve.ts`)

1. **Words.** Folded (accents, case, curly apostrophes), possessives dropped, plurals stemmed the same on both sides ("gifts" = "gift", "likes" = "like"). While typing, the last word may be the start of one ("Alamed").
2. **Question words dropped.** what / did / mention / know / who / do / I / when / last … and the asking verbs.
3. **Names scope.** A word that is one of someone's names (display, full, nicknames) scopes the answer to that person's lines (filed on them or shared with them). Two people with the name: both.
4. **Steers.** "into / likes / enjoys / loves" → interests and tastes; "when … see / saw / met / talk / call / message" → the trail and moments; "lives / where … live / who … in <place>" → residence lines; "birthday" → people with one. A steer narrows; when it would hide every line the other words found, those lines stand.
5. **Match.** Each remaining word must be found in the line's own words, its detail (place, topic, goal, attribute, value, category, event or milestone type, season, hints), the related person it is about, or its residence reading. If no line has every word and there were two or more, lines with any of them, with `why` saying which.
6. **Order.** By person in People's order, quiet people last; within a person current lines newest first, then earlier lines.

## Tests

- `src/features/ask/__tests__/retrieve.test.ts`: 37 cases over a fixture world (the CC-25 examples, a place, a gift, a related person, a detail field, plurals and possessives, prefixes, accents, a superseded residence as Earlier, a plain supersession never, a retracted line never, remembered and paused last, archived and deleted never, no content words → nothing, a name alone → nothing, an unknown name → honest miss, birthdays, no counts in copy).
- `src/features/ask/__tests__/askViews.test.tsx`: the section's rendering and taps, VoiceOver labels, the quiet line, People keeping the named people, "No one called … yet" for a name, an empty account never seeing the section, and the read through a real store (a line remembered through the real write path found with "You told Kinship · Oct 8", its note and its deep link).
- `app/__tests__/firstRun.test.tsx` stays green (untouched).

## Known gaps

- Verbs are not stemmed ("skate" does not find "skating"; the prefix rule helps while typing). Word-based work/school placement without quotes falls back to the line's category.
- A question with no name and a steer only ("what do they like") asks nothing by design.
- The lab states (`#ask`, `#ask-earlier`, `#ask-sam`, `#ask-into`, `#ask-nothing`, `#ask-miss`) use fixtures; the real-account pass through the Tell flow is NATIVE-SIMULATOR work for the integration step.
- Styling is the Quiet Herbarium's rows; WS-2 (Electric Garden) restyles `AskResults` and the PeopleView block.
