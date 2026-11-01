# Cut ledger Batch B — server derive + physical stock (2026-11-01)

## Staging derive RPC (inspected)

`derive_required_cuts_from_position` on staging (`apnmoevmvihfzcnttctx`) matches the
migration body in `20261011052158_fabricator_evidence_owner_profile_stock_guard.sql`:

- Expands `position.quantity` × component `quantity` as a **multiset** of
  `componentId:index` cutIds (same identity repeated).
- Emits **raw** `cuttingLengths` from saved components (no client calibration /
  cuttingAllowance). Client BOM / solver use `physicalCutForOccurrence` lengths.

**Implication:** local evidence validation uses allowance-calibrated BOM lengths;
server fingerprint uses raw lengths. Record RPC must keep re-deriving. Client now
**fails closed** if derive errors or returns empty — no silent client-only gate.

## Client changes in this batch

1. `recordOptimizationEvidence` requires a non-empty derive result before write.
2. Stock acknowledgement stores `barsByCatalogueProfile` (finite bars from
   available metres ÷ bar length) and OptimizationPage passes them into
   `resolveApprovedSolverInputs` → AdaptiveSolver `assertStockAccounting`.
3. Remnant packing controls remain informational / disabled for production
   authority (unchanged contract in `filterEligibleRemnants`).

## Live R9

Not re-executed in this change set (requires authenticated workshop session +
genuine inventory). Checklist for controlled R9:

1. Open saved sliding pose, set quantity 2, qualify BOM (23 design cuts).
2. Acknowledge stock with mapped owned profiles (barsByCatalogueProfile present).
3. Production optimize; confirm evidence record succeeds; reload revision.
4. Capture: revision, required/placed counts (46), stock lengths, derive parity.
5. Negative: reduce owned metres below plan bars → solver/ack must block.

## Remaining

- Reconcile raw vs allowance lengths on the server ledger OR stamp physical
  lengths into saved components so derive matches BOM (separate migration).
- Production DB spot-check before rollout (same inspect as staging).
- Authenticated R9 capture attached to release notes when run.
