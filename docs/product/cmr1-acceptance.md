# CMR-1 founder acceptance: one session, seven scenarios

**Status: DRAFT, for the release candidate.** Run once, on the founder's iPhone, with the build and the
`ai-gateway` version named in the release plan (`cmr1-handoff.md`, "Release and recovery plan"), after the
migration is in production. Nothing here asks the founder to reproduce engineering tests; each scenario is an
ordinary thing a person would tell Kinship about someone they love, and what trusting Kinship with it should
feel like. Names below are placeholders: use real people from the founder's own People.

Judge each scenario as **accepted** or **not yet**, with a sentence. Anything "not yet" goes to the bug ledger
at the stage it failed (`DEVICE VERIFIED` is the stage these scenarios prove).

| # | Tell | What acceptance looks like | Failure classes it covers |
|---|---|---|---|
| 1 | **A story with its subject left out of a clause**, typed, from a child's page: "*Child* has not been sleeping very well and has been very clingy to my wife *Spouse*." | Two lines on the child's page, both naming the child ("*Child* has been very clingy to your wife *Spouse*"). No question. Nobody called "Has". | K36 as a class: grounded identity, subject restored only when grounded |
| 2 | **A tender spoken passage**, by voice, with a pause mid-way and one phrase said twice on purpose: "*Child* is the silliest little girl in the world. [pause] She is so into dressing up like princesses. I love her, I love her so much." | The card shows the words once, with the deliberate repetition kept. Lines on the child's page; nothing doubled. If understanding keeps no line, the card says where the words are kept, never "Nothing to remember". | K34, K35 as classes: voice integrity, every Tell logged |
| 3 | **A story about someone not in People**, typed from Today: "Ran into *Newcomer* from the old team. She is moving to Lisbon in March." | One question: is *Newcomer* someone new, with Add / already here / Choose from Contacts. Add her: the lines are on her new page. Decline to add her: the words are still kept, findable from People under "Your words". | Every retained Tell findable; a new person named once |
| 4 | **Two people who share a first name**, typed: "*Sam* loved the book I lent her." with two Sams in People. | Exactly one question, "Which *Sam*?", both offered. The answer puts the line on that Sam's page only. | Genuine ambiguity asks once; never guesses |
| 5 | **A long spoken story**, two or three minutes, about an evening with a friend and their family: several people, a pet, a date said in words ("december first"), a promise the founder made. | Everything meaningful is on the right pages, the promise under "You said you'd" with its day, the pet under its owner. If Kinship could not get to a part, the card says so and "Tell the rest" works without re-asking what it already has. Nothing from the end of the story is missing silently. | Long Tells, completeness, honest partial coverage, ordinal dates |
| 6 | **Correcting and declining**: open one line from scenario 5, change a word; open another and choose "Don't keep this". Then Undo a whole Tell. | The edited line keeps the edit (a later Tell about the same thing never overwrites it). The declined line is gone, but the Tell's words remain on the page. The undone Tell and its lines are gone everywhere, and stay gone. | User's edit wins; declining a reading is not discarding the Tell; Undo semantics |
| 7 | **Showing up**: on the day of a date kept above, open Today; take the Moment, Message the person, come back. | The Moment rests on a line the founder can tap to see its source. The hand-off opens Messages and sends nothing. On return: "Did you reach *Name*?" → Yes → "Anything worth remembering?" → a sentence → kept on their page. | Grounded Showing Up, return loop, the full core loop |

**Also, once, on the second registered iPhone:** open the same account after scenarios 1–6. Every Tell and line is
there, including the "Your words" note and the declined-but-kept words; nothing is waiting that was answered
on the first phone.

**Not in this session** (proved elsewhere, at their own tiers): offline and intermittent connectivity, gateway
errors and retries, concurrent submissions, idempotency, account isolation, export and deletion, small screens
and accessibility. Their evidence is in the release plan's readiness matrix.
