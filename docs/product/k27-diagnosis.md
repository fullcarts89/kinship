# K27: "Who is Fluffy?" — diagnosis (no fix built)

*17 Oct 2026. Founder's report (bug ledger K27): after the follow-up for Fluffy's vet appointment, the return check's "Fluffy will make a full recovery" asked "Who is Fluffy?" (Chris · Choose from Contacts · Add Fluffy · Someone else), though Kinship already held "Chris has a dog named Fluffy", and there was no way to answer with a note. Diagnosis only, as the K28 + K26 brief asked; the smallest safe fix is proposed at the end and waits for the founder.*

## How it was investigated

Read-only, no production data: the gateway's own pipeline (`planExtraction`) run over the two notes with the founder's People (Anthony, Anthony Lopez, Sam Eden, Sam Doughty, Chris, Ben, John), the dossier Chris had ("Chris has a dog named Fluffy", "Chris' dog Fluffy has a vet appointment"), with and without a `related_people` row for Fluffy, under hand-written proposals in the model's shape (oracle) and under the live model (four calls on test words, 17 Oct). The script is a scratch file, not committed; its runs are summarised here.

## 1. Was a `related_people` row created for Fluffy?

Almost certainly **not**. "Chris has a dog named Fluffy" in its usual shape (a fact about Chris, category `pet`, subject `person`) plans as a plain fact on Chris with `related: null`: no related row. A related row is created only when the model proposes the line as Chris's *related* someone (`subject: related`, relation "dog", name "Fluffy"), which plans as a `confirm`-tier line with the `new_related` flag; nothing in the pipeline derives a related row from the words "a dog named Fluffy". The founder's account would show this with one owner-scoped query (their yes for the account id, as always):

```sql
select relation, name, deleted_at from public.related_people where user_id = '<user id>' and name ilike 'Fluffy';
```

## 2. How was Fluffy stored?

As words inside two of Chris's own lines: the fact "Chris has a dog named Fluffy" (category `pet`) and the event "Chris' dog Fluffy has a vet appointment" (the follow-up Moment the founder tapped). Not as a related someone, not as a person.

## 3. What did the live model propose on the later note?

The note on the phone was most likely told from the follow-up's own "Anything worth remembering from talking with Chris?" (a Tell about Chris), and said only **"Fluffy will make a full recovery"**; the question's quoted line "Chris's dog Fluffy will make a full recovery" is the model's statement, not the note. Live, in that shape (two calls, with and without a related row):

- The model filed the line on **Chris** (`person: p1`), subject `person`, statement "Chris' dog Fluffy will make a full recovery" (it used the dossier to name the dog's owner), evidence "Fluffy will make a full recovery", kind `fact`.
- In one of the two calls it set **`person_mention: "Fluffy"`** (the note's words for who the line is about); in the other, no mention.
- It never proposed Fluffy as a new person, and never as Chris's related someone.

With the fuller note "Chris's dog Fluffy will make a full recovery" (two more calls) the model filed it on Chris with `person_mention: "Chris's"`, and the pipeline kept it as a line about Chris (confirm tier, for the sensitivity below): no question.

## 4. What did the deterministic pipeline change?

The question comes from the pipeline, not the model. When the proposal names **"Fluffy"** as the mention and Fluffy is not in People, the K4 name rule (a capitalised word used as a name, not anyone in People, not a word) overrides the model's `person: Chris` and holds the line as a **new person**, with the clarification "Who is Fluffy?" (the app's K25 shape offers the Tell's context person Chris, Choose from Contacts, Add Fluffy, Someone else). That is exactly the founder's screen. With no mention, the same proposal plans as a line about Chris.

`relatedByName` (a known related someone, by name) is consulted only when the model says `subject: related`; here it said `person`, so a related row for Fluffy, had one existed, **would not have helped** (reproduced: with the row present and the model's `mention: "Fluffy"`, the pipeline still asked).

A second thing the pipeline did: it raised the line's sensitivity to **health** (`sensitivity_raised`): "a full recovery" reads as a person's health, though it is a dog's. The pet rule (founder G43 / J9) covers a vet visit, not a recovery. That is why the answered line would have been held for "Remember" rather than kept outright.

## 5. What context was available?

Chris in People; the two Fluffy lines in Chris's dossier (the model saw them and used them); no related row; the Tell's context person Chris (from the follow-up prompt). Enough for Kinship to know Fluffy is Chris's dog in words; nothing structured that the name rule consults.

## 6. Would the proposed fix contaminate across people or same names?

A blanket rule "a name matching any related row is that related subject" would: two people with a dog named Fluffy, or a related Sam beside a Sam in People, must still ask. The proposal below is scoped to the person the model filed the line on (or the Tell's context person), and asks whenever the name matches more than one thing.

## The smallest safe fix (proposed, not built)

1. **Upstream: keep the pet as a related someone when the words say so.** In the pipeline, a line kept as category `pet` whose own words say "a/the/his/her/their <animal> named <Name>" (a short animal list: dog, cat, puppy, kitten, horse, bird, rabbit…; the name capitalised in the note) gets `related: { relation: <animal word>, name: <Name> }` on the person it is about, so `write_extraction` creates the related row. Deterministic, from the note's words only; the model's shape no longer decides. Negative tests: "a friend named Sam" (not an animal: the People path); "named" absent; a lower-case word; a name already in People (ask, as K4).
2. **A mention that names a known related someone of the line's own person is that related subject, not a new person.** In the new-person path, before holding "Who is X?": if X matches exactly one related row of the person the model filed the line on, or of the Tell's context person, and no one in People (or removed from People) is called X, file the line on that person with that related row (confirm tier, flag `related_matched`); the words stay as written. Negative tests: two related rows named X (ask); a related X of someone the note doesn't name and who isn't the context (ask); X also in People (K4 asks which); X removed from People (I3 offers back); the model's person disagreeing with the row's owner (ask).
3. **The pet rule, widened to a pet's recovery:** a `pet`-category line (or one whose words name a known pet) is never a person's health. Negative tests: a person's recovery stays health; "Chris is recovering" with a pet in the dossier stays health.
4. **Optional, the question's own answer:** when "Who is X?" is still asked and the Tell is about someone, offer "Someone in Chris's life" beside Add X / Someone else, filing the line as Chris's related subject with X's name (a new related row). Copy is a proposal. Not needed if 1 and 2 land.

Each is a gateway change (a deploy) with the app untouched except 4; none is started here. The order that removes the founder's case with the least rule: 2 alone fixes the question when a related row exists; 1 makes the row exist; 3 fixes the held-for-health half.
