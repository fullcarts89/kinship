# K28 + K26: the founder's device checklist

*17 Oct 2026. For a build from the K28 + K26 PR, on Thor iPhone, with the gateway as deployed (v14; these fixes need no gateway change). About five minutes. Readiness labels stay as they are; this pass verifies K28 and K26 only.*

Before: Susan has "Susan is getting married to Pedro in the fall" (or a similar line with no day) and nothing you said you'd do for her today. Ben has an open "You said you'd" or a Today line.

| # | Do | Pass when |
|---|---|---|
| 1 | Open Susan's page, tap **Message** | The sheet says **You could mention** with the wedding line in your own words (no date added), and under it "You could ask how the wedding plans are going." The sheet says "When you come back: “Did you reach Susan?”" |
| 2 | Tap **Open Messages**, then come back to Kinship | **Did you reach Susan?** on her page, and the same on Today. Nothing new under Between you yet |
| 3 | Tap **Not yet** | The question goes. Nothing under Between you. Today unchanged (no Moment about Susan) |
| 4 | Message again, come back, tap **Yes** | **You messaged · <today>** under Between you, with no line under it. Then **Anything worth remembering from talking with Susan?** with **Tell Kinship** · **Nothing today** |
| 5 | Tap **Nothing today** | The prompt goes; nothing else changes. Kill and reopen the app: still one "You messaged" |
| 6 | What Kinship knows about Susan → **Not this** on the conversation | It leaves the trail (asked first) |
| 7 | Ben's page → **Message** → come back → **Yes** | As before (K23): the question says what it was about, Yes records the conversation about it and settles Today's line. Not a generic hand-off |
| 8 | A person with nothing told (a sparse page) → **Message** → come back | No "You could mention" on the sheet; **Did you reach <name>?** still asked; Not yet records nothing |
| 9 | Today: a follow-up Moment for Chris about Fluffy's appointment → **Ask how it went** | **You could mention** leads with Fluffy's own line, not "Anthony and Sam love ice skating with Chris" |
| 10 | Airplane mode on, then Message from a page, then come back | "That didn't open" (or Messages opens offline, which counts); with no open, no question is asked and nothing is recorded |

## K27, once ai-gateway is deployed from the K27 PR (no app change)

| # | Do | Pass when |
|---|---|---|
| 11 | On Chris's page (or any person's), Tell: **"<Name> has a dog named <Pet>"** with a new pet name | Kept outright (no question). What Kinship knows shows the line |
| 12 | Tell, about the same person: **"<Pet> will make a full recovery"** (from Tell on their page, or from "Anything worth remembering?" after a Moment about them) | Kept for that person, no "Who is <Pet>?", no "Remember this" hold. The line reads on their page |
| 13 | Your real case: Fluffy, with "Chris has a dog named Fluffy" told before this fix (no row) → Tell about Chris: **"Fluffy will make a full recovery"** | The same: kept for Chris, no question, not held (the words alone connect them) |
| 14 | Tell with a name that is also someone in People (e.g. "<Person's name> will make a full recovery") | Asked or filed as before: the People path decides, never the pet |

The clarification question is unchanged for anyone Kinship does not know.
