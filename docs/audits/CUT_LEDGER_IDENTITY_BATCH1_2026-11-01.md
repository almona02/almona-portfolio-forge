# Cut-ledger identity (Batch 1) — verification notes, 2026-11-01

Branch `cursor-nov-yilmaz-export` (PR #122). AICS-001 §Tier 3 (deterministic
manufacturing truth), §7.5 (replayable evidence). No advisory inference is added;
every change is a deterministic identity/parity check or a diagnostic.

## Reported case

Project FP-Y0RIPV, position 1, revision R9, CALUMINIUM PS, 2-sash sliding
1500 × 1800 mm. Optimization failed with
`design ledger missing cut PS-6601-BEAD:glazing_bead:0:PS-6601-BEAD:645.850:45`.

Confirmed cause: `ProfileBOMCalculator.rowsFromDesignComponents` grouped cuts by
`profile:role` and dropped the component occurrence IDs, so
`requiredCutsFromBom` reconstructed `rowId:index` while the solver placed
`componentId:index` (`physicalCutForOccurrence`). Equal dimensions/counts
passed the old geometry gate but not the identity multiset.

## Saved R9 design (read-only inspection of production `fabricator_positions_v2`)

Position `3ecb65c7-…ff08`, `qc_revision 9`, `quantity 1`, pack `caluminium-ps`,
22 saved components / 23 cuts, **raw (pre-allowance) lengths**:

| role | components | raw mm | allowance | physical mm |
|---|---|---|---|---|
| frame | `frame_{top,bottom,left,right}_1793549220583` | 1500 ×2, 1800 ×2 | 3 | 1503 ×2, 1803 ×2 |
| interlock | `interlock_vertical_1793549220583` | 1605.7 | 2 | 1607.7 |
| sash | `sash_{0-0,0-1}_{top,bottom,left,right}` | 652.85 ×4, 1605.7 ×4 | 3 | 655.85 ×4, 1608.7 ×4 |
| glazing bead | `bead_{0-0,0-1}_{top,bottom,left,right}` | 644.85 ×4, 1597.7 ×4 | 1 | 645.85 ×4, 1598.7 ×4 |
| track | `design-track-3ecb65c7-…ff08` | 1305.7 ×2 | 2 | 1307.7 ×2 |

Total physical piece length 28 871.5 mm. No `fabricator_optimization_evidence`
row exists for this position (R9 was never recorded). The synthetic track
component **is** persisted with the design (`design-track-<positionId>`), so its
identity survives save/reload and matches server derivation (`componentId:index`).

## What changed (client)

- `ProfileBOMCalculator`: grouped rows carry aligned `cutIds`
  (`componentId:index`); enriched sliding rows carry their synthetic identity
  explicitly instead of leaving the consumer to invent one.
- `recordOptimizationEvidence.requiredCutsFromBom`: fail-closed. Rows without
  aligned identities (BOM cached before this fix) return
  "no cut occurrence identities … Rebuild the BOM from the saved design". IDs are
  never reconstructed from row IDs and never taken from solver placements.
- `validateOptimizationEvidencePayload.reconcileDesignLedger`: structured
  multiset reconciliation (identity, profile, length 3 dp, angle, multiplicity
  judged together) with named diagnostics: missing cut, duplicate occurrence,
  substituted profile, wrongly sized cut, wrong angle, unexpected cut, missing
  identity. Keys are no longer split on `:` (component IDs contain colons).
- `WorkflowValidator.assessBomDesignParity`: the optimization/commercial/
  production/QC gate now compares BOM rows to the completed design as a multiset
  of (identity, profile, length, angle). Legacy cached BOMs fail with
  `BOM_CUT_IDENTITY_MISSING` and the operator is routed to regenerate the BOM
  (which rebuilds from the saved design and persists aligned components).
  `reviewSnapshot` uses the same check, so stale localStorage snapshots are
  dropped on load instead of being trusted.
- `RequiredCutsPanel`: shows preserved identities; never synthesises one.

Regression fixture: `src/lib/fabricator/commercial/cutLedgerIdentity.reportedCase.test.ts`
(saved R9 design → positions_v2 row → hydrate → BOM → JSON reload → solver →
evidence payload; 23 occurrences placed exactly once; identity/profile/length/
angle/quantity corruption rejected with named diagnostics; legacy BOM rejected
and rebuilt; authenticated path with mocked authority/RPC).

## Server ledger verification (read-only, both Supabase projects)

| | production `shfsebdncjnncqqnewfj` (app `.env`) | staging `apnmoevmvihfzcnttctx` |
|---|---|---|
| `derive_required_cuts_from_position` | **not deployed** | deployed (= migration 20261011052158) |
| `record_fabricator_optimization_evidence` | pre-ledger version: no `requiredCuts`, no server derive, accepts `design\|\|placement` fingerprint | ledger version (calls derive, strips client `requiredCuts`) |
| `validate_optimization_evidence_payload` | 2 OUT params (no design fingerprint) | 3 OUT params |

Consequences:

1. On production the client's `derive_required_cuts_from_position` call errors
   and is swallowed; the local BOM ledger is the only design gate and the server
   does not re-derive. With Batch 1 the reported local failure is fixed, but
   production still lacks the authoritative server ledger (migrations
   20261010020000 / 20261011052158 are not promoted).
