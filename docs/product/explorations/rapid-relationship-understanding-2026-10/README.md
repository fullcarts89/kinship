# Rapid relationship understanding, cold-start activation and capture performance

**Status: EXPLORATORY · UNAPPROVED · DOCUMENTATION ONLY.** Written 18 Oct 2026 against `main` `9ad5e6d` in a separate worktree. Nothing here is a canonical decision, a ticket, an epic, a prompt change, a schema change or a build. It stops at founder review.

The question: how can Kinship become meaningfully knowledgeable about the people a user cares about with minimal effort, high accuracy and a fast path to real-world value, without asking anyone to rebuild their social life as a database?

| File | What it holds |
|---|---|
| `00-problem-and-research.md` | The problem; the current state as read from the code and the canon; the latency record; the external evidence (platform, competitors, research); the critical assessment of every proposed idea; the knowledge-for-value framework. **Starts with the executive summary.** |
| `01-activation-concepts.md` | The baseline walked step by step; four materially different activation approaches; text wireframes; the three journeys (Susan, Chris, a user with nothing to say); the first usability experiment |
| `02-capture-and-latency-audit.md` | The capture architecture as it is; the end-to-end waterfall from Keep to Today; what is instrumented and what is not; the native benchmark; the safe optimisations with their dependencies and risks; multi-memory capture failure modes against the pipeline |
| `03-external-context-options.md` | Contacts, speech, share extension, calendar, Journaling Suggestions, photos, social platforms, messages: verified feasibility, consent, provenance, effort, staleness, risk; recommended / deferred / rejected |
| `04-roadmap-and-founder-decisions.md` | Integration with the CC-25 buckets and the Showing-Up Actions interface (reconciled with CC-28 as of 19 Oct; PR #51 still open); conservative and accelerated sequencing; the staged validation plan and its metrics; answers to the brief's fourteen questions; the founder decisions needed |
| `05-long-narrative-extraction.md` | The founder's direction (19 Oct): no arbitrary user-facing cap on memories from one story, and no silent capacity-based loss. The audit of every limit on the extraction path; architecture options for bounded, trustworthy extraction from longer narratives; the four outcome categories; regression scenarios; the acceptance gate before story-first onboarding |

**Reading order for the founder:** `00` executive summary → `04` §8 (the fourteen answers) → `04` §9 (decisions) → the rest as needed.

**Constraints honoured:** no production UI, prompt, model, gateway, schema or native change; no personal data imported; no production account queried; the canonical roadmap (B6 stop → B7 → B8 → B9 → employer evaluation → household dogfood; CC-25's buckets) unchanged; no duplicate epics (voice, Siri, share, calendar and the Listening screen are cited where they already live).
