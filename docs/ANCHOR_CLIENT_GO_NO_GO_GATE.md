# Anchor Client Pre-POC: Go/No-Go Gate Criteria
## Week 0 Decision Framework

**Document Classification:** Decision Gate  
**Authority:** Binding (Supreme Source: Pre-Phase 1 Validation)  
**Status:** Ready for Execution  
**Date:** 2026-01-01  
**Version:** 1.0

---

## Executive Summary

This document defines the Go/No-Go gate criteria for Week 0 of the 48-week roadmap. After the 8-week validation sprint (Week -8 to -1), ALMONA must make a binary decision: proceed to full Phase 1 development or fundamentally re-scope.

**The Single Question:** "Did the MVP demonstrate ≥40% time reduction in the 'Design → Cut List' process for the anchor client's Project A, with acceptable geometry accuracy?"

**If YES →** Proceed to 48-week roadmap with validated assumptions.  
**If NO →** Stop, analyze, pivot, or cancel.

**Critical Principle:** This is a data-driven gate, not a subjective judgment. All criteria are measurable and objective.

---

## Gate Decision Point

**Timeline:** Week 0 (end of 8-week validation sprint)  
**Decision Maker:** ALMONA Constitutional Guardian + CTO  
**Decision Type:** Binary (Go or No-Go)  
**Impact:** Determines whether 48-week roadmap proceeds or is fundamentally re-scoped

---

## Go Criteria (Proceed to Full Phase 1)

### All of the following must be TRUE:

#### 1. Time Savings Validation

**Criterion:** ≥40% reduction in "Design → Cut List" process

**Measurement:**
- Baseline average: [X] minutes (from Week -6)
- ALMONA average: [Y] minutes (from Week -4, -2)
- Improvement: [((X - Y) / X) × 100]%
- **Go if:** ≥40% reduction
- **No-Go if:** <40% reduction

**Evidence Required:**
- Time-motion study report (baseline + ALMONA measurements)
- Statistical analysis (3 measurements per project, averaged)
- Interruption log (excluded interruptions documented)

---

#### 2. Geometry Accuracy Validation

**Criterion:** ≥98% panel count accuracy, ≥95% mullion location accuracy

**Measurement:**
```typescript
interface AccuracyMeasurement {
  panelCount: {
    expected: number; // From client manual count
    actual: number;   // From MVP extraction
    accuracy: number; // percentage
  };
  mullionLocation: {
    expected: number; // Correct mullions
    actual: number;   // MVP-identified mullions  
    accuracy: number; // percentage
  };
}

// DECISION LOGIC
if (accuracy.panelCount.accuracy >= 98 && 
    accuracy.mullionLocation.accuracy >= 95) {
  proceed('Geometry accuracy acceptable');
} else {
  stop('Geometry extraction unreliable - fix before proceeding');
}
```

**Measurement Method:** Client validates part list against manual takeoff.

**Critical Errors:** Missing panels, wrong dimensions (>5mm error)  
**Non-critical Errors:** Minor location offsets (<10mm), extra trivial parts

**Evidence Required:**
- Client validation sheets (manual count vs MVP count)
- Accuracy calculation (panel count, mullion location)
- Error log (critical vs non-critical errors)

---

#### 3. Output Usability Validation

**Criterion:** Cut list matches client Excel template, CNC file loads on client machine

**Measurement:**
```typescript
interface UsabilityCriteria {
  cutList: {
    format: 'Matches client Excel template',
    clarity: 'Understandable by workshop team',
    accuracy: 'Matches manual calculation'
  };
  cncFile: {
    loads: 'File loads on client machine',
    runs: 'No immediate errors',
    quality: 'Requires minimal manual editing (<5 mins)'
  };
}

// DECISION LOGIC
if (usability.cutList.accuracy && usability.cncFile.loads) {
  proceed('Outputs are usable');
} else {
  review('Output issues found - may be fixable in Phase 1');
}
```

**Measurement Method:** Client workshop manager signs acceptance form.

