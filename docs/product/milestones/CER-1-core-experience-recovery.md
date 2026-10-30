# CER-1 — Finish the usable Kinship core experience

**Founder directive, 30 October 2026. Status: EXECUTION REQUIRED / product NOT READY.**

This replaces the prior CER-1 plan's staged research-first workflow, token/usage caps, simulator quotas and arbitrary correction-pass limits. **The deliverable is a working Kinship app, not a baseline report.** Tracking epic: [#64](https://github.com/fullcarts89/kinship/issues/64); observed natural-story failure: [#63](https://github.com/fullcarts89/kinship/issues/63). Existing #65–#67 are parallel engineering workstreams, **not handoff gates or permissions to stop after a stage**.

## Authority and product

Read `CLAUDE.md`, `docs/product/KINSHIP_2_PRODUCT_CONTRACT.md`, `docs/product/approved-design-coverage.md`, canonical decisions, build plan and handoff. Preserve approved surfaces and trust invariants. The core north star is: Kinship remembers what matters and brings it back when it matters so the user can show up. The *whole approved household-dogfood journey* is the job, not just the extractor:

```
first run/sign-in/consent/select people → natural Tell → understand →
trusted, sourced, editable memory → person page / What Kinship Knows →
timely grounded Today reason → user-controlled real-world handoff → return check
```

Do not substitute an artificial activity metric, a green CI badge, hand-authored model fixture, a design mock, or a report for a usable app. No roadmap expansion, redesign, new external integrations, or speculative architecture unless essential to repair the core journey.

## Known founder-device regressions to fix, not merely document

1. Normal conversational paragraph about one named friend, referring later to "he" and mentioning family members and pet dogs, repeatedly prompted **"Who is he?"**. Refer to #63. A real human says a name once and then uses pronouns. Distinguish truly ambiguous referents from a parent/pet mentioned as an object. Maintain genuine ambiguity confirmation.
2. "Tell the rest" of a compound fact generated **"plays chess on Tuesdays"** without self-contained context; submitting unchanged returned **"Nothing to remember"**. Investigate full model → planner → client → saved memory path, including carried person context, duplicate handling, source spans and honest recovery state. Fix the actual end-to-end failure, not just the label or test.
3. Robotically repeated ten-sentence tests exercised an eight-item cap, but did not prove whether ordinary multi-fact prose was correctly extracted. High-density or long prose must not silently pretend it was fully understood. Distinguish capacity overflow, model omissions and intentional exclusions, preserve source and correction.
4. Lately intentionally displays 3 lines; **What Kinship Knows** should contain all retained eligible facts. Test actual retention and discoverability; do not confuse the presentation cap with missing data.
5. Test the real output on Today: timely, grounded, specific, low-pressure reasons to show up, with a user-initiated action and sensible quiet days. The feature is useless if memories never lead to a meaningful real-world opportunity.

## Working approach: build, diagnose, fix and verify CONTINUOUSLY

- **Start implementation now.** Inspect the current main branch, work in a dedicated feature branch, reproduce the known failures, trace root causes, and correct them. Use an initial lightweight baseline only as necessary to identify defects; do **not** stop for approval after a baseline, publish a baseline-only completion PR, or treat a research deliverable as the milestone outcome.
- Maintain executable, full-paragraph, realistic regression scenarios. Use the 12 scenarios below as a starting corpus; expand with independent, unseen natural conversations. Source and expectation ledgers must classify explicitly stated facts, subject, certainty, relevance, and legitimate sensitivity. Avoid repeated `Pablo likes X` test prose.
- Run the actual model as needed. Separately test deterministic parsing/validation, storage, retrieval, UI and release-simulator paths. **Scripted model responses are acceptable only for targeted component regression tests; they do not count as live-model understanding.** Use recorded outputs and automated tests where helpful, but run real-model end-to-end checks and real app flows before claiming success.
- **No arbitrary token budget, agent-usage ceiling, simulator quota, or fixed number of correction cycles.** Do enough work to actually fix the experience. Still practice engineering efficiency: avoid pointless repeated simulator loops, analyze failed outputs, and make each test answer a useful question. Report unexpectedly wasteful activity, but do not stop to seek a usage-envelope approval.
- Claude owns implementation and technical verification. Independent review happens through GitHub PR comments/diffs, with scoped corrections implemented directly. The founder does not carry manual messages, run routine QA scripts or type ten contrived facts.
- Do not arbitrarily stop at #65, #66 or #67. Complete their work together as needed and deliver a coherent, integrated, working core.
- Be candid if an approach is fundamentally deficient: replace brittle logic when evidence justifies it. Do not silently weaken privacy, ambiguous-person, sensitive-memory, provenance, user-edit or Undo safeguards to achieve a pass rate.

