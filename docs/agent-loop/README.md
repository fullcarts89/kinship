# Kinship Agent Development Loop — pilot

**Status: proposal for founder review. This PR does not activate anything until merged.**
**Scope:** engineering PR corrections. It does not automate product decisions, merges, deployments,
database migrations, native-device installs, private-account testing, or design acceptance.

## Goal

Replace the founder's manual copy/paste between ChatGPT (independent reviewer) and Claude Code
(builder) with GitHub PR comments. Founder remains the **product stage-gate**, production-release and creative-direction authority; ordinary reviewed PR integration should not consume founder attention.

1. Claude works on a pre-approved bounded scope, pushes a PR, and runs tests.
2. ChatGPT independently checks the current SHA, tests, code diff, contracts, and evidence tier.
3. If fixable within scope, the reviewer posts ONE top-level PR comment beginning exactly with:
   `@claude /kinship-fix`
   on a PR explicitly labeled **`agent-loop`**, followed by a short issue statement, reproduction, acceptance criteria, and regression demands.
4. An opt-in GitHub Action processes that trusted comment on the **open PR branch**.
5. Claude writes the smallest code/test correction, pushes, and reports precise evidence.
6. A fresh independent review reads the new SHA (not Claude's prose). Maximum **three** autonomous
   correction rounds per PR before founder escalation. Re-review must not conflate passing CI
   with live-model, simulator, hosted, or founder-device evidence.
7. If green and within approved scope, reviewer reports **READY FOR INTEGRATION**. During the
   pilot, merge remains manual until the branch-protection/deployment audit and separate
   authorization of an auto-merge policy. Once authorized, low-risk PRs may be merged
   automatically after independent review and required checks; founder does not approve
   each PR. Higher-risk changes continue to require explicit gate decisions.
8. At a meaningful **product stage gate** (feature slice, native journey, household
   readiness, creative direction), deliver a concise founder briefing, runnable build,
   coverage changes and remaining risks. Founder evaluates the *experience* rather than
   reviewing each implementation PR.

## Setup prerequisites (not done by this PR)

- Repository admin reviews and merges this **configuration-only** PR after validation; then create the `agent-loop` label and apply it only to one disposable pilot PR.
- Configure `ANTHROPIC_API_KEY` as an Actions repository secret. No credential belongs in a
  PR, comment, issue, Work prompt, or source file. Inspect Anthropic account billing/rate limits.
- Confirm GitHub Actions permission policy and branch protection: CI required, merge/release
  approval reserved to the founder. Test workflow on a disposable **non-production** PR before
  using a high-stakes branch.
- Confirm the GitHub identity used by ChatGPT's comment action. The workflow allows trusted
  OWNER/COLLABORATOR/MEMBER commenters only; **bot triggering is deliberately disabled**.
  If Work comments under a bot identity, do NOT set `allowed_bots: '*'`. Verify the exact
  app identity and design a narrowly scoped allowlist before enabling it.
- In **ChatGPT Work** create an event-triggered task for this repo on **PR commit updates**
  (and optionally PRs opened/ready for review); filter to a pilot PR/label.
  Use the task prompt in `docs/agent-loop/WORK_TASK_PROMPT.md`.
- Verify that Claude's commits surface as new PR updates for Work. GitHub events produced using
  the default `GITHUB_TOKEN` can fail to trigger downstream workflows; if PR updates are not
  observed, diagnose event propagation and use an appropriately scoped GitHub App token
  rather than silently treating the loop as operational.

## Stage gates and integration policy

The founder is NOT the approval gate for every small PR. Three risk tiers:

| Tier | Examples | Merge policy | Founder gate |
|---|---|---|---|
| A — reversible, low-risk | tests, docs, purely internal refactors and scoped app changes with no persistence, eligibility or permission effect | After **separate explicit authorization** of automation: auto-merge once independent review + CI pass; during pilot, recommend merge only | Review at the next coherent product milestone |
| B — consequential or hard to undo | schema/migration, gateway, model/prompt/AI trust, sync, retention/deletion, eligibility/ranking, user privacy, permissions, app release pipeline | Separate rollout/change-control gate, with migration order, rollback/forward-fix plan and compatibility matrix; do not auto-merge under initial pilot | Approve when the change can affect production |
| C — product/creative | new UX direction, roadmap, privacy posture, photos, onboarding promise, user-facing behavior beyond approved scope | Pause for founder product decision | Evaluate visual prototypes, device workflows and user experience |

**Merging is not reliably reversible.** Revert commits can reverse code but do not reverse
data migrations, deleted/processed data, external notifications, or actions taken by deployed
code. A merge may itself trigger production migrations (Kinship's CLAUDE.md explicitly says so).
Before any auto-merge policy, audit all main-branch hooks (Supabase, CI/CD, EAS, GitHub Actions),
branch protections and required checks. Permit auto-merge only for independently verified
low-risk classes that cannot initiate a production side effect.

A stage gate must specify founder-visible scenarios, expected behavior, current evidence tier,
known open bugs, and clear yes/no decisions. The founder should be brought in when choices
affect the actual product, not when a code reviewer needs a small test fix.

## Safeguards

- Read `CLAUDE.md` and the contract before touching product behavior.
- Authorized scope means current PR brief, NOT new feature approval.
- No production secrets or real relationship data in agent prompts, CI logs, or public comments.
- **This pilot** has no automatic merges, migrations, gateway deploys, store submissions or iPhone installs. A future tier-A auto-merge policy needs its own explicit founder go-ahead and deploy-hook verification.
- No broad trigger from arbitrary PRs, comments, or bots. No workflow self-edits.
- One review comment per unique head SHA; repeat only on a changed SHA. Maximum 3 correction loops.
- Escalate: changes to trust/provenance/privacy, schema semantics, AI prompt/model, scope or UX,
  persistent CI ambiguity, uncertain evidence, security issue, or creative judgment.
- `NOT READY`, `READY FOR FOUNDER NATIVE PASS`, `READY FOR WIFE DOGFOOD` remain the
  canonical product readiness labels. `READY FOR FOUNDER DECISION` is merely a PR-review
  disposition and does not change product readiness.
- CI is necessary, not sufficient. Keep proof tiers distinct: UNIT, INTEGRATION, BLACK-BOX,
  LIVE-MODEL, NATIVE-SIMULATOR, FOUNDER-DEVICE, HOSTED/PRODUCTION.
- No background agent work should be claimed until a real Work task and GitHub Action are
  installed, activated and successfully tested.

## Pilot

Use a **disposable test PR** with an intentionally small, reversible defect and no migration
to verify (a) a GitHub comment triggers Claude, (b) Claude only changes the intended PR,
(c) CI passes, (d) ChatGPT Work sees the next SHA and reviews it independently, and
(e) an ineligible comment cannot start Claude.

After a successful dry run, enroll one approved real engineering PR. PR #58 is a candidate
for release-validation review, but its accepted recovery logic should not be modified just
to exercise the automation.

## Operator notes

- The GitHub Action workflow must be merged to the repository default branch to receive
  new `issue_comment` events. Being present on this configuration PR alone does not activate it.
- The action requires BOTH the `agent-loop` label and an explicit `@claude /kinship-fix` command, not every review comment.
- Work event task must be created through ChatGPT **Work**; the repository cannot create it.
- This is an orchestrated sequence of separate agents and webhooks, not a direct synchronous
  API connection between ChatGPT and the user's running local Claude Code session.

## Review of pilot security and ergonomics (30 Oct 2026)

- Claude Code Action v1 runs in **automation mode** when `prompt` is set. `Bash` is disabled by default. The workflow explicitly allows bounded test, package install and read-only git commands; no blanket shell access is granted. GitHub's normal CI remains authoritative.
- The `issue_comment` workflow uses the **default-branch** definition and will not trigger from this draft PR; to enable, merge after review.
- PR must be explicitly labeled `agent-loop`, review comment must begin with `@claude /kinship-fix`, and GitHub commenter must be OWNER/COLLABORATOR/MEMBER. **This trusted commenter gate may exclude ChatGPT's GitHub App identity.** Until its exact identity and permission context are verified, ChatGPT can post reviews but a human authorized commenter may have to repeat the activation command; do not widen the gate to all bots.
- `ANTHROPIC_API_KEY` and a Claude GitHub App installation/authentication path may be needed; follow the official Anthropic installer and verify the identity used to push PR fixes. A Claude subscription in the local CLI does not automatically authenticate a CI GitHub Action.
- Work's GitHub PR-update trigger is a separate user-created task in ChatGPT Work. This PR does not create or activate it. Check it is actually responding to a new SHA before claiming agent-to-agent autonomy.
- No deployment or auto-merge is authorized. After the pilot proves the roundtrip, propose and review a separate tier-A integration policy; the founder should only see meaningful stage gates.
