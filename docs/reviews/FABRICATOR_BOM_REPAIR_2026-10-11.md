# review BOM repair - 11 October 2026

## Scope

Isolated branch codex/bom-save-qualification-repair, starting from review #80 b98b222f and integrating current main 99fd2520 locally. review checkout and its untracked .tmp-pr-assess/ remain untouched. No production changes, migration writes, approval exceptions or browser E2E.

## Repairs

- Removed qualification restamping across revisions. Forward revisions clear downstream artifacts and require fresh authority. Late backwards-revision hydration is ignored.
- Added guarded acknowledged generation: prepare -> save -> authoritative read -> fresh authority -> generate -> publish. Every awaited stage checks active pose/draft/request. Failed persistence cannot publish. Returned server components are not overwritten by local cuts.
- Route changes/unmount cancel obsolete generation; automatic retries cannot loop on a failure. Save acknowledgement must match owner/project/pose/source and advance revision when a write occurs. Unchanged acknowledged ledgers do not write or bump revision, preserving hardener approval applicability.
- Saved sliding ledgers compare exact profile/physical length/angle multisets with generated design. Partial-with-sash and same-count substituted cuts reject. Conflicting authored choices are retained for explicit Design correction, never silently replaced.
- Corrected the fixture that stored allowance-inclusive BOM cuts as nominal design inputs. Required count remains 23. Corrected obsolete navigation expectation: unqualified estimates stay blocked.
- Fixed the new workflow identity fixture TS2352 occurrence without refreshing compiler baselines.

## Verification and limits

Final integrated suite: **72/72 checks across 10 files**, covering panel publication/save failure, authority reads, stale acknowledgements, every awaited cancellation boundary, revision/quantity/glazing invalidation, exact sliding ledger parity and main ledger/fingerprint contracts. The unchanged Windows compiler baseline gate passes: 1774 app diagnostics vs baseline 1791, zero new signatures and zero occurrence increases; node clean. This is not type-clean. Final committed-code production build passed (54.25s); PWA generated. Linux CI and independent review remain pending. No SQL or migration diff against main. No browser acceptance claimed. Non-sliding saved-ledger and Gold custom-profile expansion remain separate phase-one/design work; this narrow gate does not claim universal reference-source generator parity.

Next: #78 ledger contracts/conflicts, #81 phase-one production wiring and reference-source parity, staging schema/security parity, then owner-resumed disposable FINAL GOAL. FP-027 exports remain blocked and composite held at 88 provisional. Production #76 SQL promotion needs a separate grant.

## Full Pipeline follow-up

At ed8f4cdc, Linux type delta, constitutional, shipability, hardening and measured fixture workflows passed. Full Pipeline failed one old Caluminium saved-ledger test: its sash cuts used overall/raw half-width dimensions rather than canonical nominal member geometry, and expected missing members to be invented. Corrected that expectation to fail closed; no cut-count relaxation or qualification bypass.

Full local unit run after correction: **277 files passed, 2 skipped; 1822 tests passed, 4 expected failures, 14 skipped**. The old ignored diagnostic counterexample (which deliberately asserted pre-fix unsafe behavior) was renamed out of test discovery, retained locally; production regression tests assert the repaired behavior. New CI must pass before treating this draft as merge-ready.
