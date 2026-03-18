# ALMONA — Deferred Work & Next Steps

> **Purpose**: Document recommended next steps and development work deferred for later.  
> **Status**: All items below are **documented only** — dev work deferred.  
> **Last updated**: 2025-02-27

---

## Current State

Phase 0–4 complete. Core pipeline wired: Measuring → Design → BOM → Optimization → Commercial → Production.

See [GAP_ANALYSIS_VERIFICATION_REPORT.md](./GAP_ANALYSIS_VERIFICATION_REPORT.md) for verification details.

---

## Deferred Work (Prioritized)

### Priority 1 — UX & Validation

| Item | Description | Effort | Impact |
|------|-------------|--------|--------|
| **End-to-end testing** | Manual walkthrough of full pipeline; fix friction points | 1–2 days | High |
| **Step navigation** | Add stepper/indicator so users see Measuring → Design → BOM → Optimization → Commercial → Production | 1 day | High |
| **Error handling polish** | Clear validation messages; guide users to correct step | 0.5–1 day | Medium |

### Priority 2 — Important Gaps (G7–G8)

| Item | Description | Effort | Impact |
|------|-------------|--------|--------|
| **G8 U-value / thermal UI** | Surface U-value and thermal summary in design or BOM step; supports building code certification | 2–4 days | Medium–High |
| **G7 Plausibility checks** | Add continuous validation during design (dimension limits, hardware fit); surface warnings in EngineeringBay | 2–3 days | Medium |

### Priority 3 — Technical Debt

| Item | Description | Effort | Impact |
|------|-------------|--------|--------|
| **G12 Orphaned routes** | Audit 60+ routes; wire or remove unreachable routes | 1–2 days | Low–Medium |
| **G13 Dashboard consolidation** | Consolidate 5+ dashboard variants into single canonical dashboard | 3–5 days | Medium |

### Priority 4 — Strategic (Future)

| Item | Description | Effort | Impact |
|------|-------------|--------|--------|
| **G14 Shop Floor / MES** | Barcode scanning, digital work instructions; phased approach (print packs → scanning → full MES) | 2–4 weeks | High |
| **G15 Supplier database** | Live pricing from 400+ suppliers | 4+ weeks | Strategic |
| **G16 BIM round-trip** | Revit/IFC import–export | 4+ weeks | Strategic |
| **G17 ERP integration** | Bi-directional ERP data exchange | 4+ weeks | Strategic |

---

## Recommended Execution Order (When Resumed)

1. End-to-end testing + step navigation
2. G8 U-value UI
3. G7 Plausibility checks
4. G12 Route audit
5. G13 Dashboard consolidation

---

## References

- [GAP_ANALYSIS_VERIFICATION_REPORT.md](./GAP_ANALYSIS_VERIFICATION_REPORT.md) — Verification status
- [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md) — Original phase plan
