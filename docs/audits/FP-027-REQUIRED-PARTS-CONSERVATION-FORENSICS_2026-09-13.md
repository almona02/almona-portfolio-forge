# FP-027 — Optimization Required-Parts Conservation Forensics

| Field | Value |
|-------|--------|
| Date opened | 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Opened by | independent review of FP-024C.3, which reprioritised this above the 90° compensation control |
| Predecessor evidence | `docs/audits/FP-024C3-CONTROLLED-REPEATABILITY_2026-09-12.md` — three controlled fresh solves |
| Gate | 🔓 **OPEN — FORENSICS ONLY** |
| Fix status | **NOT FIXED.** No invariant implemented, no formula changed, no export changed |
| Production formulas | **FROZEN** |
| 90° CONTROL_FIXTURE | **GATED** — reopens after this gate closes |
| PR #32 | Draft / **DO NOT MERGE** |

---

## Question

Where in the pipeline does the required quantity of one ORTA-KAYIT-70 mullion become four planned pieces?

```text
1 required ORTA  ->  4 optimization ORTA
```

The task at this gate is **localisation, not repair**. Nothing may be fixed until the first layer that changes the count is identified.

---

## The observation being traced

Measured identically in RUN_A, RUN_B and RUN_C under measured-identical inputs on baseline V2:

| | Required | Optimization plan | Surplus |
|---|---|---|---|
| Pieces | 21 | 24 | **+3** |
| ORTA-KAYIT-70 1416 mm | 1 | 4 | **+3 = 4248 mm** |

Authority carried in from FP-024C.3:

```text
OPTIMIZATION_REQUIRED_PARTS_CONSERVATION_VIOLATION
  = REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS

SURPLUS_PLAN_REMAINDER_PROPAGATES_TO_MACHINE_OUTPUT
  = REPEATABLE_OBSERVATION

+3 ORTA root cause = UNPROVEN
```

The surplus is repeatable across all three measured-identical runs and is **not correlated** with the observed stochastic CITA topology variation — the CITA grouping varied `X / Y / X` while the surplus was byte-identical three times out of three. Evidence therefore supports a deterministic or upstream conservation defect, but root cause remains `UNPROVEN`. Three identical outcomes make a stochastic explanation unsupported and increasingly unlikely; they do not mathematically exclude it.

Why this outranks the compensation question: the plan reports 820 mm remaining on the ORTA bar, and that value reaches the DC-600 file. Producing the one required mullion leaves ≈5080 mm. Any *Add Offcuts to Stock* or material-accounting decision taken from this plan is wrong by ≈4260 mm, and the DC-600 file carries the wrong number rather than the plan alone. That is a manufacturing-safety invariant violation, not a dimensional-accuracy question.

---

## Forensic boundary — layer-by-layer, with observability

The review specified this trace. Each layer is marked with what was actually measured in all three runs and whether the layer is observable at all from outside the licensed binary.

| # | Layer | ORTA count | Observability | Evidence |
|---|-------|-----------|---------------|----------|
| 1 | Design required parts | **1** | observable | Required-parts list, 21 rows, ORTA 1416 qty 1, visually measured in every run |
| 2 | Production plan | **1** | observable | plan generated 21 cut-list rows in every run |
| 3 | Optimization input (Required Parts panel) | **1** | observable | solver's own panel renders *Required Parts Quantity: 1* in the same frame as the 4-piece bar strip |
| 4 | Column generation — pattern contents | **UNOBSERVABLE** | not exposed | log reports the loop ran; it does not print pattern composition |
| 5 | MIP demand constraints | **UNOBSERVABLE** | not exposed | log reports stage 2 `OPTIMAL`, cost 6.50, **1 stock / 1 layout**. Bar count is exposed; piece multiplicity inside the layout is not |
| 6 | Post-MIP / annealing representation | **UNOBSERVABLE** | not exposed | `TAVLAMA BENZETİMİ` MaxIter 210, T 100. No seed, no intermediate state |
| 7 | Report / cutting plan | **4** | observable | bar 5, ORTA-KAYIT-70 6500, applications 1, packed `1416, 1416, 1416, 1416`, used 5664.00, remaining **820.00**, yield 87.4 % |
| 8 | DC-600 export | **1 piece, but 820 mm remainder** | observable | `Table1` wrote 13 rows including exactly one ORTA row; `REMAINING_LENGTH` = `8200` → 820.0 mm, with DoWin's own warning `3 piece(s) in the optimization plan could not be matched to the detailed production list.` |

