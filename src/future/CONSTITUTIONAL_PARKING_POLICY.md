# AICS-001 §8.5 Institutional Knowledge Preservation Policy

> **Authority:** AICS-001 v1.0.0 - Almona Industrial Computing Specification  
> **Status:** ACTIVE  
> **Last Updated:** 2026-01-18

---

## Purpose

This directory preserves **dormant capabilities** under constitutional governance. Components here represent institutional knowledge that:

- Has suspended execution authority
- Contains valuable implementation logic
- May be activated through formal review
- Must never be silently deleted

---

## Status Definitions

| Status | Meaning | Imports Allowed |
|--------|---------|----------------|
| **DORMANT** | No execution authority, preserved logic | ❌ None |
| **EXPERIMENTAL** | Active development, not production-ready | ⚠️ Dev only |
| **PENDING_ACTIVATION** | Under review for production | ⚠️ Staging only |
| **ARCHIVED** | Historical reference only | ❌ None |

---

## Activation Requirements (AICS-001 §5.5)

Before any component can leave `/future/`:

1. **Truth Domain Assignment** (§6.3)
   - Must belong to: Geometry, Material, Machine, Process, or Certification
   - Canonical source must be identified

2. **Tier Classification** (§5.10.2)
   - Tier 3: Deterministic only, no AI
   - Tier 2: Advisory, IntelligenceGate required
   - Tier 1: Strategic, YDT required

3. **Validation Envelope** (§4.4)
   - Constraint enforcement defined
   - Binary pass/fail logic implemented
   - System stop conditions documented

4. **Human Validation Gate** (§3.6)
   - Approval workflow defined
   - Change justification logging
   - Audit trail hookup

5. **30-Day Review Period**
   - Stakeholder notification
   - Constitutional compliance audit
   - Integration testing complete

---

## Auto-Expiration Policy

| Age | Action |
|-----|--------|
| >365 days without review | Archival flag added |
| >730 days | Documentation-only status |
| **NEVER** | Automatic deletion |

---

## Directory Structure

```
/future/
├── material-labs/        # Material Truth experiments
├── wizard-engine/        # Process Truth experiments  
├── ui-experiments/       # Presentation layer experiments
├── special-designers/    # Geometry Truth experiments
├── template-library/     # Pattern/template experiments
├── visualization-experiments/  # Derived visualization
└── advisory-panels/      # Tier 2 advisory components
```

---

## Constitutional References

- **§3.6**: Pre-execution validation
- **§4.4**: Constraint enforcement model
- **§5.5**: Intelligence containment zones
- **§5.10.2**: Three-tier decision architecture
- **§6.3**: Domains of truth
- **§7.4**: Audit trail requirements
- **§8.5**: Institutional knowledge preservation
