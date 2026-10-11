# Object editing + material BOM — owner sign-off

**Date:** 2026-10-10
**Checkout:** `feat/object-bom-phase1-fixtures-select` (branched from `#78` `cbec1217` on `fix/cut-ledger-fingerprint-parity`)
**Baseline ancestor:** `f27f0317`
**Score:** 88/100 provisional — unchanged
**FP-027:** OPEN — untouched

## Confirmed (review packet)

1. **Golden set:** Five Deceuninck 70 PVC saved layout families (11 positions). Later asymmetric/door cases only when catalogue-backed.
2. **Editor:** Existing-canvas approach — no replacement SmartDraw editor.
3. **Recipes:** Separate aluminium vs UPVC; aluminium remains unqualified until saved samples exist.
4. **First code slice:** Evidence fixtures → casement classification / structured SKU refs / invalidation; UI select-only in parallel without formula ownership.
5. **Non-goals held:** Object styling polish, authority seeds, prod SQL, machine export, FP-027 closeout, collapsing eight templates into “complete inventory,” inferring glass from bead cuts.

## Ownership (binding)

| Lane | Owns | Must not |
|---|---|---|
| Source curator | DoWin register, JSON, hashes | Engine/UI edits |
| Engine | Opening semantics, geometry, recipes, cache/fingerprint contracts | Drawing chrome |
| UI | Hit-test, highlight, inspector, select-without-mutate | Duplicate length/BOM formulas |
| Acceptance | Independent expected multisets, browser evidence | Softening counts to match code |

Shared boundary (occurrence IDs + revision dependency schema): Engine commits contract first; UI adapts.

## Sequencing gate

Phases 2–5 (geometry, material recipes, full inspector, staging FINAL GOAL) start only after fixtures + opening/invalidation exits are green or explicitly unmatched. See `OBJECT_BOM_PHASE_GATE_2026-10-10.md`.