### First layer of divergence

```text
FIRST_LAYER_OF_COUNT_DIVERGENCE = UNPROVEN
bounded to: after layer 3 (optimizer input) and at or before layer 7 (report)
i.e. inside column generation -> MIP -> annealing
```

This bound is **measured**, not inferred: the count is proven `1` at the optimizer's own input surface and proven `4` at its own report surface, in all three runs. The three layers in between expose bar counts and objective costs but never piece multiplicity, so the exact layer cannot be named from log evidence and must not be asserted.

`1 stock / 1 layout` at stage 2 must not be read as "the MIP asked for one piece". It states that one stock bar and one layout were selected. A layout containing four 1416 mm pieces, applied once, is fully consistent with that line.

### Two separate defects, not one

The trace separates a **creation** defect from a **propagation** defect, and they sit in different layers:

| Defect | Layer | Statement | Authority |
|--------|-------|-----------|-----------|
| Creation | 4–6 | required 1 becomes planned 4 | `UNPROVEN` — bounded only |
| Propagation | 8 | export filters the surplus pieces out of the piece list but keeps the plan's remainder | `SUPPORTED` |

The propagation defect is the better-evidenced of the two. The export layer demonstrably *did* reconcile against the production list — it wrote exactly one ORTA piece and emitted a warning naming three unmatched pieces — yet `REMAINING_LENGTH` still carries the four-piece value. The remainder field is therefore consistent with being copied from the plan pattern rather than recomputed from the pieces actually written.

```text
REMAINDER_NOT_RECOMPUTED_AFTER_EXPORT_MATCH_FILTER = SUPPORTED
```

`SUPPORTED`, not `PROVEN`: the export code is not observable, so "copied rather than recomputed" is the mechanism most consistent with the evidence, not a demonstrated one.

---

## The fixture confounds every candidate mechanism

The obvious hypothesis — pattern generation fills the bar without capping at demand — is **contradicted** by two of the four profiles in the same runs. Per-profile spare capacity against observed surplus:

| Profile | Bar | Demand | Bars used | Spare per bar | Another piece fits? | Surplus |
|---------|-----|--------|-----------|---------------|---------------------|---------|
| ORTA-KAYIT-70 | 6500 | 1 × 1416 | 1 | 5080 | **yes, 3 more** | **+3** |
| KASA-70 | 6000 | 2 × 1503 + 2 × 1003 | 1 | 965.37 | no | 0 |
| KANAT-70 | 6000 | 4 × 1433 + 4 × 454 | 2 | 2203.37 | **yes** | **0** |
| CITA-20 | 6500 | 4 × 1313 + 4 × 334 | 2 | 206.40 / 6160.34 | **yes, many** | **0** |

KANAT and CITA both left room for further pieces and produced exactly the demanded quantity. A blanket "fill the bar" mechanism would have overproduced there too. So the defect is conditional, and this fixture does not reveal on what.

ORTA is the only profile in the fixture that is simultaneously:

1. fully satisfiable on a single bar with room for at least one more copy (KASA is single-bar but full; KANAT/CITA are multi-bar),
2. cut at 90° / 90° while every other piece is 45° / 45°,
3. carrying a single distinct length rather than two,
4. demanded exactly once,
5. priced at 0, giving stage 2 an objective of 6.50 against 6000–18000 for the others.

Five candidate variables are perfectly confounded in one profile. **No hypothesis can be separated from this fixture**, which is why no fix may be attempted yet.

