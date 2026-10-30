# Kinship Agent Development Loop — pilot

**Status: proposal for founder review. This PR does not activate anything until merged.**
**Scope:** engineering PR corrections. It does not automate product decisions, merges, deployments,
database migrations, native-device installs, private-account testing, or design acceptance.

## Goal

Replace the founder's manual copy/paste between ChatGPT (independent reviewer) and Claude Code
(builder) with GitHub PR comments. Founder remains the release authority and creative director.

1. Claude works on a pre-approved bounded scope, pushes a PR, and runs tests.
2. ChatGPT independently checks the current SHA, tests, code diff, contracts, and evidence tier.
3. If fixable within scope, the reviewer posts ONE top-level PR comment beginning exactly with:
   `@claude /kinship-fix`
   followed by a short issue statement, reproduction, acceptance criteria, and regression demands.
4. An opt-in GitHub Action processes that trusted comment on the **open PR branch**.
5. Claude writes the smallest code/test correction, pushes, and reports precise evidence.
6. A fresh independent review reads the new SHA (not Claude's prose). Maximum **three** autonomous
   correction rounds per PR before founder escalation. Re-review must not conflate passing CI
   with live-model, simulator, hosted, or founder-device evidence.
7. If green and within approved scope, reviewer reports **READY FOR FOUNDER DECISION**. Do **not**
   merge automatically. For a PR containing a migration or gateway change, require a separate
   rollout plan and explicit founder approval.

## Setup prerequisites (not done by this PR)

- Repository admin reviews and merges this **configuration-only** PR.
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

## Safeguards

- Read `CLAUDE.md` and the contract before touching product behavior.
- Authorized scope means current PR brief, NOT new feature approval.
- No production secrets or real relationship data in agent prompts, CI logs, or public comments.
- No automatic approvals, merges, migrations, gateway deploys, store submissions or iPhone installs.
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
- The action uses explicit `@claude /kinship-fix` commands, not every review comment.
- Work event task must be created through ChatGPT **Work**; the repository cannot create it.
- This is an orchestrated sequence of separate agents and webhooks, not a direct synchronous
  API connection between ChatGPT and the user's running local Claude Code session.
