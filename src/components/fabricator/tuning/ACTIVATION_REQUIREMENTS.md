# Material Labs - Activation Requirements

> **Status:** DORMANT  
> **Truth Domain:** Material Truth (AICS-001 §6.3.2)  
> **Last Updated:** 2026-01-18

---

## Components Preserved

| File | Size | Purpose | Activation Priority |
|------|------|---------|---------------------|
| `ProfileTuningStudio.tsx` | 130KB | Material configuration interface | HIGH |
| `ProfileStudioLite.tsx` | 44KB | Lightweight profile editor | MEDIUM |

---

## ProfileTuningStudio.tsx Activation Pathway

### Constitutional Barrier: AICS-001 §6.3.2 Material Truth Canon Required

This component contains 130KB of material configuration logic that allows modification of:
- Physical material properties
- Tolerance specifications
- Cutting allowances
- Supplier specifications

**Why Dormant:** These modifications affect Material Truth, which requires deterministic validation before any changes can propagate to execution paths.

### Required Before Activation

#### 1. ✅ Material Truth Canon v1.0 (AICS-001 §6.3.2)

- [ ] Supplier specifications database schema
- [ ] Physical property registry (density, expansion coefficients)
- [ ] Tolerance tables by region/supplier
- [ ] Immutable baseline versions

#### 2. ✅ Deterministic Adapter (AICS-001 §5.5)

```typescript
// Required wrapper for all material modifications
class MaterialTuningAdapter {
  validateChange(oldValue, newValue, property): ValidationResult {
    // Must enforce:
    // - Property within physical limits
    // - Tolerance within certified range
    // - No cascade to active production jobs
  }
  
  detectDrift(baseline, current): DriftReport {
    // Deviation from certified baseline
  }
  
  systemStop(violation): never {
    // Halt on constraint violation
  }
}
```

#### 3. ✅ Human Validation Gate (AICS-001 §3.6)

- [ ] Material engineer approval workflow
- [ ] Change justification logging (reason required)
- [ ] Certification baseline tracking
- [ ] Audit trail hookup to constitutional system

#### 4. ✅ Integration Path

**Target Location:** `src/components/fabricator/profile/ProfileTuningStudio.tsx`

**Parent Component:** `ProfileManagement.tsx`

**Entry Points:**
- Settings → Profile Configuration
- EngineeringBay → Advanced Profile Mode

---

## ProfileStudioLite.tsx Activation Pathway

### Constitutional Barrier: May duplicate ProfileManagement functionality

**Analysis Required:**
1. Compare with existing `ProfileManagement.tsx` (109KB)
2. Determine if functionality is additive or duplicate
3. If duplicate: Archive permanently
4. If additive: Define scope boundary

### Decision Pending

| Option | Action |
|--------|--------|
| A: Duplicate | Archive to `/future/archived/` |
| B: Additive | Define scope, proceed with activation |
| C: Merge | Incorporate unique logic into ProfileManagement |

---

## Review Schedule

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Initial Assessment | 2026-02-01 | ⏳ |
| Truth Canon Design | 2026-02-15 | ⏳ |
| Adapter Implementation | 2026-03-01 | ⏳ |
| 30-Day Review Period | 2026-03-15 | ⏳ |
| Activation Decision | 2026-04-15 | ⏳ |

---

## Institutional Value

These components represent **~174KB of institutional knowledge** covering:
- Material property management
- Profile customization workflows
- Supplier integration patterns
- Tolerance configuration UX

**Preservation ensures:** Zero knowledge loss while maintaining constitutional compliance.