## Realistic corpus (synthetic data only)

Use full notes, not one sentence per memory; freeze expected atomic assertions before tuning a scenario. Dates are interpreted with `today = 2026-10-30` and `America/Los_Angeles`.

1. **One person/family/pet:** "Leo is really into cooking and electronic music shows. He sees his mom and sister most weekends, and they're close. His dog Rocket gets nervous around unfamiliar dogs but gets along with our dog Bean. Lately he's worried about changes in his industry."
2. **Interests/conditional plan:** "Ari has been reading a lot of mysteries on the train. She picked up watercolor painting last month and wants to try a class if work settles down."
3. **Singular they:** "Jun uses they/them pronouns. They're learning to bake bread, although their first sourdough didn't turn out. They thought it was funny and want to try again."
4. **Genuine ambiguity:** "Marin and Elise went camping last weekend. She misplaced her keys along the trail, but Elise found them back in the car." Ask who "she" means only for genuinely ambiguous memory.
5. **Related person/sensitivity:** "Dani said her sister Lila has surgery next Thursday, November 5. Dani is taking that afternoon off to drive her." The surgery belongs to Lila; sensitive details require confirmation.
6. **Shared history:** "I met Sora for coffee yesterday. We played tennis together in college and thought it would be fun to do that again sometime."
7. **Current/planned residence:** "Felix is considering moving to Denver next spring. He's still in Oakland and hasn't decided whether to take the offer."
8. **Specific event/preferences:** "Tessa's birthday is November 4. She wants a quiet lunch with a few friends instead of a big party this year."
9. **Compound interests:** "Noah loves hiking, bird photography and Thai food, but he hates olives. He just started pottery and is trying to persuade his roommate to join."
10. **User promise:** "I promised I'd bring Sam soup this Saturday because she's been overwhelmed at work. Sam hasn't decided which kind she wants."
11. **Temporary versus permanent location:** "Riley moved from Austin to Portland last summer. This week they're at a conference in Seattle, staying with friends, but Portland is still home."
12. **Density and recovery:** "Mina collects records, loves jazz, is learning Portuguese, keeps succulents on her desk, rides a bike to work, plays badminton, makes ceramics, reads fantasy, grows herbs and plays chess on Thursdays. She is also nervous about a job interview next Wednesday."

Use only synthetic fixture people in test environments; never insert them into a real account.

## Definition of done — proof of usable product, not intermediate paperwork

1. **Ordinary Tell is robust.** Multi-sentence narratives with pronouns, multiple related people and compounds yield accessible, correctly attributed facts; no unnecessary "Who is he?" for clearly single-subject inputs. Genuine two-person ambiguities still ask. Measure per-fact coverage, omissions, unnecessary clarification and wrong assignment across development + held-out cases; aim for ≥90% eligible fact retention or justified confirmation, with **zero** invented or wrong-person durable memories.
2. **Follow-up works.** The same generated "Tell the rest" text, submitted unchanged, can recover an eligible omitted fact with preserved context; pending/failed/unrelated/undone states never falsely report completion; no duplicates. Confirm by reading actual persisted memories and UI, not only looking at generated drafts.
3. **Memory stays trustworthy.** All retained facts are discoverable in What Kinship Knows and have their original source; correction, Undo, dedupe and privacy work on actual app paths. Lately's three-item curation is not loss.
4. **Showing up is real.** For several genuinely actionable memory scenarios, Today or the person page supplies a timely grounded reason and user-controlled Message/Call/other approved action; quiet cases remain quiet, no guilt or fabricated reasons.
5. **First-use and app quality hold.** Onboarding, People, Tell, review, loading/offline/errors, provenance, privacy, accessibility-critical paths, Today, person page, handoff and return check form a coherent complete iOS journey. Permanent contract tests remain green.
6. **Evidence is credible.** Verify on **live-model**, local or preview database and matching gateway, and **native Release simulator** before declaring ready. Keep deterministic vs live-model vs simulator evidence clearly labeled. Provide short demo/screen recording if feasible and a single concise pass/fail summary with remaining known issues. If any core defect remains, keep fixing it rather than claiming milestone completion.

**Readiness and production safety:** Normal development branches, tests and PRs are authorized. Do not change production, run production migrations, enable flags globally, access real founder data, or deploy/merge release changes without the already-required explicit founder approval. Package merge-ready PR(s) with evidence, resolve independent code review directly, and present one coherent Release-candidate for the founder's final short native acceptance. Do not repeatedly ask the founder to approve individual development steps or test plans. A final release authorization is a legitimate checkpoint; a research/report checkpoint is not.

**Expected update:** working app changes, tests demonstrating actual user behavior, reviewed PR(s), and a clear final readiness recommendation. No more separate milestone to study why the previous milestone failed.
