# Activation clarity and core-loop demonstration pass

**Readiness: READY FOR FOUNDER NATIVE PASS.** Unchanged, and not wife-dogfood ready. Nothing has run on an iPhone yet; all screenshots are web renders of the real components.

## 1. What changed and why

| Change | Why | Where |
|---|---|---|
| **"See how it works"**, a quiet link on the welcome. One continuous example in 4 steps: *you tell* "Ben runs Chicago Sunday and hopes to break four hours." → *Kinship keeps it* (understood words, the goal, "You told Kinship · Thursday") → *it brings it back* (Monday: "How did it go for Ben?" · Ask how it went) → *you reach out; afterwards one question* ("Did you reach Ben?" → "Anything worth remembering about Ben?") | A new user can see the whole loop before setup without being told about technology. Optional, about 15–20 s and 4 taps. Every step is labelled "An example"; nothing is saved; no AI words | `src/features/welcome/HowItWorks.tsx` |
| The example's Today step says exactly what Today says the day after a race | Showing "Ben runs Chicago today." would show a moment the product doesn't make (a race's policy is follow-up only). A test pins the example to the real Today model | `howItWorks.test.tsx` |
| **First-Tell examples** under the input: "Ben is running Chicago Sunday and wants to break four hours." · "Maya starts her new job next month." · "I told Chris I'd send him that restaurant." | Shows the range (what's happening, what's coming and hoped for, what you said you'd do) by example, not category. The medical example the board used is gone from first use | `SetupViews.tsx` |
| **Telling from a person's page** now asks "What's going on with Sarah?" | Guides without putting an invented fact on a real person's page (an example line like "Sarah starts a new job" could be read as a memory) | `TellSheet.tsx` |
| **Relationship-page rules** made explicit and testable | Proves the portrait stays a portrait at 25+ memories; everything else stays in What Kinship knows | `portraitModel.ts`, `relationship-page-rules.md` |
| **Proofs through the real path** | Dense Tell, resolving and superseding information, and density, each run through the gateway's input builder and `planExtraction`, its write rules, sync, review, portrait, What Kinship knows and Source. The model's reply is written by hand (there is no model in tests), in the model's exact output shape | `memoryProofs.test.ts`, `src/dev/fixtures/denseTell.ts` |
| Lab shows no relationship labels | A real account can't have one (§5) | `src/dev/v2Lab.tsx` |

Mandatory setup is unchanged. The example adds nothing to it, and the examples are three quiet lines on an existing screen.

**Screenshots:**
- the example: [1](screens/how-1.png) · [2](screens/how-2.png) · [3](screens/how-3.png) · [4](screens/how-4.png) · [night 3](screens/night-how-3.png);
- the welcome with the link: [light](screens/welcome.png) · [SE](screens/welcome-se.png);
- the first Tell: [with birthdays](screens/setup-worth.png) · [typed](screens/setup-worth-typed.png) · [no birthdays](screens/setup-tell.png) · [SE](screens/setup-worth-se.png).

## 2. Dense Tell: Matt

> "Matt just got promoted. He's excited but nervous about managing people. He and Jess are thinking about moving to Marin next summer, and I told him I'd introduce him to Alex."

| Step | What the real code did | Screenshot |
|---|---|---|
| Tell | Typed into the Tell field on Today | [tell](screens/matt-tell.png) |
| Understanding | 4 items, nothing dropped, **no question**. The note's tier is *look over*: "Matt was promoted" saves automatically; the other three are saved and shown for a look because they refer to Matt as "He/him". The promise was lowered to *tentative* ("I told him I'd…" reads as reported speech). "next summer" was kept as a season, not a date. **Jess and Alex were not made into people** | [review](screens/matt-review.png) |
| Memories | fact *Matt was promoted*; fact *Matt is excited but nervous about managing people*; plan *Matt and Jess are thinking about moving to Marin next summer* (tentative, summer); promise *Introduce Matt to Alex* | — |
| Matt's page | **Lately:** Matt was promoted · Matt is excited but nervous about managing people. **Coming up:** Matt and Jess are thinking about moving to Marin next summer. **You said you'd:** Introduce Matt to Alex. Each line: "You told Kinship · Oct 5" | [page](screens/matt-person.png) · [night](screens/night-matt-person.png) |
| What Kinship knows | The same four, each with its source | [knows](screens/matt-knows.png) |
| Source | The note, with the four understood passages marked | [source](screens/matt-source.png) |

The lines are the kept statements, one per memory, not a written summary. That's the grounding rule in V1: no generated prose on the page.

## 3. Information that changes, and density

See `relationship-page-rules.md` for the full tables: the Anna and knee progressions, what stays, what leaves Lately, what stays in What Kinship knows, what becomes history, and how provenance is kept. It also covers the new, light and rich (24 memories) pages.

**Screenshots:**
- density: [new](screens/person-new.png) · [light](screens/person-light.png) · [rich](screens/person-rich.png) · [rich: What Kinship knows](screens/person-rich-knows.png);
- Anna: [before](screens/anna-before.png) · [after](screens/anna-after.png) · [What Kinship knows](screens/anna-knows.png);
- Ben's knee: [before](screens/knee-before.png) · [after](screens/knee-after.png) · [What Kinship knows](screens/knee-knows.png).

## 4. Where "running buddy" came from

- **Only the dev lab's fixture.** `src/dev/v2Lab.tsx` hard-coded `relationship_label: "running buddy"` for Ben (and "neighbor" and "climbing" for two Sams).
- **In a real account it can never appear today.**
  - `people.relationship_label` is written only by `PeopleRepo.add` and `update`, and no 2.0 screen passes a label.
  - Extraction never writes it. The gateway only *reads* it as roster context, to tell people apart (`ai-gateway/index.ts`, `_shared/extraction/context.ts`).
  - Contacts import doesn't set it.
- **Kinship does not infer durable characterizations of relationships.** Nothing turns "we run together" into a label: such a sentence becomes a sourced *Between you* line, never a subtitle.
- Two people with the same name are told apart by their full contact names ("Sam Lee", "Sam Diaz").
- The lab now shows no labels.
- The relationship page and What Kinship knows display the label without a provenance line. Harmless while nothing can set it, but if a label is ever added (question 6) it should say "You added this".

## 5. Today eligibility

Documented in `today-eligibility.md`: primary moment, quiet lines, return check and page-only context, covering birthdays, dated events, promises, plans and return checks. Nothing changed.

## 6. Tests added this pass

| Test | Proves |
|---|---|
| `src/features/person/__tests__/memoryProofs.test.ts` (4) | Dense Tell end to end; resolve (Anna); supersede with history and sources kept (knee); new, light and rich pages within the rules. It also writes and checks `src/dev/fixtures/generated/proofs.json` so the lab can't drift from the code |
| `src/features/welcome/__tests__/howItWorks.test.tsx` (4) | Every step labelled as an example; one continuous example; it never reads the store; its Today step equals the real Today model's output; no AI words; first-Tell examples aren't health events and use no category words |
| Test gateway (`src/test-utils/fakeGateway.ts`) | Can now run the gateway's real input builder and pipeline on a supplied model reply, and applies the gateway SQL's merge, supersede and resolves rules |

Totals: Jest 314 / 314 · `tsc` clean · ESLint 0 errors, 130 warnings (unchanged).

## 7. Questions for you (I haven't chosen these)

1. **A day-of moment for events.** Today, a race only gets the day-after follow-up ("How did it go for Ben?"); there is no "Ben runs Chicago today." Should events with an exact day also get a day-of moment (e.g. "Ben runs Chicago today." · Message Ben)? It's a reasons-engine rule change, not a UI change.
2. **Relationship-page density numbers.** Lately covers 120 days; Coming up covers 120 days; birthdays 30 days; at most 3 lines a section. Right defaults, or different?
3. **Where superseded history lives.** Ben's old knee note is kept but shown nowhere. Should "Your story together" (coverage #13) be its home, and before alpha?
4. **Kind words in the review.** The look-over sheet's tokens say "Something true · A plan · Your promise" (tap to change). It's correctable and in plain words, but it is a visible classification. Keep, or hide unless tapped?
5. **"I told him I'd…" is treated as tentative** and asks for a look. Should the user's own reported promise count as stated? This is an extraction rule (evals first), not a UI change.
6. **Relationship labels.** Nothing can set one, so the subtitle under a name is always empty. Do you want a way for her to add one ("college roommate"), shown as "You added this"? Or none at all in V1?
7. **Dense notes usually get a look-over sheet** because pronouns ("he") lower the tier. That matches the current policy (don't relax confirmation in early dogfood). Keep it for her first weeks?

## 8. For the founder native pass (add to the script in `wife-dogfood-final-review.md` §13)

Check on the phone, not from screenshots. Don't change typography from browser renders.

- The smallest provenance labels ("You told Kinship · Oct 5", "From Contacts"): readable at default and larger text?
- The Contacts screen's helper copy and lock line: clear, not alarming?
- Settings/privacy copy (understanding, Contacts lines).
- Today's quiet lines (labels like "TOMORROW" over "Maya's birthday").
- The keyboard on the first Tell and the Tell field: never covers the field or "Keep it"?
- Bottom-sheet heights (review, follow-up, add someone): never under the home indicator, never taller than needed?
- Small screen (SE / mini): the example, the picker footer, the first Tell with its examples.
- Dynamic Type and VoiceOver: the example's steps read in order; the examples read as one group.
- **"See how it works":** opens from the welcome, 4 taps, closes back to the welcome, never appears again unless tapped.