2. On staging the server ledger emits **raw saved `cuttingLengths`** and
   multiplies by `component.quantity × position.quantity`, while the solver
   places **physical** lengths (raw + catalogue `cuttingAllowance`, calibrated)
   once per occurrence. For any PS profile (allowances 3/2/1) the server check
   rejects a correct placement with "wrongly sized cut" (now surfaced as
   `Server design ledger wrongly sized cut <id> (required 1500.000 mm, placed
   1503.000 mm)…`). Position quantity > 1 would additionally fail with a cut
   count mismatch. Both are covered by fail-closed tests in the fixture.

Proposed follow-up (not implemented — needs an owner decision, SQL migration
and SQL tests): make the server derivation apply the approved catalogue
allowance exactly once (allowance must come from the authority payload, not the
client-saved profile JSON) and decide whether evidence is per-window (current
solver) or per-position-quantity before expanding copies.

## Batch 2 — approved solver inputs and inventory readiness

Confirmed before the change: `OptimizationPage.handleOptimizationComplete`
ignored the equalizer payload, built `CuttingJob` with `defaultStockLength:
6000`, and the solver read kerf/trim from pack profile specifications (which
CALUMINIUM PS does not define → 0 mm kerf / 0 mm trim at pack time) while the
evidence validated against the approved authority kerf/trim. Stock
acknowledgement was a studio sidebar rule only; the page never checked it.

Changes (AICS-001 Tier 3, deterministic only):

- `lib/fabricator/optimization/solverInputs.ts`
  - `resolveApprovedSolverInputs`: binds each design profile to approved
    `manufacturingSettings.sawKerfMm/trimCutMm` and an approved stock length
    for that profile. One approved length → bound; several → operator must
    choose (`STOCK_SELECTION_REQUIRED`); none → `PROFILE_NOT_APPROVED`;
    unapproved pick → `STOCK_NOT_APPROVED`. Allowance is left to
    `physicalCutForOccurrence` (applied once).
  - `assessStockReadiness`: revision-bound acknowledgement judged as separate
    issues — `STOCK_NOT_ACKNOWLEDGED`, `STOCK_ACK_STALE_REVISION`,
    `STOCK_ACK_STALE_BOM`, `STOCK_MAPPING_MISSING`, `STOCK_SHORTAGE`.
  - `filterEligibleRemnants`: deterministic min-length / max-age / expiry /
    status filter (informational; see limitation below).
  - `barsByProfile`: actual bars per profile from the solved plan.
- `AdaptiveSolver`: `CuttingJob.stockByProfile` is authoritative when present
  (every profile must be bound — no default bar), plan stock must equal the
  binding, and a finite `availableBars` fails closed with `StockBindingError`
  (never retried through the greedy fallback).
- `OptimizationPage`: resolves the authority for the saved revision up front;
  **production run** requires authenticated saved revision + resolved authority
  + bound inputs + ready stock acknowledgement, solves with the bound profiles
  and `stockByProfile`, then records evidence. **Inventory-free simulation** is
  an explicit mode: result is shown with a banner, kept in page state only,
  never stored, never evidence, never completes the step. Supported controls:
  run mode and approved stock length per profile (when several are approved).
  Algorithm selection is not operator-tunable: it stays rule-based inside the
  solver (AICS-001 / FP-016 / FP-025A — the page never sets `preferredAlgorithm`
  or an authority label).
- `OptimizationEqualizer` (Tier-3 path): weight sliders and remnant inputs are
  disabled and labelled advisory; the slider-derived "estimated impact" is not
  rendered as a result. Actual bars/waste come from the cockpit after the run.
- `recordOptimizationEvidence.cuttingPlanForEvidence`: strips the solver-bound
  `sawKerf/barEndTrim` from plan profiles so the payload carries approved
  machining exactly once (server rejects plan-level overrides).

Tests: `solverInputs.test.ts` (non-6000 stock, finite bar counts, unapproved
mapping, insufficient stock, kerf/trim variation changing bar count, stale
revision/BOM, shortage, expired remnants), `OptimizationPage.failClosed.test.tsx`
(approved stock + kerf/trim reach the solver, no default bar; approved-stock
control changes the job; no operator algorithm choice; missing/stale/short
acknowledgement blocks without
solving; unapproved profile blocks; simulation cannot unlock production or record
evidence), `recordOptimizationEvidence.test.ts` (plan kerf/trim stripping).

Limitations (explicit):

- Owned inventory is acknowledged in metres (soft check). Finite bar counts
  (`availableBars`) are supported by the solver and tests but are not yet fed
  from the owned-stock ledger, because the ledger does not carry bar counts per
  length; the page therefore passes approved stock lengths without counts.
- Remnant bars are not approved catalogue stock lengths, so the evidence
  contract (client and server `assert_evidence_against_authority`) rejects
  placements on them. Remnant controls are informational until the authority
  model admits remnant lengths; they are labelled as such.

## Live limitation (explicit)

R9 has **not** been re-recorded live. Re-recording requires the owner's
authenticated browser session against the deployed RPC; this agent only ran
read-only SQL inspection. R9 must not be marked fixed until the saved revision
is retried from the app and `fabricator_optimization_evidence` shows a row for
position `3ecb65c7-…ff08` at `position_revision 9`.
