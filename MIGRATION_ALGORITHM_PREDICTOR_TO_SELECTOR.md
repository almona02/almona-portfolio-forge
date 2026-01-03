# AlgorithmPredictor → AlgorithmSelector Migration Guide

**Date:** January 2026  
**Purpose:** Remove AI deception, restore constitutional integrity  
**Timeline:** Week 1 (IMMEDIATE)

---

## The Problem

`AlgorithmPredictor.ts` claims "ML-based prediction" but uses simple weighted scoring. This violates constitutional guarantees and creates trust risk.

---

## The Solution

**Path 1: Integrity Path (RECOMMENDED for Week 1)**

Rename and reframe as `AlgorithmSelector.ts` - honest rule-based selection.

---

## Migration Steps

### Step 1: Create New File

✅ **DONE:** `src/lib/fabricator/AlgorithmSelector.ts` created

### Step 2: Update All Imports

**Find and replace:**
```typescript
// OLD
import { algorithmPredictor } from '@/lib/ml/AlgorithmPredictor';
const prediction = await algorithmPredictor.predict(complexity);

// NEW
import { algorithmSelector } from '@/lib/fabricator/AlgorithmSelector';
const selection = algorithmSelector.selectByRule(complexity);
```

**Files to update:**
- `src/algorithms/adaptiveSolver.ts`
- `src/lib/fabricator/OptimizationEngine.ts`
- Any other files importing AlgorithmPredictor

### Step 3: Update All Documentation

**Find and replace:**
- "ML-based prediction" → "Rule-based selection"
- "predict" → "select"
- "prediction" → "selection"
- "confidence" → "rationale" (if needed)

**Files to update:**
- README.md
- Technical documentation
- API documentation
- User-facing documentation

### Step 4: Remove Old File

```bash
# After all imports updated
rm src/lib/ml/AlgorithmPredictor.ts
```

### Step 5: Update Tests

**Find and replace:**
```typescript
// OLD
import { algorithmPredictor } from '@/lib/ml/AlgorithmPredictor';

// NEW
import { algorithmSelector } from '@/lib/fabricator/AlgorithmSelector';
```

---

## Verification Checklist

- [ ] New file created (`AlgorithmSelector.ts`)
- [ ] All imports updated
- [ ] All documentation updated
- [ ] All tests updated
- [ ] Old file removed
- [ ] No "ML" or "predict" terminology remains
- [ ] Constitutional validation tests pass
- [ ] CI/CD passes

---

## Rollback Plan

If issues arise:

1. Keep old file temporarily: `AlgorithmPredictor.ts.backup`
2. Revert imports if needed
3. Fix issues in new file
4. Re-apply migration

---

**Status:** Ready for execution  
**Priority:** WEEK 1 (IMMEDIATE)





