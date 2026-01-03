# Anchor Client POC: Acceptance Criteria (Contractual)

**Document Classification:** Commercial Gate  
**Authority:** Binding (Supreme Source: Phase 1 Exit Gates)  
**Status:** Non-negotiable  
**Date:** 2026-01-01  
**Version:** 1.0

---

## Executive Summary

Phase 1 cannot close without a signed Anchor Client Acceptance Certificate. This is not a milestone—it is a gate. The client must validate that the BIM → Fabrication pipeline works on 3 real projects under production conditions.

---

## 1. Anchor Client Definition

### Who Qualifies

- ✅ Operating curtain wall/facade workshop in Egypt/MENA
- ✅ Currently using Orgadata, Klaes, or manual processes
- ✅ Willing to commit senior technical lead (8+ hours/week)
- ✅ Has 3+ real projects queued for 2026 Q2

### Who Does NOT Qualify

- ❌ Internal team (doesn't validate market fit)
- ❌ Consultant (no production pressure)
- ❌ "Friendly" workshop without real backlog

---

## 2. Three Project Requirements

The client must run three distinct project types through the pipeline:

| Project | Type | Minimum Complexity | Success Criteria |
|---------|------|-------------------|------------------|
| **Project A** | Unitized Curtain Wall | 50+ panels, 2+ floor heights | ✅ Cut list matches manual calculation within 0.5% |
| **Project B** | Stick System Facade | Mixed opening types (window, door, fixed) | ✅ BOM matches existing software output |
| **Project C** | Complex Skylight | Curved geometry, drainage rules | ✅ CNC instructions load without errors on their machine |

**Critical Constraint:** All three projects must be real client work with contractual deadlines—not internal tests.

---

## 3. Technical Acceptance Tests

The client's technical lead must sign off on:

### 3.1 Geometry Truth Accuracy

```sql
-- In their production database:
SELECT 
  'Manual calculation' as source,
  sum(material_length) as total_meters,
  count(parts) as total_parts
FROM existing_system_outputs
WHERE project_id = 'actual_client_project'

UNION ALL

SELECT 
  'ALMONA output',
  sum(length),
  count(*)
FROM almona_cut_lists
WHERE project_id = 'same_actual_client_project'

-- Acceptance: ≤0.5% variance in total_meters
```

### 3.2 Production Workflow Integration

- **File Import:** Their Revit file → ALMONA in < 3 minutes
- **System Selection:** Choose correct system pack (Caluminium PS, etc.)
- **Constraint Validation:** No "impossible geometry" passes through
- **Cut List Generation:** Output matches workshop expectations
- **CNC Export:** File loads on their machine without manual editing
- **BOM Export:** Purchasing department can order from it

### 3.3 Constitutional Boundary Validation

The client must confirm in writing:

> "The system did not attempt to perform engineering analysis, structural calculation, or code compliance certification. All outputs were clearly labeled as manufacturable instructions based on declared constraints."

---

## 4. Business Acceptance Criteria

### 4.1 Time Savings Measurement

| Metric | Current Process | ALMONA Process | Minimum Improvement |
|--------|----------------|----------------|---------------------|
| Design → Cut List | [Client fills] | [Client fills] | **40% reduction** |
| Error Correction | [Client fills] | [Client fills] | **60% reduction** |
| CNC Preparation | [Client fills] | [Client fills] | **30% reduction** |

**Measurement Method:** Time-motion study by client's production manager.

### 4.2 Material Optimization

> "For Project A, ALMONA's nesting suggested a layout that used [X]% less waste than our current manual process."

**Acceptance:** Client provides before/after material usage sheets.

### 4.3 User Experience Feedback

From three distinct roles:

- **Designer:** "I could validate manufacturability before sending to workshop"
- **Workshop Manager:** "The cut list was clear and machine-ready"
- **CNC Operator:** "The G-code loaded without manual fixes"

---

## 5. Non-Negotiable Exclusions

The POC does not require:

- ❌ Integration with their ERP (Phase 3)
- ❌ Automated purchasing (Phase 3)
- ❌ Client-facing portals (Phase 2)
- ❌ Multi-tenant features (Phase 3)
- ❌ Custom reporting (Phase 2)

This keeps Phase 1 focused: **BIM → Geometry → Constraints → Cut List → CNC**.

---

## 6. Acceptance Certificate Template

```markdown
# ALMONA PHASE 1 ANCHOR CLIENT ACCEPTANCE CERTIFICATE

**Client:** [Company Name]
**Technical Lead:** [Name, Title]
**Date:** [Date]

**Project Validation:**
- [ ] Project A (Unitized Curtain Wall): PASS
- [ ] Project B (Stick System Facade): PASS  
- [ ] Project C (Complex Skylight): PASS

**Technical Sign-off:**
- Geometry accuracy: ≤0.5% variance from manual calculation
- Production workflow: No blocking issues
- CNC integration: Files loaded without manual editing
- Constitutional boundaries: Respected throughout

**Business Validation:**
- Time savings: ≥40% reduction design → cut list
- Material optimization: Demonstrated waste reduction
- User feedback: Positive from all three roles

**Commitment to Phase 2:**
- [ ] Will participate in Phase 2 beta (Enterprise Configurator)
- [ ] Will provide 2+ additional projects for Phase 2 validation
- [ ] Will serve as reference client for Egypt/MENA market

**Signatures:**

___________________________
[Client Technical Lead]
[Date]

___________________________
[ALMONA Constitutional Guardian]
[Date]

___________________________
[ALMONA CTO]
[Date]
```

---

## 7. Failure Conditions & Mitigation

### If Client Rejects

- **Week 17-18:** Diagnostic review with Constitutional Guardian
- **Week 19-20:** Targeted fixes based on rejection reasons
- **Week 21:** Second client evaluation
- **Week 22:** If still rejected, Phase 1 scope reduction and replan

### Acceptable Rejection Reasons

- Geometry accuracy > 2% variance
- Workflow takes longer than current process
- Critical feature missing for their projects

### Unacceptable Rejection Reasons

- "Wanted full ERP integration" (out of scope)
- "Expected structural analysis" (constitutionally prohibited)
- "UI needs complete redesign" (aesthetic preference)

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Acceptance Rate | 100% | Client signs certificate |
| Geometry Accuracy | ≤0.5% variance | Database comparison |
| Time Savings | ≥40% | Time-motion study |
| User Satisfaction | ≥4/5 | Survey (designer, manager, operator) |
| Constitutional Compliance | 100% | No boundary violations in POC |

---

## 9. Why This Gate Matters More Than Any Feature

1. **Market Reality Check:** Forces validation against real projects
2. **De-risks Assumptions:** Curtain wall logic tested before Phase 2 complexity
3. **Creates Reference Client:** Essential for Egypt/MENA expansion
4. **Validates Constitutional Model:** Proves authority boundaries work in production
5. **Prevents Feature Creep:** "But the client needs..." must pass this gate first

---

## 10. Next Steps After Acceptance

- **Week 13:** Begin Phase 2 (Enterprise Configurator)
- **Week 14:** Onboard anchor client to beta program
- **Week 15:** Start sales enablement with client case study
- **Week 16:** Board update with validated market fit

---

## Immediate Action Required

Before Week 1 of Phase 1:

1. Identify 3-5 potential anchor clients
2. Share this document with them
3. Secure signed commitment from at least one
4. Begin legal review of acceptance certificate

### Success Probability Impact

- **Without this gate:** 65-75%
- **With this gate enforced:** 80-85%
- **With anchor client secured by Week 16:** 85-90%

---

## Conclusion

This document transforms "client feedback" from a vague concept into a contractual, measurable gate. It ensures you build what the market needs, not what engineers find interesting.

**The Anchor Client POC is your reality check before $4.2M investment. It's the single most important document in your roadmap—more important than any technical specification.**

---

**Document Status:** ✅ Ready for Legal Review  
**Next Review Date:** Week 16 (Post-Acceptance)

