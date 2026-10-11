# PR #78 follow-up review — 2026-10-11

Reviewed exact head 7630e4e0b5d3bdd8636845b2c334f0985bafee4a. #81 merged into this branch, not main. Main remains 99fd2520 (#76 merge). #82 is a separate draft on main.

## Confirmed defects repaired in this follow-up

- A 1,000 → 1,017 mm cut edit with the same design fingerprint returned clearOptimization=false. Cut profile, length, angle and multiplicity changes now invalidate optimization even when the geometric fingerprint matches. Equivalent reordered cuts remain reusable.
- Cell rowSpan/colSpan were absent from the fingerprint. Merged-cell geometry now invalidates the fingerprint and empty incoming ledger preservation. Existing fingerprints will conservatively invalidate once after this fingerprint format change.
- Complete BOM cache keys used component counts. Same-count changed cuts could return old profiles and costs. Both generator entry points now key by exact profile/length/angle cut multiset; a real generator regression checks recalculation and equivalent reorder reuse.
- Full Pipeline run 38132906608 failed because ledgerContracts.node.test.ts imported node:test and because the project reload test had no expected-ledger mock. Contract tests now run with Vitest; the independent SHA-256 payload includes current semantic fields and spans. The standalone 9-check ledger harness remains verified. Project tests use the real multiset materialization predicate and reset mocks before each case rather than replacing it with count-only parity.

## Remaining blockers — not fixed by this slice

1. Aggregate BOM prices the original saved components before reconciling/materializing the expected ledger. A corrected persisted ledger can therefore differ from the pricing input. Price canonical inputs and test same-count drift across save, read-back and reload.
2. Aggregate awaits generation/materialization without a freshness check at each await; its generation guard runs only before final publication. Guard writes as well as publication and prove stale-project/quantity edits cannot write old poses.
3. Project estimate sourceReceipt is built from pre-materialization positions, while saving components advances saved pose identity. Add a real authoritative save/read-back receipt test; the remount mock alone does not prove this path.
4. savePose reads no existing quantity when deciding whether to retain optimization; quantity changes need plan invalidation while keeping valid per-unit cuts. Legacy fingerprint fallback also omits saved glazing, hardware and role/profile selections. Review legacy rows conservatively.
5. EngineeringInspector selectedOccurrence has no production caller; helper tests do not demonstrate actual canvas-to-inspector selection. Primitive indices are not stable occurrence identity across reorder.
6. DoWin golden-source parity is not Fabricator generator parity. Casement aliases, per-leaf dimensions, material-specific hardware/SKUs and Gold mixed/asymmetric layouts still need engine evidence. The complete generator does bind catalogue/rule versions in its semantic digest; the gap is not a blanket omission of those versions.

## Release posture

Focused tests and validation totals are recorded in the PR body. No browser E2E, production SQL, manufacturing seeds, review bypass, or Cursor checkout changes. #78 and #82 need integration review against main before release; this follow-up is stacked on #78, not a claim that #78 can merge immediately. Composite stays 88 provisional. FP-027 DoWin ORTA machine-export blocker stays open.
