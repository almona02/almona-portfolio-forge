# Cursor BOM repair - 11 October 2026

## Scope

Isolated branch codex/bom-save-qualification-repair, starting from Cursor #80 b98b222f and integrating current main 99fd2520 locally. Cursor checkout and its untracked .tmp-pr-assess/ remain untouched. No production changes, migration writes, approval exceptions or browser E2E.

## Repairs

- Removed qualification restamping across revisions. Forward revisions clear downstream artifacts and require fresh authority. Late backwards-revision hydration is ignored.
- Added guarded acknowledged generation: prepare -> save -> authoritative read -> fresh authority -> generate -> publish. Every awaited stage checks active pose/draft/request. Failed persistence cannot publish. Returned server components are not overwritten by local cuts.
- Route changes/unmount cancel obsolete generation; automatic retries cannot loop on a failure. Save acknowledgement must match owner/project/pose/source and advance revision when a write occurs. Unchanged acknowledged ledgers do not write or bump revision, preserving hardener approval applicability.
- Saved sliding ledgers compare exact profile/physical length/angle multisets with generated design. Partial-with-sash and same-count substituted cuts reject. Conflicting authored choices are retained for explicit Design correction, never silently replaced.
- Corrected the fixture that stored allowance-inclusive BOM cuts as nominal design inputs. Required count remains 23. Corrected obsolete navigation expectation: unqualified estimates stay blocked.
- Fixed the new workflow identity fixture TS2352 occurrence without refreshing compiler baselines.

## Verification and limits

Final integrated suite: **72/72 checks across 10 files**, covering panel publication/save failure, authority reads, stale acknowledgements, every awaited cancellation boundary, revision/quantity/glazing invalidation, exact sliding ledger parity and main ledger/fingerprint contracts. The unchanged Windows compiler baseline gate passes: 1774 app diagnostics vs baseline 1791, zero new signatures and zero occurrence increases; node clean. This is not type-clean. Production build passed; final exact-head repeat is required before branch publication. No browser acceptance claimed. Non-sliding saved-ledger and Gold custom-profile expansion remain separate phase-one/design work; this narrow gate does not claim universal DoWin generator parity.

Next: #78 ledger contracts/conflicts, #81 phase-one production wiring and DoWin parity, staging schema/security parity, then owner-resumed disposable FINAL GOAL. FP-027 exports remain blocked and composite held at 88 provisional. Production #76 SQL promotion needs a separate grant.