### Leading hypothesis

The single mechanism consistent with all four profiles is a combination rather than a pure pattern defect:

```text
INEQUALITY_DEMAND_CONSTRAINT_PLUS_OBJECTIVE_INDIFFERENCE
  = CONSISTENT_WITH_ALL_OBSERVED_DATA (hypothesis only)
```

If the demand constraint is `>= required` rather than `= required`, overproduction is *feasible*, and it then becomes *observable* only where the objective cannot distinguish it. Adding three mullions to a bar already paid for changes neither the bar count nor a near-zero cost, so the solver is indifferent and a utilisation-maximising step is free to fill. For KANAT and CITA, overproducing would change bar count or cost, so the objective rejects it; for KASA there is no room. This explains all five patterns without contradiction.

It remains a **hypothesis**. The constraint formulation is inside the licensed binary, no decompilation is permitted, and consistency with four observations is not proof.

---

## Discriminating experiments — specified, not authorized

Each changes **only the design fixture**. None changes stock, settings, machine or formulas, so all are compatible with the standing freeze and the V2 baseline. All require explicit authorization and the FP-024C.3 freshness protocol, including answering **No** to the Stock Update dialog.

| Id | Fixture | Purpose | Prediction if structural (single-bar fill) | Prediction if ORTA/angle/price-specific |
|----|---------|---------|--------------------------------------------|------------------------------------------|
| **E3** | small frame, e.g. 500 × 500, no mullion — KASA demand ≈ 4 × 503 on a 6000 bar, ≈3988 spare, all 45°, non-zero price | strongest single discriminator: tests the mechanism on a completely different profile | surplus appears on KASA | no surplus |
| **E1** | 3-lite window — ORTA demand 2 | separates "fills the bar" from "demand = 1 special case" | 4 planned, surplus +2 | 2 planned, no surplus |
| **E2** | 5-lite window — ORTA demand 5, forcing 2 bars | tests whether the multi-bar path is demand-capped, as KANAT/CITA suggest | surplus on the second bar | no surplus |

Run **E3 first**. A surplus on KASA would promote the defect from an ORTA curiosity to a structural fault affecting every small order, and would sharply raise the severity of importing DoWin plans for material accounting. No surplus on E3 would eliminate both leading hypotheses and redirect the trace to the ORTA-specific variables.

Explicitly **not** proposed here: changing ORTA stock quantity back toward 0. That was the original candidate, it requires mutating the warehouse, and it would destroy baseline V2 — the same reason FP-024C.3 refused it.

---

## Proposed invariant — specified, NOT implemented

Recorded so the eventual fix has a written target. **No code implements this yet.**

For every profile and every distinct cut length, an optimization plan derived from a production plan must satisfy:

```text
planned piece count (length L, profile P) == required piece count (length L, profile P)
```

and every derived material figure must be computed from the pieces actually written, not inherited from a pattern:

```text
remainder(bar) == stockLength - sum(written pieces) - kerf(written pieces) - trim
```

Neither may be a warning. A conservation failure is a fail-closed condition: a plan that does not conserve required parts is not a valid plan, and a remainder that does not reconcile with the written pieces is not a publishable remainder. DoWin's behaviour of emitting `3 piece(s) ... could not be matched` and continuing is precisely the pattern to avoid.

---

## ALMONA exposure

Read-only inspection of ALMONA's own cutting path, recorded so this gate states our own position rather than only the third party's:

| Engine | Demand handling | Exposure |
|--------|-----------------|----------|
| `src/lib/fabricator/OptimizationEngine.ts` — `SimplifiedOptimizationEngine` | First-Fit Decreasing, expands each cut exactly `cut.quantity` times | **NOT_EXPOSED_BY_CONSTRUCTION** |
| `src/lib/fabricator/AlmonaCuttingEngine.ts` | same — iterates `copy < item.quantity` | **NOT_EXPOSED_BY_CONSTRUCTION** |

