# Handoff: round 4 build pass (start of a new thread)

*7 Oct 2026. Everything a new session needs to pick up round 4.*

## Where things are

- **`main`:** PR #19 (Core Trust Closure + Return Loop, and dogfood telemetry) is merged.
  - Database migration `20261007090000` is applied in production.
  - ai-gateway v5 is deployed.
  - The `dogfood-v2` build with performance telemetry was built and installed by the founder.
- **Branch `claude/awesome-edison-3cuf6z`:** restarted from `main`. It carries only the round-4 feedback docs, with no code changes.

## Read first

1. `CLAUDE.md`, and the documents it points to: the product contract and approved design coverage.
2. `docs/product/founder-feedback-summary-4.md`: **the round-4 bug list, recommended fixes, priorities and suggested order.**
3. `docs/product/founder-feedback-4.md`: the founder's full notes for I1–I13; screenshots are in `docs/product/screens/feedback4/`.
4. `docs/product/bug-ledger.md`: the canonical ledger. Add I1–I13 and reopen H13 (see I10).
5. `KINSHIP_2_DECISIONS.md` CC-16 and CC-17: the approved H15/H2, H16 and H4 designs, Ask Kinship as an Alpha candidate, and the telemetry scope.

## Waiting on the founder

- **"Go" to start the build pass.** The founder said not to build until they say so.
- **I12 rename:** option (a), display-time name (recommended), or (b), rewrite lines with lineage.
- **Which of last round's fixes count as VERIFIED.** Seen working in round 4: H21, H25, H29, H10, H20, H1 (apart from I12).
- **Data cleanup** (`data-cleanup-plan.md`), and which Anthony is real (N3). Not authorized yet.

## Standing rules (unchanged)

- **Merging:** only when the founder asks, with a merge commit. Don't open a PR unless asked.
- **Production:** no flag or data changes without an explicit yes for a specific account id.
- **Migrations:** forward-only. Production gets them when the founder runs `npx supabase db push` (they don't apply automatically on merge). The ai-gateway is redeployed by hand.
- **Founder environment:** on the founder's Mac, `supabase` and `eas` run via `npx` (`npx eas-cli`). The Supabase command-line tool needs `export SUPABASE_ACCESS_TOKEN=sbp_…`, because the macOS Keychain prompt loops.
- **Checks:** `npx jest`, `npx tsc --noEmit`, `npx eslint app src`, Deno tests and pgTAP.
- **Readiness labels:** NOT READY · READY FOR FOUNDER NATIVE PASS · READY FOR WIFE DOGFOOD.
- **The founder prefers** explicit step-by-step instructions, concise answers, and no unnecessary questions.