**Show-stoppers:** CNC file won't load, cut list missing critical parts  
**Fixable Issues:** Formatting problems, extra columns, naming conventions

**Evidence Required:**
- Client sign-off form (workshop manager)
- CNC file loading test results
- Cut list comparison (MVP vs manual calculation)

---

#### 4. User Satisfaction Validation

**Criterion:** ≥4/5 average rating from 3 roles (designer, manager, operator)

**Measurement:**
- Designer survey: Average rating [X]/5
- Workshop Manager survey: Average rating [Y]/5
- CNC Operator survey: Average rating [Z]/5
- Overall average: [(X + Y + Z) / 3]/5
- **Go if:** ≥4/5 average
- **No-Go if:** <4/5 average

**Evidence Required:**
- User satisfaction surveys (3 roles)
- Average rating calculation
- Qualitative feedback (comments)

---

#### 5. Constitutional Compliance Validation

**Criterion:** 100% compliance (no boundary violations)

**Measurement:**
- Constitutional test suite: All tests pass
- Code review: No prohibited terminology
- Client confirmation: System did not attempt structural analysis
- **Go if:** 100% compliance
- **No-Go if:** Any boundary violation

**Evidence Required:**
- Constitutional test results
- Code review report
- Client written confirmation (constitutional boundary validation)

---

### Go Decision Matrix

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| **Time Savings** | ≥40% | [%] | ✅ Go / ⚠️ Review (30-39%) / ❌ Stop (<30%) |
| **Geometry Accuracy** | ≥98% panels, ≥95% mullions | [%] | ✅ Go / ❌ No-Go |
| **Output Usability** | Files load, cut list accurate | [Yes/No] | ✅ Go / ⚠️ Review |
| **User Satisfaction** | ≥4/5 | [Rating] | ✅ Go / ❌ No-Go |
| **Constitutional Compliance** | 100% | [%] | ✅ Go / ❌ Abort |

**Go Decision:** ✅ Proceed if ALL criteria are met  
**Review Decision:** ⚠️ 2-week analysis if borderline (30-39% time savings)  
**Stop Decision:** ❌ Re-scope if <30% time savings or critical failure  
**Abort Decision:** ❌ Stop immediately if constitutional violation or geometry <95%

---

## No-Go Criteria (Re-scope Phase 1)

### If ANY of the following is TRUE:

#### 1. Time Savings <40%

**Root Cause Analysis Required:**
- Why did time savings fall short?
- Was it MVP limitations or fundamental architecture issue?
- Can it be fixed with iteration, or requires re-scope?

**Re-scope Options:**
- **Option A:** Extend validation sprint (2-4 more weeks)
- **Option B:** Re-scope Phase 1 (different approach)
- **Option C:** Delay Phase 1 (major architecture changes needed)

---

#### 2. Geometry Accuracy >2%

**Root Cause Analysis Required:**
- Why did accuracy fall short?
- Was it Revit import issue or geometry extraction issue?
- Can it be fixed with iteration, or requires re-scope?

**Re-scope Options:**
- **Option A:** Improve Revit importer (if import issue)
- **Option B:** Improve geometry extraction (if extraction issue)
- **Option C:** Accept higher variance for MVP (if acceptable to client)

---

#### 3. CNC Integration Fails

**Root Cause Analysis Required:**
- Why did CNC export fail?
- Was it format issue or machine compatibility issue?
- Can it be fixed with iteration, or requires re-scope?

**Re-scope Options:**
- **Option A:** Fix export format (if format issue)
- **Option B:** Support different machine brand (if compatibility issue)
- **Option C:** Defer CNC export to Phase 1 (if fundamental issue)

---

#### 4. User Satisfaction <4/5

**Root Cause Analysis Required:**
- Why did satisfaction fall short?
- Was it UI issue or workflow issue?
- Can it be fixed with iteration, or requires re-scope?

**Re-scope Options:**
- **Option A:** Improve UI (if UI issue)
- **Option B:** Improve workflow (if workflow issue)
- **Option C:** Accept lower satisfaction for MVP (if acceptable)

