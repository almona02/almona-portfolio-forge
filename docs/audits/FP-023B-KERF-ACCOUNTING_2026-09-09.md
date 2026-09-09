# FP-023B — Kerf Accounting Consistency

| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Repository | `almona-portfolio-forge` |
| Branch | `main` |
| Depends on | FP-023A (committed `6d9da87` / `93fa60d` / `99947ce`) |
| Scope | Bar-pack kerf **count** (N vs N−1). Not FP-024, FP-016, FP-017, Basma/Kaynak, or `calculateKFactor`. |
| Gate | ✅ **PROVEN** for canonical consumed-length / kerf-loss / remnant identity. Physical-length score **unchanged at 6.0/10**. |
| Accepted | 9 September 2026 — confidence gain, not a readiness-score increase |

---

## Physical saw-process rule (before any flip)

The question was: for a bar with N finished pieces, how many SawThickness losses does a Yilmaz chop-saw packing consume?

**Rule adopted:** `kerf_after_each_piece` — **N kerfs for N pieces**, plus TrimCut once per bar.

Evidence (behavioural, not decompiled):

| Source | Statement |
|--------|---------|
| Licensed Yilmaz dealer audit 9 Sep 2026 | “Bar packing = Σ(piece + SawThickness) + TrimCut” (`docs/audits/DOWIN_VS_ALMONA_DEALER_AUDIT_2026-09-09.md`) |
| DoWin factory Settings | `SawThickness` 4 mm; `TrimCut` 0 |
| Chop-saw process | Each finished piece is cut off remaining stock. The last piece still requires a saw pass. N−1 “gaps between items only” omits that pass. |

A one-piece bar makes this unambiguous: cutting a 1000 mm piece from 6000 mm stock consumes **one** kerf. N−1 would consume zero.

This gate **did not** pick N because VisualCuttingPlan already used N, nor N−1 because LinearOptimizer already used N−1. LinearOptimizer was the outlier relative to the documented process.

`trimCutMm` is in the formula. Platform and `yilmazcad-parity` both have TrimCut **0**, so Egypt jobs do not silently gain bar-end trim. MicronEngine 15 mm/end and BOM 2 mm compensation were **not** folded in.

---

## Before-state accounting

| Consumer | Rule at FP-023A | After FP-023B |
|----------|-----------------|---------------|
| `LinearOptimizer` | N−1 (kerf only if `bar.cuts.length > 0`) | **N** via `pieceSlotMm` |
| `pythonHeavyClient` local greedy | N−1 | **N** |
| `AlmonaCuttingEngine` | N (`length + kerf`) | **N** via `pieceSlotMm` / `barRemnantLengthMm` |
| `UPVCCuttingEngine` pack | N | **N** via `pieceSlotMm` |
| `VisualCuttingPlan` | N | **N** via `barConsumedLengthMm` |
| `CutSheetGenerator` (both APIs) | N | **N** via `pieceStartPositionsMm` / `barRemnantLengthMm` |
| Export (`CutListExport` → Almona engine) | N | **N** (unchanged path, shared remnant) |
| `ProductionOptimizer` (`STANDARD_KERF_MM` 4.2) | N−1 | **Unchanged — non-canonical** (YDT/hybrid, 4.2 mm, genetic refinement). Not part of this invariant. |

Demonstration that N vs N−1 is not cosmetic: three 1997 mm pieces, 6000 mm bar, 4 mm kerf.

- N−1 consumed = 5999 → would fit one bar  
- N consumed = 6003 → does not fit  
- `optimizeLinearCuts` now returns **2 bars**

---

## Canonical API

`src/lib/fabricator/barPackAccounting.ts`

```text
consumed = Σ pieceLength + N × sawKerfMm + trimCutMm
remnant  = stockLength − consumed
```

`accountBarPack(stock, lengths, settings)` is the identity both tests and consumers share.

---

## RemnantManager 200 mm

Warehouse `src/lib/inventory/RemnantManager.ts`:

- **Not** a bar-pack consumed-length consumer (no kerf formula).
- Keep/drop floor **wired** to `PLATFORM_MANUFACTURING_DEFAULTS.minimumReusableLengthMm` (**300**), not a third 200 mm constant.
- `fromManufacturingSettings()` still yields **500** for `yilmazcad-parity`.
- Canonical remnant millimetres on a packed bar remain `barRemnantLengthMm`.

Platform 300 vs yilmazcad-parity 500 is unchanged.

---

## Explicitly not touched

- `calculateKFactor`
- Basma / Kaynak / sash-length formula
- BOM `DEFAULT_KERF_MM = 2`
- MicronEngine 4.2 / 15 mm/end internals
- FP-016 / FP-017

---

## Tests

| Command | Result |
|---------|--------|
| `npm run type-check` | pass |
| `npm run build` | pass |
| `npx vitest run src/tests/fabricator` | **5 files, 58 passed** |
| `npx vitest run src/tests/constitutional` | **8 files, 82 passed** |
| Focused FP-023B + settings + engines | **33 passed / 0 failed** |

Invariant test: `src/tests/fabricator/kerfAccountingInvariant.test.ts`

Same bar `[1400, 1000, 800]` / 6000 mm / kerf 4 / trim 0 → optimizer waste, CutSheet `wasteMm`, `barConsumedLengthMm` remnant, and Almona packed-bar remnant are **identical**.

---

## Scores (unchanged)

FP-023B makes bar **consumption** consistent. It does not prove piece **lengths** vs a DoWin export. Do not raise physical-length correctness above **6.0/10** yet.

| Area | Score |
|------|------:|
| Manufacturing settings governance | 8.0/10 |
| Physical length correctness | **6.0/10** |
| Optimization correctness | 7.0/10 |
| CAD/CAM manufacturing confidence | 5.5–6.0/10 |
| Industrial core | ~7.2–7.4/10 |
| Full platform | ~5.3/10 |

---

## Gate verdict

**✅ PROVEN** for: one physical kerf-count rule, shared consumed / kerf-loss / remnant on the canonical path, warehouse floor aligned to platform 300.

**Not** a manufacturing-correctness score increase.

Next: **FP-024** only. Acceptance remains:

> Same elevation + same system + same manufacturing settings → ALMONA cut lengths within **±0.1 mm** of a **real exported DoWin cut list**, per physical piece.

FP-024 must score **separately**: frame, sash horizontal, sash vertical, mullion, glass, angle compensation. No physical-length score increase until that external fixture passes. After it passes, physical-length correctness may move from 6.0 toward ~8.0–8.5.
