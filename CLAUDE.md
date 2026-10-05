# Kinship — instructions for coding agents

## Before changing product behaviour or UI (mandatory)

1. Read `docs/product/KINSHIP_2_PRODUCT_CONTRACT.md` in full. It ranks the sources: later founder decisions → the Kinship 2.0 Design Direction and the approved "Recommended" canvas boards (the product design) → `KINSHIP_2_COMPLETE_PLAN.md` (the build plan) → phase docs (history only).
2. Read `docs/product/approved-design-coverage.md`. No approved surface may disappear silently: removing or deferring one needs a reason **and** founder approval recorded there.
3. Judge every change as a first-time user on an empty account. A new account must never land on an empty Today and People; `app/__tests__/firstRun.test.tsx` and `.maestro/fresh-install.yaml` are permanent gates. Do not loosen them.

## Never

- Redesign Kinship, or treat the build plan or a phase boundary as more authoritative than the approved experience.
- Show AI: no sparkle icons, AI badges, model names, confidence scores, tier labels or chat as a primary surface.
- Quantify a relationship (sizes, sorts, counts, scores, "health"). Sprigs are identity-only; `sprig_marks` stays off.
- Seed fake people, memories or reasons into a real account. Fixtures live in `src/dev/` and tests only.
- Weaken trust to save taps: sensitive or ambiguous readings need the user's yes.
- Enable flags globally, or for any user id without the founder's explicit yes for that id. Never look accounts up by email.
- Put model identifiers in commits, PRs or code. Migrations are forward-only and reach production only by merging to `main`. Merge with a merge commit.
- Call anything ready from browser screenshots. Readiness labels are only: NOT READY · READY FOR FOUNDER NATIVE PASS · READY FOR WIFE DOGFOOD.

## Checks

`npx jest`, `npx tsc --noEmit`, `npx eslint app src`. For a release build, export with the EAS profile's env and check the `.hbc` with `strings` (see `docs/product/wife-dogfood-final-review.md`).