---

#### 5. Constitutional Compliance Violation

**Root Cause Analysis Required:**
- What boundary was violated?
- Was it accidental or intentional?
- Can it be fixed immediately, or requires re-scope?

**Re-scope Options:**
- **Option A:** Fix violation immediately (if accidental)
- **Option B:** Re-scope feature (if intentional)
- **Option C:** Remove feature (if cannot be fixed)

---

## Decision Scenarios

### Scenario 1: GO (All Green)

```
✅ Time reduction: ≥40%
✅ Geometry accuracy: ≥98% panels, ≥95% mullions
✅ Output usability: Client signed off
✅ Constitutional: No violations
✅ Client commitment: Signed agreement

DECISION: GO
CONFIDENCE: High (80-85%)
ACTION: Proceed to 48-week roadmap with validated client
```

### Scenario 2: REVIEW (Yellow Flags)

```
⚠️ Time reduction: 30-39% (close but below target)
✅ Geometry accuracy: ≥98% panels, ≥95% mullions
✅ Output usability: Client signed off  
✅ Constitutional: No violations
✅ Client commitment: Signed agreement

DECISION: REVIEW (2-week analysis)
CONFIDENCE: Medium (60-70%)
ACTION: Investigate time gap. If fixable in <2 weeks, proceed.
```

### Scenario 3: STOP (Red Flags)

```
❌ Time reduction: <30% (insufficient)
✅ Geometry accuracy: ≥98% panels, ≥95% mullions
✅ Output usability: Client signed off
✅ Constitutional: No violations  
✅ Client commitment: Signed agreement

DECISION: STOP
CONFIDENCE: Low (<50%)
ACTION: Pivot strategy. Options:
1. Target different client type
2. Simplify MVP further
3. Reconsider market fit
```

### Scenario 4: ABORT (Critical Failure)

```
❌ Time reduction: Any
❌ Geometry accuracy: <95% (unreliable)
❌ Output usability: CNC won't load
⚠️ Constitutional: Violations found
✅ Client commitment: Signed agreement

DECISION: ABORT  
CONFIDENCE: Very low (<30%)
ACTION: Stop immediately. Fundamental technical or constitutional issue.
```

---

## Decision Process

### Week 7: Dry Run (Internal)

```bash
# Internal testing
npm run test:mvp-with-sample-projects

# Expected results:
# - All 3 sample projects process successfully
# - Time targets met (<2 min processing)
# - Output files generated correctly
```

### Week 8: Client Validation Week

```bash
# Monday: Install MVP at client site
# Tuesday: Measure Project A (3 times)
# Wednesday: Measure Project B (2 times)  
# Thursday: Measure Project C (2 times)
# Friday: Decision meeting with client
```

### Decision Meeting Agenda (Friday, Week 8)

```markdown
# ALMONA MVP GO/NO-GO DECISION MEETING

**Date:** [Week 8 Friday]
**Attendees:**
- Client: Technical Lead, Workshop Manager
- ALMONA: Constitutional Guardian, CTO, Lead Engineer

**Agenda:**
1. Time-motion study results (5 min)
2. Accuracy validation results (5 min)  
3. Output usability feedback (5 min)
4. Constitutional compliance check (5 min)
5. Client commitment confirmation (5 min)
6. GO/NO-GO decision (5 min)

**Documents Required:**
- Signed time-motion study results
- Accuracy validation sheets
- Client sign-off forms
- Constitutional compliance report
```

---

## Go Decision: Next Steps

### If Go Decision (All Criteria Met)

**Week 0 Actions:**
1. **Finalize Anchor Client POC Agreement** → Full Phase 1 commitment
2. **Incorporate Validated Learnings** → Update Phase 1 plan
3. **Set Phase 1 Timeline** → Week 5-16 (12 weeks)
4. **Kickoff Phase 1** → Begin full development

