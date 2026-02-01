# Activation Requirements Template

> **Reference:** AICS-001 v1.0.0  
> **Purpose:** Standard requirements for activating dormant components

---

## Pre-Activation Checklist

### 1. Truth Domain Assignment (AICS-001 §6.3)

- [ ] Identified canonical truth domain
- [ ] No truth duplication with existing components
- [ ] Referential integrity verified

**Truth Domain:** `[geometry|material|machine|process|certification]`

---

### 2. Tier Classification (AICS-001 §5.10.2)

- [ ] Tier 3 (Deterministic): No AI, pure logic
- [ ] Tier 2 (Advisory): IntelligenceGate wrapper required
- [ ] Tier 1 (Strategic): YDT integration required

**Selected Tier:** `[1|2|3]`

---

### 3. Validation Envelope (AICS-001 §4.4)

- [ ] Constraint categories identified
- [ ] Binary pass/fail logic implemented
- [ ] System stop conditions defined
- [ ] Constraint violation handling

**Envelope Definition File:** `[path to validation logic]`

---

### 4. Human Validation Gate (AICS-001 §3.6)

- [ ] Approval workflow defined
- [ ] Change justification required
- [ ] Audit trail connected
- [ ] Certification baseline tracking

**Gate Implementation:** `[path to validation gate]`

---

### 5. Integration Requirements

- [ ] Import path defined
- [ ] Parent component identified
- [ ] Props interface documented
- [ ] Error boundaries in place

**Target Location:** `src/components/fabricator/[category]/`

---

### 6. Review Period

- [ ] 30-day stakeholder review scheduled
- [ ] Constitutional compliance audit passed
- [ ] Integration testing complete
- [ ] Performance benchmarks acceptable

**Review Start Date:** `YYYY-MM-DD`  
**Review End Date:** `YYYY-MM-DD`

---

## Approval Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Constitutional Reviewer | | | |
| Domain Expert | | | |

---

## Post-Activation

After activation:

1. Remove from `/future/` directory
2. Update wiring manifest
3. Add to test coverage
4. Update documentation
5. Notify stakeholders
