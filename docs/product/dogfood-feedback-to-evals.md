# Dogfood feedback → regression fixtures (H6, H7)

How real dogfood failures, and hard real-world successes, become permanent regression cases without ever turning someone's private notes into data automatically.

## What the app records

After an ordinary Kept card, the user can tap **Got it right** or **Not quite**. **Not quite** asks *What was off?* with one of five fixed reasons:

- Wrong person
- Missed something
- Wrong relationship
- Wrong wording
- Other

Where it's stored:

- On the note itself, as `captures.feedback`: `{verdict, off?, at}` (migration `20261007090000`).
- As a content-free analytics event, `tell_feedback`, which carries the verdict and reason only.

What it never does:

- It never changes a memory.
- It never holds the note's words.
- It never becomes eval or training data by itself.

## From a "Not quite" to a fixture

Every confirmed real failure is a **candidate** regression fixture. Before anything enters the frozen corpus (`evals/extraction/fixtures`, `MANIFEST.json`), it goes through these steps:

1. **Consent.** Only the note's owner (dogfood: the founder, or a household member who has agreed) may have their note reviewed for this. Ask first, every time, for someone else's account.
2. **Manual review.** A person reads the note, what Kinship understood, and the feedback reason, then decides:
   - is it a real failure;
   - which layer failed (model reading, pipeline rule, display);
   - what Kinship *should* have done.
3. **De-identify / generalise.**
   - Replace names with roster names, and places with neutral ones.
   - Remove anything identifying: employers, schools, health details beyond the category.
   - Keep the **shape** that failed ("X promised to send me Y Friday", "my daughter NAME and I…").
4. **Confirm the expected behaviour** in the fixture's `expect` (person, kind, subject, action, must-not).
5. **Add the sanitized fixture** to the right set and re-freeze the corpus (`manifest.ts --write <version>`), with the reason in the commit.
6. **Pair it with a deterministic regression test** when the fix is in code, as in `stabilization.test.ts` and `trustClosureProofs.test.ts`.

## Keep the successes too

Hard real-world successes become fixtures as well, so fixing one case can't break another. Examples from pass 3:

- **"Sam and Meesh are moving"** worked and must keep working.
- **"Anthony and Natalia are getting married"** failed (H5): two lines.

Both are now regression cases (`trustClosureProofs.test.ts`, "H5"), and sanitized eval fixtures follow the steps above.

## What never happens

- No automatic export of notes, readings or feedback into the corpus.
- No feedback-driven model or prompt change without a labelled eval run (the `run-evals-full` PR label).
- No confidence scores, ratings or AI language shown to the user. "Got it right / Not quite" is the whole interface.
