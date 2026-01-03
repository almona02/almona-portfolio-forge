# Week 1 Testing Protocol - Constitutional Verification

**Time Required:** 30-45 minutes  
**Purpose:** Verify Tier 1 governance is operational before certification

---

## 🎯 TEST SEQUENCE (Execute in Order)

### ✅ Test 1: Pricing Flow (5 minutes)

**Objective:** Verify pricing uses IntelligenceGate and tracks metrics

**Steps:**
1. Navigate to project creation page
2. Create a test project:
   - Type: Residential
   - Location: Cairo
   - Material: Aluminum
   - Dimensions: 1000mm x 2000mm
3. Submit project
4. Check browser console for:
   ```
   [IntelligenceGate] Tier 1: pricing_decision (strategic)
   [TierMetrics] Recorded Tier 1 decision
   [YDT] Response includes reasoning: "Pricing set because..."
   ```

**Expected Results:**
- ✅ Pricing calculation succeeds
- ✅ Reasoning is present in response
- ✅ Dashboard shows "Decisions Today" incremented
- ✅ Constitutional Health remains 100
- ✅ No errors in console

**Validation:**
```bash
# Check admin dashboard
# Expected: Decisions Today: 1+ (was 0)
# Expected: Constitutional Health: 100/100
```

---

### ✅ Test 2: Viability Rejection Case (10 minutes)

**Objective:** Verify viability check provides reasoning even for rejections

**Steps:**
1. Create an intentionally bad project:
   - Type: Residential
   - Location: Cairo
   - Material: Aluminum
   - **Very low price** (e.g., EGP 100 for large project)
   - **Very high cost** (e.g., EGP 10,000)
2. Submit project
3. Check console for:
   ```
   [IntelligenceGate] Tier 1: business_viability_check (strategic)
   [IntelligenceGate] Tier 1: market_validation (strategic)
   [TierMetrics] Recorded Tier 1 decision
   [YDT] Response includes reasoning
   ```

**Expected Results:**
- ✅ Viability check executes (may reject project)
- ✅ Reasoning explains why (e.g., "Profit margin too low")
- ✅ Change triggers are present (e.g., "Would change if material costs drop")
- ✅ Dashboard metrics update correctly
- ✅ No tier violations

**Validation:**
```bash
# Check admin dashboard
# Expected: Decisions Today: 3+ (was 1)
# Expected: Tier 1 Coverage: 100%
# Expected: Reasoning Quality: 100%
```

---

### ✅ Test 3: Optimization Strategy Variation (10 minutes)

**Objective:** Verify strategy changes with context and reasoning updates

**Steps:**
1. Go to Fabricator Pro or optimization page
2. Create optimization job with:
   - Location: Cairo
   - Season: Winter
   - Material: Aluminum
3. Trigger strategy selection
4. Check console for:
   ```
   [IntelligenceGate] Tier 1: optimization_strategy_selection (strategic)
   [TierMetrics] Recorded Tier 1 decision
   [YDT] Strategy: remnant-first (or speed-first)
   [YDT] Reasoning: "Optimization strategy set to..."
   ```

**Expected Results:**
- ✅ Strategy is selected (remnant-first or speed-first)
- ✅ Reasoning explains choice (e.g., "Aluminum prices rising 15%")
- ✅ Reasoning includes change triggers
- ✅ Dashboard shows Tier 1 decision count increased
- ✅ No Tier 3 metrics change (strategy is Tier 1, not Tier 3)

**Variation Test:**
- Change location to "Alexandria"
- Change season to "Summer"
- Verify strategy may change and reasoning updates

**Validation:**
```bash
# Check admin dashboard
# Expected: Decisions Today: 4+ (was 3)
# Expected: Tier 1 Coverage: Still 100%
# Expected: No Tier 3 decisions from this test
```

---

### ✅ Test 4: Negative Test - Deterministic Operation (5 minutes)

**Objective:** Verify deterministic operations do NOT call YDT

**Steps:**
1. Open browser console
2. Run this test code:
   ```javascript
   // Import IntelligenceGate (if available in browser)
   // Or use a simple math operation that should NOT call YDT
   
   // Test: Calculate area (deterministic)
   const width = 1000;
   const height = 2000;
   const area = width * height; // Should be 2,000,000
   
   console.log('Area:', area);
   console.log('No YDT call should occur');
   ```
