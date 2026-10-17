# Experience architecture checkpoint: where everything lives

**Status: EXPLORATORY · UNAPPROVED. Corrected after the founder's and the independent reviewer's review of PR #43 (the Search / Ask contract, result types, the private push, Remembered / Paused left open).** Requested by the founder before further visual refinement: map the approved roadmap (CC-25, the operationalisation plan §28, the coverage matrix, the contract's IA in §5) onto one coherent product, and settle a provisional architecture that accommodates Ask. Every capability keeps its roadmap status; this document commits nothing, re-sequences nothing and expands no bucket. Visuals: `architecture.html` (the alternatives, four journeys), captured in `screens/arch-*`.

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
| Where you ask | People's field filters People only; asking is an explicit act: the **Ask row** under the results (S1) or a **People \| Ask mode** (S2); and *Ask about Priya →* on a page | The Ask page's field; also from a page | The Tell dock, with a **Tell / Ask** switch |
| The answer | A sheet for a short cited answer, full height when there are more than three results or long passages; results typed (established · related · memory-only); never a thread | The same answer surface, over the Ask page | The same answer surface, over whatever screen |
| Tell / Ask distinction | By place: ask where you look for people, tell where you capture | By destination | By a switch the user must remember |
| Approved rules touched | None (the field's placeholder and the sheet are new) | The two-item bar (board 1, contract §5); an empty destination before Alpha | The dock's single job (§H; board 1) |
| Discoverability | Medium: the placeholder teaches it; "Ask about Priya" teaches it again | High | High, with risk |
| Chatbot risk | Low: the answer is a sheet, never a thread | Medium: a question box as a destination invites it | Medium |
| Trust risk | Low | Low | High: a forgotten switch writes a question as memory, or answers a memory as a question |
| Scales to Intentions / chapters | Yes: chapter chips filter the same list; an Intention is a Tell | Yes | Yes |
| Reversible | Yes: a third destination can be added later if Ask is heavily used | Costly to remove | Costly to remove |

**Recommendation: alternative 1 with the S1 Ask row** (PROVISIONAL — FINAL FORM SUBJECT TO ASK IMPLEMENTATION EVIDENCE). It needs no new destination, no change to the navigation contract and no empty page before Alpha; it puts Ask beside the thing it searches; it keeps the dock's job pure; and it can grow into alternative 2 later without undoing anything.

### 4a. The Search / Ask contract (the correction the review asked for)

The round-2 placeholder *Search or ask* left it unclear whether typing "Susan", "Alameda", "Susan moved" or "Who do I know in Alameda?" would filter, retrieve or answer. The contract now:

1. **Typing in People's field always and only filters People, immediately.** "Susan" shows Susan; "Alameda" shows no one (and offers Add); "Susan moved" shows no one; a question shows no one. Predictable, fast, hundreds of people.
2. **Asking is an explicit act.** Two compact ways, both drawn in `architecture.html`:
   - **S1 · the Ask row (recommended).** While there is a query, the last row is always *Ask Kinship about "…"* (or *Ask Kinship …* when the text reads as a question). Matches stay above it; a question has no matches, so the row stands alone. One tap, one meaning, nothing to remember, nothing classified for the user.
   - **S2 · a People | Ask mode.** A segmented control under the field; in Ask mode the field reads *Ask Kinship…* and Return asks. Explicit, but a mode to notice and switch, and an empty mode before Alpha.
3. **The user always sees what will be asked** (their own text, in the row) before anything is asked.
4. **The Tell dock never asks**; the bar stays two items; asking never writes a memory.
5. **The answer surface** starts as a sheet for a short cited answer and becomes a full-height sheet for more than three results, long passages or several people. It is a list with sources, grouped by kind, never a thread. Whether every answer stays a sheet, and whether Ask ever needs its own destination, are **not decided** here.

### 4b. What a result can be (grounding)

| Kind | What it is | Where a tap lands | Example |
|---|---|---|---|
| **Established person** | Someone in People with a matching memory | Their page, at the exact line (I1's quiet emphasis); a composed line (B5) opens *both notes*, each with its own source, Edit and Not this | "Susan lives in Alameda, California · From 2 notes · Oct 9 · one edited by you" |
| **Related person** | Someone mentioned inside an established person's memory, with no People identity of their own | The owning memory and its source, never a page that doesn't exist; labelled "Mentioned in a note about Ben · not in People" | "Ben's mom lives in Alameda" |
| **Memory-only match** | A matching statement that cannot support the question's claim (no person relation, or the question asks for more than the note says) | The note; shown under "Also in your notes · doesn't say who", or left out of a stronger claim ("Who do I *know*…") | "The Alameda farmers market is good on Sundays" |
| **Ambiguous person** | A name that fits two people | A clarification ("Which Sam?") with both; never a guess | "What's Sam into?" |
| **Nothing kept** | No supporting memory | "Nothing kept about that", with Tell offered; never an invented answer | "What gift did Priya mention?" |

Evidence is never upgraded silently: a related person is not promoted to a contact; a memory-only note is not presented as knowing someone. This is the UI shape of CC-25's `retrieval_answer` contract; it does not claim that capability exists today.

### 4c. Remembered / Paused and explicit Ask: left open

Three different things: Kinship bringing someone to the user's attention (Today, push: never for Remembered or Paused, D13, as built); the user deliberately opening that person's page (always possible); the user explicitly asking a question about them. The exploration documents the distinction and establishes **no** retrieval policy: Remembered and Paused people are neither excluded from nor included in explicit Ask by this design, neither state is deletion, and their memories never reach proactive Today reasons. **FOUNDER DECISION DEFERRED TO THE REMEMBERED / PAUSED TRUST BRIEF.** The prototype shows only the existing presentation states.

## 5. Four end-to-end journeys (in `architecture.html`)

1. **A private push, a Moment, a return** (Commit next). One notification that says only "Something for today." (no name, no detail, for every kind of Moment) → tap → the app opens, after its own access, on Today at the Moment → one tap more: the detail with its source → hand-off → Messages → back: "Did you ask Ben how it went?" with the one observed fact, "You opened Messages earlier." → Yes → the optional prompt. The push never carries a reason of inactivity; this exploration establishes no richer preview and no new notification preference (a future founder decision).
2. **Search, then Ask** (Alpha). People's field: "Alameda" filters to no one; the Ask row → the answer with three kinds of result (Susan, established and composed; Ben's mom, related; the farmers market, a note that doesn't say who) → "both notes" opens the composed line's members with their sources → from Priya's page, *Ask about Priya* → "Nothing kept about that" when unsupported; "Which Sam?" when ambiguous.
3. **A promise reason** (Commit next, RSN-06). "You said you'd" as the kicker, a bow, your own words behind the provenance → Message David → back: "Did you send David the number?" → Yes: logistics, so no memory prompt (I2) and Today moves on. Once-only surfacing; no "still haven't".
4. **An open thread, and Remembered** (RSN-07; the trust floor). "A while ago · Did Josh decide about the startup?" with no illustration → back → Yes → the prompt. Nana, remembered: kept, drawn in ink-quiet, never on Today; in People one italic word and nothing else differs.

## 6. Founder decisions from this checkpoint

| # | Decision | Recommendation |
|---|---|---|
Categories: **A** directionally approved for future planning · **P** provisional, requires implementation or native evidence · **D** deferred, requires a future founder product decision. A merged exploratory document is not an approved product requirement.

| # | Decision | Category | Recommendation |
|---|---|---|---|
| AR-1 | Ask is discoverable through People and contextually through a person's page; the bar stays two items; the dock never asks | **A** (preferred initial direction) | Record as the preferred initial direction |
| AR-2 | The entry control: S1 the Ask row (recommended) vs S2 a People \| Ask mode; People's field filters only | **P** | Build S1 first when Ask ships; decide on evidence. The placeholder stays *Search your people* |
| AR-3 | Non-negotiables: grounded retrieval; source navigation to the exact line or member; `not_found`; no fabricated identity (established · related · memory-only kept distinct); no memory writes from Ask | **A** | Restates CC-25's Ask shape in UI terms |
| AR-4 | *Ask about Priya →* beside *What Kinship knows about Priya →* on a person's page | **A** | When Ask ships |
| AR-5 | Whether every answer is a sheet, and whether Ask ultimately needs its own destination | **D** | Not decided; the sheet is the starting point; a full-height sheet for more than three results |
| AR-6 | The push says only "Something for today."; tapping opens Today at the Moment; the detail is one tap further; no richer preview, no new preferences | **A** for the private default; any less-private configuration **D** | Preserves CC-25's limits, timing, consent and pause rules |
| AR-7 | Promise, open-thread and hard-time reasons use the letter with kickers ("You said you'd", "A while ago", none) and the illustration rules (bow, none, none); the hard-time channel, tone and privacy come from the RSN-09 brief | **A** for the letter; hard-time specifics **D** | Each reason type still gets its own brief before it is built |
| AR-8 | Remembered / Paused: presentation as drawn (D13); explicit Ask behaviour for them | presentation **A**; retrieval **D** | **FOUNDER DECISION DEFERRED TO THE REMEMBERED / PAUSED TRUST BRIEF** |
| AR-9 | Chapters, Intentions, reflection, calendar, Landscape stay undesigned; reservations only: a filter row on People, a Tell about yourself, a push that opens Today, an evidence line in the Moment detail, one navigation slot | **D** | Record as reservations, not designs |

## 7. What this means for the visual refinement that follows

The provisional architecture changes three things in the round-2 designs, all shown in the prototype: the Ask row under People's results (AR-2; the placeholder is unchanged); *Ask about Priya →* on the portrait (AR-4); the promise and open-thread letters and the private push journey as states. Nothing else in Today, People or the profile depends on Ask, which is the point: the Garden Letter is one product with room for it.
