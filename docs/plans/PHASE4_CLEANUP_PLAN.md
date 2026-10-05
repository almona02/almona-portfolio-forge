# Phase 4: Systematic Cleanup Plan

## Status: 🚀 IN PROGRESS

**Date**: 2025-01-27
**Starting Point**: 267 warnings, 0 errors
**Target**: < 50 warnings (or maximum cleanup achievable)
**Strategy**: Batch processing by file and pattern type

---

## 📊 Warning Distribution Analysis

### By Type (Estimated):
- **Unused imports/variables**: ~240 warnings (90%)
- **Unused parameters**: ~15 warnings (6%)
- **Hook dependencies**: ~12 warnings (4%)

### By Priority:
1. **High Priority**: Core component files (fabricator, commercial, customer)
2. **Medium Priority**: Utility/lib files
3. **Low Priority**: Test files, less-used utilities

---

## 🎯 Batch Processing Strategy

### Batch 1: Core Fabricator Components (High Priority)
**Target Files**:
- `DraftingWorkbench.tsx` (~20+ unused imports)
- `BarDrawing.tsx` (5 warnings)
- `EnhancedPricingConfigDialog.tsx` (5 warnings)
- `VisualBOMDisplay.tsx` (9 warnings)
- `SmartMeasuringInterface.tsx` (1 warning)

**Expected Reduction**: ~40-50 warnings

---

### Batch 2: Layout & Navigation Components
**Target Files**:
- `UniversalNavSidebar.tsx` (6 warnings)
- `QuickAccessToolbar.tsx` (2 warnings)
- `UniversalHeader.tsx` (1 warning)
- `UnifiedWorkflowRibbon.tsx` (3 warnings)

**Expected Reduction**: ~12 warnings

---

### Batch 3: Commercial & Customer Components (Remaining)
**Target Files**:
- `ConversionChart.tsx` (1 warning - format)
- `CustomerSegmentsManager.tsx` (1 warning - _e)
- `PaymentHistory.tsx` (if any remaining)
- `RevenueChart.tsx` (if any remaining)

**Expected Reduction**: ~2-3 warnings

---

### Batch 4: Core Authority & State Management
**Target Files**:
- `NotificationCenter.tsx` (14 warnings)
- `StateMachine.ts` (2 warnings)
- `StateTransition.tsx` (3 warnings)
- `stateMachines.ts` (5 warnings)

**Expected Reduction**: ~24 warnings

---

### Batch 5: Services & Automation
**Target Files**:
- `ActionExecutor.ts` (5 warnings)
- `AutomationEngine.ts` (6 warnings)
- `TriggerDetector.ts` (1 warning)
- `FilterService.ts` (1 warning)

**Expected Reduction**: ~13 warnings

---

### Batch 6: Utility & Library Files
**Target Files**:
- `windowSnapshotGenerator.ts` (9 warnings)
- `enhancedMaterials.ts` (1 warning)
- `explodedViewUtils.ts` (2 warnings)
- `HardwareModelLibrary.ts` (2 warnings)
- `ConstraintEngine.ts` (2 warnings)
- Various other utility files

**Expected Reduction**: ~30-40 warnings

---

### Batch 7: Test Files
**Target Files**:
- All `__tests__` and test files
- Prefixed with `_` for intentionally unused imports/types

**Expected Reduction**: ~20-30 warnings

---

### Batch 8: Drafting Utils & Tools
**Target Files**:
- Various drafting utility files (patternUtils, offsetUtils, etc.)
- Drafting tools and components

**Expected Reduction**: ~30-40 warnings

---

### Batch 9: Remaining Hook Dependencies
**Target Files**:
- Files with `react-hooks/exhaustive-deps` warnings
- Apply useCallback, useMemo, or eslint-disable as appropriate

**Expected Reduction**: ~12 warnings

---

### Batch 10: Final Cleanup & Verification
- Review any remaining warnings
- Fix any missed patterns
- Final verification

---

## 🛠️ Fix Patterns

### Pattern 1: Unused Imports
```typescript
// Before
import { Button, Card, Alert } from '@/components/ui';

// After (remove unused)
import { Card } from '@/components/ui';
```

### Pattern 2: Unused Variables/Constants
```typescript
// Before
const BAR_SPACING = 10; // unused

// After (prefix with _ if intentional, remove if truly unused)
// Option 1: Remove if unused
// Option 2: Prefix if intentional placeholder
const _BAR_SPACING = 10; // Reserved for future use
```

### Pattern 3: Unused Function Parameters
```typescript
// Before
function handler(event, context) {
  // context not used
}

// After
function handler(event, _context) {
  // _context intentionally unused
}
```

### Pattern 4: Unused Destructured Variables
```typescript
// Before
const { width, height, quality } = options;
// quality not used

// After
const { width, height } = options;
// OR if needed for interface:
const { width, height, quality: _quality } = options;
```

---

## ✅ Execution Checklist

- [ ] Batch 1: Core Fabricator Components
- [ ] Batch 2: Layout & Navigation
- [ ] Batch 3: Commercial & Customer (remaining)
- [ ] Batch 4: Core Authority & State
- [ ] Batch 5: Services & Automation
- [ ] Batch 6: Utility & Library Files
- [ ] Batch 7: Test Files
- [ ] Batch 8: Drafting Utils & Tools
- [ ] Batch 9: Hook Dependencies
- [ ] Batch 10: Final Cleanup & Verification

---

## 📈 Progress Tracking

**Starting**: 267 warnings
**Current**: TBD
**Target**: < 50 warnings
**Reduction Goal**: 217+ warnings fixed (81%+ reduction)

---

## 🎯 Success Criteria

- ✅ No new errors introduced
- ✅ Build passes
- ✅ TypeScript compiles
- ✅ Significant warning reduction (50%+ minimum, 80%+ ideal)
- ✅ Code quality maintained
- ✅ No functionality regressions

---

**Created**: 2025-01-27
**Status**: Ready for execution