3. Check console for:
   - ✅ No YDT API calls
   - ✅ No IntelligenceGate.strategic() calls
   - ✅ Simple calculation completes instantly

**Expected Results:**
- ✅ Calculation succeeds (2,000,000)
- ✅ No YDT calls in network tab
- ✅ No Tier 1 decisions recorded
- ✅ Tier 3 purity stays at 100%
- ✅ No violations logged

**Alternative Test (If you have access to IntelligenceGate in browser):**
```typescript
// This should work if IntelligenceGate is exposed
const result = IntelligenceGate.deterministic(
  'test_calculation',
  () => 1000 * 2000
);
// Should return 2,000,000 with no YDT call
```

**Validation:**
```bash
# Check admin dashboard
# Expected: Tier 3 Decisions: 1+ (if deterministic was tracked)
# Expected: Tier Violations: Still 0
# Expected: Constitutional Health: Still 100
```

---

## 📊 VALIDATION CHECKLIST

After all 4 tests, verify:

### Dashboard Metrics
- [ ] Constitutional Health: **100/100** (green)
- [ ] Tier 1 Coverage: **100%**
- [ ] Reasoning Quality: **100%**
- [ ] Tier Violations: **0**
- [ ] Decisions Today: **4+** (incremented from tests)

### Console Logs
- [ ] No errors in console
- [ ] IntelligenceGate calls logged correctly
- [ ] TierMetrics updates visible
- [ ] YDT reasoning present in responses

### Network Tab
- [ ] YDT API calls only for Tier 1 operations
- [ ] No YDT calls for deterministic operations
- [ ] Response times reasonable (<500ms)

---

## 🎯 SUCCESS CRITERIA

**All 4 tests pass if:**
- ✅ Pricing flow works with reasoning
- ✅ Viability check works with reasoning
- ✅ Strategy selection works with reasoning
- ✅ Deterministic operations do NOT call YDT
- ✅ Dashboard shows 100% Constitutional Health
- ✅ Zero tier violations detected

**If all criteria met:**
→ **Tier 1 is officially certified**  
→ Proceed to Week 1 documentation

**If any criteria fail:**
→ Review error logs
→ Check IntelligenceGate implementation
→ Verify TierMetrics tracking
→ Fix issues before proceeding

---

## 🚨 TROUBLESHOOTING

### Issue: Dashboard shows 0 decisions
**Solution:**
- Refresh admin dashboard
- Check TierMetrics is recording correctly
- Verify IntelligenceGate is calling TierMetrics.recordTier1Decision()

### Issue: Reasoning missing in responses
**Solution:**
- Check YDTCoreService methods return reasoning
- Verify IntelligenceGate validates reasoning
- Check YDTIntelligenceResponse interface includes reasoning

### Issue: Tier violations detected
**Solution:**
- Check console for violation details
- Verify no YDT calls in deterministic operations
- Review IntelligenceGate.deterministic() implementation

### Issue: Constitutional Health < 100
**Solution:**
- Check missing reasoning count
- Check low quality reasoning count
- Check tier violation count
- Review TierMetrics calculation

---

## 📝 TEST RESULTS TEMPLATE

```markdown
## Week 1 Governance Test Results

**Date:** [Date]
**Tester:** [Name]
**Duration:** [Time]

### Test 1: Pricing Flow
- [ ] Pass / [ ] Fail
- Notes: [Any observations]

### Test 2: Viability Rejection
- [ ] Pass / [ ] Fail
- Notes: [Any observations]

### Test 3: Optimization Strategy
- [ ] Pass / [ ] Fail
- Notes: [Any observations]

### Test 4: Deterministic Operation
- [ ] Pass / [ ] Fail
- Notes: [Any observations]

### Final Metrics
- Constitutional Health: [Score]/100
- Tier 1 Coverage: [Percentage]%
- Tier Violations: [Count]
- Decisions Today: [Count]

### Certification
- [ ] All tests passed - Tier 1 certified
- [ ] Some tests failed - Review required
```

---

## ✅ NEXT STEP AFTER TESTS

**If all tests pass:**
1. Document results in `WEEK1_TEST_RESULTS.md`
2. Review `WEEK1_CONSTITUTIONAL_BASELINE.md`
3. Proceed to Week 1 completion documentation

**If any tests fail:**
1. Document failures in `WEEK1_TEST_RESULTS.md`
2. Fix issues identified
3. Re-run failed tests
4. Proceed only when all tests pass

---

**"Verification before certification. Testing before celebrating."**

