# Experience architecture checkpoint: where everything lives

**Status: EXPLORATORY · UNAPPROVED.** Requested by the founder before further visual refinement: map the approved roadmap (CC-25, the operationalisation plan §28, the coverage matrix, the contract's IA in §5) onto one coherent product, and settle a provisional architecture that accommodates Ask. Every capability keeps its roadmap status; this document commits nothing, re-sequences nothing and expands no bucket. Visuals: `architecture.html` (the alternatives, four journeys), captured in `screens/arch-*`.

## 1. Sources and the statuses preserved

| Bucket (CC-25) | Capabilities |
|---|---|
| A · Committed / current | Tell; Understand (review, clarification, sensitive confirm, correction, Undo, sources); Memory (Portrait, What Kinship knows, B6–B9 in flight); Today (one Moment, quiet lines, Moment detail, hand-off, return check); People; Settings / privacy |
| B · Commit next | Showing-up measurement (internal, no UI); promise reasons (RSN-06); open-thread reasons (RSN-07); minimal proactive push; the trust floor: Remembered / Paused (D13), export, delete-account v2, safe duplicate merge |
| C · Alpha direction | Grounded Ask (`retrieval_answer`, one capability); hard-time reasons (RSN-09); I2b surfaced plans; reason feedback ("Not helpful"); Siri / Action Button; Alpha trust and ops |
| D · Explore later | Intentions v0; chapters / life groups; calendar as evidence; reconnect as a Today candidate; About You; year-ago / occasional reflection; dock mic; share extension; Landscape / Garden checkpoint; external events; subscriptions; growth |
| E · Hold / drop | Rhythm and neglect; a separate reconnect engine; a Brief product; monthly reporting by default; the widget; broad semantic expansion; a chatbot; a task manager; scores; timeline CRM; garden vitality |

## 2. The map: four kinds of place

**Distinct destinations** (a slot in navigation): Today and People, as approved. Settings stays behind People's header. **Ask is the only open question** (§4).

**Contextual actions** (reached from a thing): Message / Call / Tell on a person; *Ask about Priya* on a person's page; Remembered / Paused and Merge duplicate in the person's Edit sheet; *Not helpful* on a Moment (in its detail, quiet); Add a conversation; Siri / Action Button straight into Tell.

**Enhancements to existing surfaces** (no new place): on Today, promise, open-thread, hard-time, reconnect and year-ago reasons are *the same letter with new kickers and (sometimes) no illustration*; the push deep-links to the Moment Today already chose; the Moment detail can later cite a calendar as evidence; People's search grows to understand statements (the same retrieval Ask v1 uses) and, later, chapter filters; the Tell dock gains a mic and a share extension; an Intention is a Tell about yourself, kept and shown in Settings › About You, used privately as a relevance signal; the weekly brief is a Sunday push that opens Today.

**Unresolved, by design**: Landscape / Garden (GDN-00), reflection's form, the Listening screen, subscriptions, growth. None needs a navigation slot now; the recommended architecture holds one in reserve.

## 3. Tell and Ask

| | Tell | Ask |
|---|---|---|
| What it does | Writes memory: understanding, a question if needed, items with sources | Reads memory: an answer only from kept items, each line with its source, or "nothing kept about that" |
| Side effects | Memory changes; Undo exists | None. A question never writes |
| Surface | The dock, everywhere; a sheet "About Ben" from a page | A sheet (the answer), reached from where you look for people |
| Failure mode to design against | Keeping a question as a fact | Answering with anything not in memory; a chat |

The contract's two rules decide the shape: never a chat as a primary surface; never guess an ambiguous meaning. A single field that silently classifies "Did Josh decide about the startup?" as a Tell or an Ask would break the second rule on the first day.

## 4. Three alternatives for Ask

| | 1 · Two places and a door (recommended) | 2 · Three destinations | 3 · One field, two verbs |
|---|---|---|---|
| The bar | Today · People (unchanged) | Today · People · **Ask** | Today · People (unchanged) |
| Where you ask | People's field: *Search or ask your people*; and *Ask about Priya →* on a page | The Ask page's field; also from a page | The Tell dock, with a **Tell / Ask** switch |
| The answer | A sheet over the list: lines with sources, each a door to the person | The same sheet, over the Ask page | The same sheet, over whatever screen |
| Tell / Ask distinction | By place: ask where you look for people, tell where you capture | By destination | By a switch the user must remember |
| Approved rules touched | None (the field's placeholder and the sheet are new) | The two-item bar (board 1, contract §5); an empty destination before Alpha | The dock's single job (§H; board 1) |
| Discoverability | Medium: the placeholder teaches it; "Ask about Priya" teaches it again | High | High, with risk |
| Chatbot risk | Low: the answer is a sheet, never a thread | Medium: a question box as a destination invites it | Medium |
| Trust risk | Low | Low | High: a forgotten switch writes a question as memory, or answers a memory as a question |
| Scales to Intentions / chapters | Yes: chapter chips filter the same list; an Intention is a Tell | Yes | Yes |
| Reversible | Yes: a third destination can be added later if Ask is heavily used | Costly to remove | Costly to remove |

**Recommendation: alternative 1.** It needs no new destination, no change to the navigation contract and no empty page before Alpha; it puts Ask beside the thing it searches (People already promises "search that understands statements"); it keeps the dock's job pure; and it is the only one of the three that can grow into alternative 2 later without undoing anything.

## 5. Four end-to-end journeys (in `architecture.html`)

1. **A push, a Moment, a return** (Commit next). One private notification of the Moment Today chose → opens Today at that Moment with its detail → hand-off → Messages → back: the question → Yes → the optional prompt. The push never carries a reason of inactivity; sensitive and hard-time content is private on the lock screen.
2. **Ask across people** (Alpha). People's field: "Who do I know in Alameda?" → the answer sheet, two lines, each with its source (one of them B5's composed residence line, with its mixed provenance) → a line lands on the person's page at that line → *Ask about Priya* from her page → "Nothing kept about that" when unsupported, with Tell offered.
3. **A promise reason** (Commit next, RSN-06). "You said you'd" as the kicker, a bow, your own words behind the provenance → Message David → back: "Did you send David the number?" → Yes: logistics, so no memory prompt (I2) and Today moves on. Once-only surfacing; no "still haven't".
4. **An open thread, and Remembered** (RSN-07; the trust floor). "A while ago · Did Josh decide about the startup?" with no illustration → back → Yes → the prompt. Nana, remembered: kept, drawn in ink-quiet, never on Today; in People one italic word and nothing else differs.

## 6. Founder decisions from this checkpoint

| # | Decision | Recommendation |
|---|---|---|
| AR-1 | Which alternative is the provisional architecture for Ask | **1** (two places and a door). Reversible toward 2 |
| AR-2 | People's field becomes *Search or ask your people* when Ask ships; until then *Search your people* | Yes; the placeholder is the only visible change before Alpha |
| AR-3 | Ask is a sheet, never a page or a thread; it shows sources per line and says "nothing kept" when unsupported; a question never writes | Yes (this restates CC-25's Ask shape in UI terms) |
| AR-4 | *Ask about Priya →* beside *What Kinship knows about Priya →* on a person's page | Yes, when Ask ships |
| AR-5 | The push opens Today at the Moment's detail (not a notification archive, not a separate screen) | Yes |
| AR-6 | Promise, open-thread and hard-time reasons use the letter with kickers ("You said you'd", "A while ago", none) and the illustration rules (bow, none, none) | Yes; each reason type still gets its own brief before it is built (CC-25) |
| AR-7 | Remembered / Paused live in the person's Edit sheet; People shows "Remembered" in italic and nothing for Paused | Yes (D13 as drawn) |
| AR-8 | Chapters, Intentions, reflection, calendar, Landscape stay undesigned; the architecture reserves: a filter row on People, a Tell about yourself, a push that opens Today, an evidence line in the Moment detail, one navigation slot | Record as reservations, not designs |

## 7. What this means for the visual refinement that follows

The provisional architecture changes three things in the round-2 designs, all shown in the prototype: People's field placeholder (AR-2); *Ask about Priya →* on the portrait (AR-4); the promise and open-thread letters and the push journey as states. Nothing else in Today, People or the profile depends on Ask, which is the point: the Garden Letter is one product with room for it.
