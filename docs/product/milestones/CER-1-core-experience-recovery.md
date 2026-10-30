# CER-1: Core Experience Recovery

**Founded:** 2026-10-30 · **Milestone tracker:** [#64](https://github.com/fullcarts89/kinship/issues/64) · **Status:** NOT READY · **Decision:** founder authorized milestone setup, not behavior changes, merges, production releases or unbounded token spend.

## Why this exists

We tested eight-item containment with ten robotic, repeated-name sentences and found working capacity signaling. Then a normal short story about one friend, told with pronouns and mentions of family and pets, unnecessarily asked "Who is he?". "Tell the rest" subsequently prefilled a fragment like "plays chess on Tuesdays" that the live understanding flow could not keep. These are first-order usability failures. Passing replay/hand-written simulator outputs does not establish that the live language model understands real people talking about friends.

**One job:** demonstrate the existing loop `Tell → Understand → sourced memory → grounded Moment → voluntary real-world action` works on ordinary language. Do not add new capabilities to make this look better.

**Authorities:** `docs/product/KINSHIP_2_PRODUCT_CONTRACT.md`; `docs/product/approved-design-coverage.md`; `CLAUDE.md`, canonical decisions and the build plan. Existing trust invariants, approved surfaces and readiness gates remain in force. This is a temporary quality gate, not a roadmap rewrite.

## Cost and agent-usage rules (hard stops)

We must manage **two different budgets**: (a) Kinship's actual Anthropic/model API inference calls, and (b) Claude Code's own agent interaction/context/tool usage, especially automated simulator screenshots, UI loops and lengthy traces. A small API bill is *not* evidence of low Claude usage. **Offline tests still consume coding-agent tokens when Claude runs or analyzes them.** “Offline-only” means no *additional live-model API/simulator load*, NOT zero Claude usage. No autonomous Claude Code baseline run is authorized without a separate agent-usage budget and a bounded task.

1. **Setup: no Claude invocation; baseline is offline-only once usage is approved.** Use the existing saved live-model corpus/replays and focused static review, then fixture-driven Deno/Jest/pgTAP. Do **not** call the live model, spawn Claude-controlled iOS simulator sessions, or start long-duration retries during this stage. The founder explicitly reported that simulator runs exhausted their usable tokens. Baseline coding-agent use still requires an explicit bounded session/token envelope.
2. **Propose a usage envelope before approving paid checks.** State estimated agent token/context consumption and API input/output tokens (where observable), estimated USD cost, proposed number of calls/steps, how usage is tracked, and a stop mechanism. When an enforceable agent-level token cap is unavailable, state the limitation and avoid unattended automation.
3. **Later live-model smoke:** one predeclared small batch, no indefinite retry or prompt search. Abort on clear systematic failures. A second batch requires founder approval with actual usage from the first.
4. **Simulator at the end, not in the discovery loop:** only after deterministic + approved live-model checks succeed, **at most one bounded Release simulator acceptance run** that checks the end-to-end experience with the same gateway and environment. No screen-scraping loops, random tapping or repeating large scenarios. No device run where a CLI/unit/integration check can answer the question.
5. The founder is not the test harness. Agents provide a short evidence-backed decision report and a single meaningful acceptance journey. They communicate findings via GitHub PR/issue reviews, not copy-and-paste relays.

## Frozen development corpus (synthetic, ordinary language)

Run **entire narratives**, and annotate atomic facts separately. These are not prose-generating prompts. Use fixed `today=2026-10-30`, `timezone=America/Los_Angeles` for dated tests.

| ID | Full user Tell (fixture) | Critical assertions |
|---|---|---|
| N01 | Leo is really into cooking and electronic music shows. He sees his mom and sister most weekends, and they're close. His dog Rocket gets nervous around unfamiliar dogs but gets along with our dog Bean. Lately he's worried about changes in his industry. | One clearly introduced human subject; relationship, named pet and concerns must not trigger unnecessary "Who is he?" No invented diagnosis or job loss. |
| N02 | Ari has been reading a lot of mysteries on the train. She picked up watercolor painting last month and wants to try a class if work settles down. | Interest versus conditional plan; no fake class registration or calendar date. |
| N03 | Jun uses they/them pronouns. They're learning to bake bread, although their first sourdough didn't turn out. They thought it was funny and want to try again. | One subject with singular they; past attempt and intention distinct. |
| N04 | Marin and Elise went camping last weekend. She misplaced her keys along the trail, but Elise found them back in the car. | Ask specifically who misplaced the keys (genuinely ambiguous); do not ask who Elise is or misassign the keys. |
| N05 | Dani said her sister Lila has surgery next Thursday, November 5. Dani is taking that afternoon off to drive her. | Lila's medical event is Lila's; confirm sensitive content. Dani is the driver. |
| N06 | I met Sora for coffee yesterday. We played tennis together in college and thought it would be fun to do that again sometime. | Shared history and vague intention; no fabricated plan date. |
| N07 | Felix is considering moving to Denver next spring. He's still in Oakland and hasn't decided whether to take the offer. | Planned versus current residence, noncommittal job offer. |
| N08 | Tessa's birthday is November 4. She wants a quiet lunch with a few friends instead of a big party this year. | Real dated event, birthday preference, no pressure to plan a party. |
| N09 | Noah loves hiking, bird photography and Thai food, but he hates olives. He just started pottery and is trying to persuade his roommate to join. | Multiple items in natural compound clauses; roommate is not automatically the subject. |
| N10 | I promised I'd bring Sam soup this Saturday because she's been overwhelmed at work. Sam hasn't decided which kind she wants. | User promise, practical support, don't invent soup preference. |
| N11 | Riley moved from Austin to Portland last summer. This week they're at a conference in Seattle, staying with friends, but Portland is still home. | Distinguish a visit from a residence change; no hallucinated full address. |
| N12 | Mina collects records, loves jazz, is learning Portuguese, keeps succulents on her desk, rides a bike to work, plays badminton, makes ceramics, reads fantasy, grows herbs and plays chess on Thursdays. She is also nervous about a job interview next Wednesday. | High-density normal input: limit accounting honestly reports anything the model proposes but doesn't process; detect *model omission* as a separate failure; "Tell the rest" yields a usable, grounded draft and never false completion. |

Use full-note fixtures, synthetic person roster and accurate evidence spans. A reviewer freezes the reference ledger **before** corrections, with each fact's subject, certainty, source span, sensitivity and whether it is eligible under existing rules. Do not boost the score by silently excluding eligible details or treating a repeated sentence as new memory. Clearly report cases where a model never proposes a fact (which Option A cannot detect).

### Independent challenge corpus

After implementation has frozen, independently author **four new ordinary-language cases** (not shown to the builder before freeze) and score them without tuning. Include a single clear subject with relatives/pets, a genuinely ambiguous reference, a follow-up fragment and an upcoming event. At least one case must be a quiet day.

## Proofs, not activity counts

| Gate | Minimum evidence required |
|---|---|
| **A. Honest understanding** | Across 12 development cases + 4 independent challenge cases, ≥90% of *eligible stated atomic facts* correctly retained or placed into a **justified** confirmation; zero wrong-person durable attributions, fabricated details or unjustified single-person pronoun questions. Per-case table shows kept, held, dropped and model-missed, plus actual costs. Genuine ambiguity remains a question. |
| **B. Recovery that works** | The unchanged "Tell the rest" prefill succeeds for both simple overflow and a missing fact in a compound sentence when a fact is actually identifiable; any remaining uncertainty is stated accurately. No mistaken "fully recovered" assertion, duplicated kept facts or silent failure without a route forward. |
| **C. Trustworthy record** | Every saved detail is visible in What Kinship Knows, source-linked, correctable and undoable. Lately's 3-item cap is explicitly *not* loss. Sensitive and conflicted subjects are never silently auto-saved. |
| **D. Showing up** | Five qualifying scenarios through existing Today/person surfaces, at least four with correct and timely sourced reasons plus an obvious user-controlled next step. Two intentionally quiet situations stay quiet. No invented dates, obligation mechanics, or autonomous messages. |
| **E. App readiness** | Permanent CI and first-run gates pass; one approved, cost-bounded end-to-end Release simulator run only after A–D; final short founder native acceptance pass. Simulator stub outputs **never** count as LIVE-MODEL evidence. |

An average score cannot excuse any hard trust failure. Do not require every preference to generate a Today moment; a quiet result can be right.

## Implementation order (no mixing)

**A — Baseline / measurement (docs + deterministic harness only).** Reproduce #63 as a full natural narrative, isolate model output from deterministic `resolvePerson` and review UI. Reproduce the fragment/Tell-the-rest outcome, compare what was kept versus merely shown. Enumerate existing data and missing proof. Deliver a report with a failure list, fixed baseline and the smallest root-cause plan; do not call the live model or run a simulator yet.

**B — Repair two broken core behaviors.** Fix unjustified subject ambiguity from normal narrative and self-contained/context-preserving Tell-the-rest follow-ups. Preserve user edits, provenance, source and genuinely ambiguous cases. Independent reviewer comments directly on focused PRs. Max 3 review/correction cycles per PR, then escalate rather than keep churning.

**C — Validate memory and showing-up.** Prove the same stated facts are accessible and support actual grounded opportunities. No new feature engines. Run approved short live-model evaluations only with the agreed usage envelope, then one Release simulator pass if A–D hold. Present a readiness report with verifiable evidence and unresolved failures.

**D — Stop/go.** Two focused correction passes maximum after the frozen baseline. If the core gates still fail, STOP and present alternative architecture or human-specialist review rather than expanding the roadmap or billing tokens indefinitely.

## Release and governance

No merge, deployment, migration, account access, user-specific flags, broad product/brand changes or native installation without explicit founder approval. Do not change PR #58's accounting merely to hide the symptom; issue #63 remains the natural-reference bug. `docs/product/KINSHIP_2_PRODUCT_CONTRACT.md` readiness stays **NOT READY** until observed evidence justifies advancing it.

Pause noncritical PR #57/#55 creative resets and research PR #52 during CER-1, without canceling their approved future scope. B9 expansion, employer semantics, Ask Kinship and larger action systems remain governed by their existing decisions.

**Reporting form:** one short table: case ID → expected facts → kept / correctly held / lost → unnecessary questions → grounded Moment/action → provenance/undo result → evidence tier → estimated vs actual tokens/API cost → blocker/decision. A founder should not need to infer success from a green CI badge.