**Phase 1 Scope (Updated):**
- Multi-system pack support (validated single pack works)
- ArchiCAD import (validated Revit import works)
- Advanced optimization (validated basic pipeline works)
- 3D PDF generation (validated cut list generation works)

**Client Benefits:**
- First-mover pricing for Phase 2
- Reference client status
- Priority support and early access

---

## No-Go Decision: Next Steps

### If No-Go Decision (Any Criterion Not Met)

**Week 0 Actions:**
1. **Diagnostic Review** → Identify root causes
2. **Re-scope Phase 1** → Fundamental changes
3. **Client Communication** → Explain decision and next steps
4. **Revised Timeline** → Delay Phase 1 or extend validation

**Re-scope Options:**

**Option A: Extend Validation Sprint**
- Add 2-4 weeks to fix identified issues
- Re-test with updated MVP
- Make Go/No-Go decision again

**Option B: Re-scope Phase 1**
- Change approach (different architecture)
- Reduce scope (fewer features)
- Different timeline (longer development)

**Option C: Delay Phase 1**
- Major architecture changes needed
- Delay until architecture ready
- Client has no obligation to wait

**Client Options:**
- Exit with no obligation (1 week notice)
- Continue with extended validation (if Option A)
- Wait for re-scoped Phase 1 (if Option B or C)

---

## Decision Documentation

### Go Decision Document Template

```markdown
# ANCHOR CLIENT PRE-POC: GO DECISION

**Date:** [Week 0 Date]
**Decision:** ✅ GO - Proceed to Full Phase 1

**Criteria Validation:**

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Time Savings | ≥40% | [X]% | ✅ Met |
| Geometry Accuracy | ≤2% | [Y]% | ✅ Met |
| CNC Integration | Files load | Yes | ✅ Met |
| User Satisfaction | ≥4/5 | [Z]/5 | ✅ Met |
| Constitutional Compliance | 100% | 100% | ✅ Met |

**Rationale:**
All criteria met. Core hypothesis validated. Proceed to full Phase 1 development.

**Next Steps:**
1. Finalize Anchor Client POC Agreement
2. Incorporate validated learnings into Phase 1 plan
3. Kickoff Phase 1 (Week 5-16)

**Signatures:**

___________________________
[ALMONA Constitutional Guardian]
[Date]

___________________________
[ALMONA CTO]
[Date]
```

### No-Go Decision Document Template

```markdown
# ANCHOR CLIENT PRE-POC: NO-GO DECISION

**Date:** [Week 0 Date]
**Decision:** ❌ NO-GO - Re-scope Phase 1

**Criteria Validation:**

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Time Savings | ≥40% | [X]% | ❌ Not Met |
| Geometry Accuracy | ≤2% | [Y]% | ✅/❌ |
| CNC Integration | Files load | Yes/No | ✅/❌ |
| User Satisfaction | ≥4/5 | [Z]/5 | ✅/❌ |
| Constitutional Compliance | 100% | 100% | ✅/❌ |

**Root Cause Analysis:**
[Detailed analysis of why criteria not met]

**Re-scope Plan:**
[Option A/B/C selected, with rationale]

**Next Steps:**
1. [Re-scope actions]
2. [Client communication]
3. [Revised timeline]

**Signatures:**

___________________________
[ALMONA Constitutional Guardian]
[Date]

___________________________
[ALMONA CTO]
[Date]
```

---

## Risk Mitigation

### Risk 1: Borderline Results (39% time savings)

**Mitigation:**
- Statistical analysis (confidence intervals)
- Consider measurement variance (3 measurements)
- Client feedback (qualitative validation)
- Decision: Go if borderline + client positive feedback

### Risk 2: One Criterion Fails, Others Pass

**Mitigation:**
- Root cause analysis (can it be fixed quickly?)
- Client feedback (is failure acceptable?)
- Re-scope option (can Phase 1 address it?)
- Decision: No-Go if fundamental issue, Go if fixable

### Risk 3: Client Wants to Proceed Despite No-Go

