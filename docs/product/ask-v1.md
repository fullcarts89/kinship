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
| `When did I last see Sam?` / `When did I last talk to Sam?` / `Has Sam called?` | The conversations the user confirmed with Sam, in the trail's words ("You messaged · Oct 6 · Sam got the Stripe job", "You saw Sam · Sep 20"), newest first, and any moment with Sam, with its day. Two Sams in People: both, each under their own name as the People list tells them apart ("Sam Doughty", "Sam Eden"); the miss copy names them the same way |
| `Where does Chris live?` | Chris's residence line (from its reading, so "Chris moved to Denver" answers) |
| `Michelle` / `What is John's sister up to?` | The line about John's sister Michelle (a related person's name or relation) |
| `Who works at Meta?`, `Chicago`, `Fluffy`, `Ben four hours` | Lines whose words, place, topic, goal, attribute or value say it |
| `Who has a birthday?` / `When is Ben's birthday?` | The people with a birthday on their record ("Ben's birthday · Oct 12 · From Contacts") |
| `Who do I know in Oakland?` (Susan moved) | Susan's earlier line, marked **Earlier**, with its "Moved · Jan 4" when the note gives the day, only because her page shows it under Before; a closed chain reads "Previously lived in Alameda, California" |
| `What does Will like?` | Will's interest lines: a name is recognised before question words are dropped, so Will and May can be asked about |

Tap the line's words → that line on the person's page. Tap "You told Kinship · Oct 8" → the note (a composed residence line → the notes it comes from, as on the page). VoiceOver reads each line with its words; type follows Dynamic Type like every other line.

## What it declines

- **Nothing invented.** Every row is a stored line (active or resolved; superseded only as Earlier, by the page's own history rule), filed on a person in People. Retracted and deleted lines are never found. A lone word that matches nothing is not a question: People keeps "No one called … yet"; a sentence is never offered as someone to add.
- **No partial match read as the answer.** About a named person, every word must be in one line; failing that, any of the words, but only when each word is in some line of theirs ("Ben Chicago Sunday hours" finds the race line; "Ben marathon Chicago" is a miss). With no one named, every word must match. An unknown name with a content word ("Does Zelda like pottery?") is "Nothing about that in your memory yet.", never other people's pottery lines.
- **"I don't know" is an answer.** A named person with no matching line: "Kinship knows nothing about that for John yet." Nothing named, nothing found: "Nothing about that in your memory yet." No conversation recorded: "No conversation with Sam recorded yet."
- **No synthesis, no suggestion, no chat.** No answer sentence is composed from several lines (CC-25's "then, only if needed"; a founder decision after v1's evidence). No "What would be thoughtful for Susan?" (CC-28: a separate brief). No Ask button, bubble, screen, model, badge or history.
- **No ranking of people.** Groups follow People's own order (alphabetical), remembered and paused people last; nothing is scored, counted, or "days since".
- **No general-world answers.** A question about anything outside the user's own lines gets the quiet line.
- **Empty account:** an account with no one in People never sees the section (contract §8).

## How a question is read (`src/features/ask/retrieve.ts`)

1. **Words.** Folded (accents, case, curly apostrophes), possessives dropped, plurals stemmed the same on both sides ("gifts" = "gift", "likes" = "like"). While the last word is still being typed (the query ends in a letter, no space or "?"), it may be the start of one ("Alamed"; "Sam" may be Samantha). Once the sentence is finished, whole words only.
2. **Names first.** A word that is one of someone's names (display, full, nicknames) is checked on every word before question words are dropped, so a person called Will or May can be asked about. It scopes the answer to that person's lines (filed on them or shared with them). Two people with the name: both.
3. **Question words dropped.** what / did / mention / know / who / do / I / when / last … and the asking verbs.
4. **Steers.** "into / likes / enjoys / loves" → interests and tastes; "when … see / saw / met / talk / call / message" → the trail and moments; "lives / where … live / who … in <place>" → residence lines; "birthday" → people with one. A steer narrows; when it would hide every line the other words found, those lines stand.
5. **Match.** Each remaining word must be found in the line's own words, its detail (place, topic, goal, attribute, value, category, event or milestone type, season, hints), the related person it is about, or its residence reading. About a named person, when no line has every word and each word is in some line of theirs, lines with any of them, with `why` saying which; otherwise a miss.
6. **Order.** By person in People's order, quiet people last; within a person current lines newest first, then earlier lines.

## Tests

- `src/features/ask/__tests__/retrieve.test.ts`: 47 cases over a fixture world (the CC-25 examples, a place, a gift, a related person, a detail field, plurals and possessives, the word being typed as a prefix and a finished sentence that is not, accents, a stop-word name, an unknown name with a content word, a word no line of theirs has, "Has Sam called?", a sensitive line found plainly, a superseded residence and a superseded chain as Earlier, a plain supersession never, a retracted line never, remembered and paused last, archived and deleted never, no content words → nothing, a name-only question → the named people and nothing asked, birthdays, the disambiguated miss copy, no counts in copy).
- `src/features/ask/__tests__/askViews.test.tsx`: 15 cases: the section's rendering and taps (words, source, composed sheet, conversation, birthday note), the when of a moment and of a history line, VoiceOver labels, the quiet line, People keeping the named people, "No one called … yet" for a name and never for a sentence, a stale answer never emptying the list, an empty account never seeing the section, and the read through a real store (a line remembered through the real write path with "You told Kinship · Oct 8", its note and its deep link; a composed residence line through the real pipeline with a remembered person last, then the chain closed by a move found only as Earlier).
- `app/__tests__/firstRun.test.tsx` stays green (untouched).

## Known gaps

- Verbs are not stemmed ("skate" does not find "skating"; the prefix rule helps while typing). Word-based work/school placement without quotes falls back to the line's category.
- The read runs after typing settles (150 ms) and reads each matched person's page once; a very large account still re-reads on every settled change.
- A question with no name and a steer only ("what do they like") asks nothing by design.
- The lab states (`#ask`, `#ask-earlier`, `#ask-sam`, `#ask-into`, `#ask-nothing`, `#ask-miss`) use fixtures; the real-account pass through the Tell flow is NATIVE-SIMULATOR work for the integration step.
- Styling is the Quiet Herbarium's rows; WS-2 (Electric Garden) restyles `AskResults` and the PeopleView block.
