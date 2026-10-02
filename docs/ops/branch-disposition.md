# Branch disposition (F0-D10)

Reviewed 2 Oct 2026 against the Phase 0 branch `claude/gifted-pasteur-e2q0qu`, which becomes `main`. Unique commits were counted with `git rev-list HEAD..<branch>` and patch-equivalence with `git cherry`.

**How a branch is closed:**

1. Every branch with unique commits first gets an `archive/<branch>` tag at its tip, so nothing is lost.
2. Then the branch is deleted.

Deletion happens only after Phase 0 is merged and CI is green on `main`.

| Branch | Unique commits | Still relevant to the 2.0 plan? | Preserved elsewhere? | Disposition |
|---|---|---|---|---|
| `claude/wonderful-planck-inpeu9` | 0 | Its AI hardening is the base of P0-01 | Fully contained in Phase 0 history (merged in `26fb121`) | **Close** after the Phase 0 merge lands on `main` |
| `claude/brave-cori-514h7d` | 0 | No | Fully contained | **Close** |
| `claude/inspiring-ritchie-6gjn74` | 0 (tip = current `main`, `5687ed7`) | No | Fully contained | **Close** |
| `claude/fervent-lovelace-szugz6` | 1: "Log a gift / Remember a detail" Tend actions (Jun 2026) | No. 2.0 replaces the Tend sheet with Tell. | Only on this branch | **Close**, with an `archive/` tag first |
| `claude/hormozi-value-research-s592G` | 1: Hormozi value principles (onboarding, sharing, digest; Mar 2026) | No. The 2.0 onboarding (D1) and sharing decisions supersede it. | Only on this branch | **Close**, with an `archive/` tag first |
| `claude/review-kinship-history-P53d6` | 6 (incl. the Hormozi commit): push wiring, data export, memory `occurred_at`, `STATE.md` notes (Mar 2026) | No. These are 1.0 features that later work re-implemented differently (`occurred_at` and export exist on `main`). | Only on this branch | **Close**, with an `archive/` tag first |
| `claude/tender-mendel-j53wd7` | 2: an earlier, parallel attempt at P0-02/03/05 (demo-data removal, account-scoped local data, real deletion; 30 Sep 2026) | Superseded. Phase 0 implements the same design (wipe only on a definite SIGNED_OUT, persistent device owner, real server deletion) with tests and production proof. Nothing to port. | Only on this branch | **Founder decision:** recommend close with an `archive/` tag. Not deleted until confirmed (per F0-D10). |
| `claude/gifted-pasteur-e2q0qu` | Phase 0 | Yes | Becomes `main` | Delete after the merge (standard branch cleanup) |