**Mitigation:**
- ALMONA has final decision authority (data-driven gate)
- Explain risks of proceeding without validation
- Offer extended validation (if fixable)
- Decision: No-Go if fundamental issue, regardless of client preference

---

## Success Metrics

### Go Decision Success

**If Go Decision Made:**

- ✅ Phase 1 begins with validated, de-risked plan
- ✅ Client committed to full POC (anchor client status)
- ✅ Core hypothesis proven (≥40% time savings)
- ✅ Market fit validated (real production conditions)

### No-Go Decision Success

**If No-Go Decision Made:**

- ✅ Phase 1 re-scoped before major investment
- ✅ Root causes identified and addressed
- ✅ Client protected (no obligation to proceed)
- ✅ ALMONA protected (no wasted investment)

**Both outcomes are success—the gate prevents bad investments.**

---

## Final Go/No-Go Checklist

### MUST HAVE (All Required for GO)

- [ ] Time reduction ≥40% (Project A, Design → Cut List)
- [ ] Geometry accuracy ≥98% (panel count)
- [ ] Mullion location accuracy ≥95%
- [ ] CNC file loads on client machine
- [ ] Zero constitutional violations
- [ ] Client signed Pre-POC agreement
- [ ] 3 real projects measured

### NICE TO HAVE (Not Required, But Encouraged)

- [ ] Time reduction ≥50% (exceeds target)
- [ ] Client enthusiasm for Phase 2 features
- [ ] Multiple client team members positive
- [ ] Material waste reduction demonstrated
- [ ] Human touches count (secondary metric for context)

### SHOW-STOPPERS (Any = NO GO)

- [ ] Time reduction <30%
- [ ] Geometry accuracy <95%
- [ ] Constitutional violations found
- [ ] Client backing out of commitment
- [ ] CNC file requires >15 min manual editing

---

## The Single Metric That Decides Everything

**DESIGN → CUT LIST TIME (Project A)**

```
Baseline: [X] minutes (client current process)
MVP: [Y] minutes (ALMONA MVP)
Improvement: [((X - Y) / X) * 100]%

DECISION:
≥40% → GO
30-39% → REVIEW  
<30% → STOP
```

**Everything else validates the approach, but this metric validates the business case.**

---

## Why This Gate Matters More Than Anything Else

### The Business Reality

**WITHOUT THIS GATE:**
- Build 12-month roadmap
- Hope it works for clients
- Risk: $4.2M spent, no market fit
- Result: Beautiful software, no customers

**WITH THIS GATE:**
- Spend 8 weeks, 3 engineers
- Prove market fit with real client
- Risk: 8 weeks, 0.5% of budget
- Result: Validated assumptions or early pivot

### The Technical Reality

The MVP tests your hardest technical assumptions:

- Can you parse Revit curtain walls accurately?
- Can you apply system rules deterministically?
- Can you generate machine-ready outputs?

**If these fail at MVP scale, they'll fail at full scale.**

### The Constitutional Reality

If you violate constitutional boundaries in the MVP (e.g., accidentally do "analysis"), your entire governance model is flawed. Better to discover this with 3 engineers than with 14.

---

## Conclusion

This Go/No-Go gate is the **final validation checkpoint** before committing to the full 48-week roadmap. It ensures:

1. **Data-Driven Decision** → Objective criteria, not subjective judgment
2. **Risk Mitigation** → Re-scope before major investment
3. **Client Protection** → No obligation if validation fails
4. **ALMONA Protection** → No wasted investment on invalidated assumptions

**The gate transforms "hope" into "proof" before $4.2M investment.**

**The 8-week MVP sprint is your cheapest insurance policy. It costs 8 weeks to potentially save 48 weeks of wrong direction.**

**The Validation MVP proves your technical hypothesis. The Go/No-Go Gate protects your business investment. Together, they transform your 48-week roadmap from a "hopeful plan" into a "de-risked execution."**

---

**Document Status:** ✅ Ready for Week 0 Decision  
**Next Review:** Week 0 (Decision Point)  
**Authority:** Binding Decision Gate