Both engines emit one piece per demanded unit, so overproduction is structurally impossible: there is no pattern-multiplicity step that could exceed demand.

```text
ALMONA_CONSERVATION_EXPOSURE = NOT_EXPOSED_BY_CONSTRUCTION
ALMONA_CONSERVATION_INVARIANT_ASSERTED = NO
```

The invariant holds by construction but is **nowhere asserted** — no test fails if a future engine breaks it. That is the real ALMONA risk: DoWin-parity work points toward pattern-based or column-generation optimization, which is exactly the architecture in which this defect class becomes possible. The invariant should be asserted *before* any such optimizer is written, not after.

This is also a constitutional point under AICS-001. Required-parts conservation is a deterministic constraint, so it is non-negotiable and must not sit behind a heuristic, a solver objective or an `IntelligenceGate` — a plan either conserves or it is rejected.

---

## Constraints at this gate

- Do **not** fix the conservation defect. Localise first.
- Do **not** implement the invariant yet.
- Do **not** change machine export or the remainder field.
- Do **not** modify `ManufacturingSettings.ts`, `barPackAccounting.ts`, `UPVCCuttingEngine.ts` or `src/lib/fabricator/production`.
- Do **not** run the 90° control; it stays gated behind this work.
- Do **not** mutate warehouse stock, and do not answer `Yes` to the Stock Update dialog.
- Do **not** decompile, and do not open the encrypted shop database.
- Do **not** start FP-016, FP-017 or FP-025B.
- Do **not** merge PR #32.
- Run no controlled experiment without explicit authorization.

---

## Authority

| Finding | Verdict |
|---------|---------|
| `OPTIMIZATION_REQUIRED_PARTS_CONSERVATION_VIOLATION` | **REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS** |
| +3 ORTA root cause | **UNPROVEN** |
| `FIRST_LAYER_OF_COUNT_DIVERGENCE` | **UNPROVEN** — bounded to column generation → MIP → annealing |
| Count at optimizer input (layer 3) | **1 — MEASURED, all three runs** |
| Count at optimizer report (layer 7) | **4 — MEASURED, all three runs** |
| Layers 4/5/6 internals | **UNOBSERVABLE** without decompilation |
| `REMAINDER_NOT_RECOMPUTED_AFTER_EXPORT_MATCH_FILTER` | **SUPPORTED** |
| `SURPLUS_PLAN_REMAINDER_PROPAGATES_TO_MACHINE_OUTPUT` | **REPEATABLE_OBSERVATION** |
| `INEQUALITY_DEMAND_CONSTRAINT_PLUS_OBJECTIVE_INDIFFERENCE` | **CONSISTENT_WITH_ALL_OBSERVED_DATA** — hypothesis only |
| "Pattern generation always fills the bar" | **CONTRADICTED** by KANAT and CITA in the same runs |
| Fixture discriminating power | **INSUFFICIENT** — five candidate variables confounded in one profile |
| Exported ORTA **piece list** | **CORRECT** — one mullion; no wrong-parts cutting risk on this path |
| `ALMONA_CONSERVATION_EXPOSURE` | **NOT_EXPOSED_BY_CONSTRUCTION** |
| `ALMONA_CONSERVATION_INVARIANT_ASSERTED` | **NO** |
| E1 / E2 / E3 | **SPECIFIED, NOT AUTHORIZED** |
| Fix | **NOT IMPLEMENTED** |

---

## Sequence

```text
FP-027 forensic root-cause audit          <- open, this document
  -> conservation invariant and fix
  -> re-run controlled conservation test
  -> return to 90 CONTROL_FIXTURE
  -> FP-024C physical formula conclusion
  -> FP-016
  -> FP-017
```

---

## Licensed-artifact exclusion

Committed: transcriptions, structured provenance, SHA-256 values, classification, audit text.

Not committed: PDFs, `.dw` files, MDB, screenshots, machine binaries. No decompilation was performed and the encrypted shop database was not opened. Every statement about layers 4–6 is explicitly marked unobservable for this reason.
