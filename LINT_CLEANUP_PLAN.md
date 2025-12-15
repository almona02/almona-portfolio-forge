# Complete Lint Cleanup Plan - Learner-Effective Code

## Current Status
- **Before**: 453 warnings
- **After Auto-fix**: 399 warnings
- **Target**: 0 warnings

## Cleanup Strategy

### Phase 1: Unused Variables/Imports (Priority: High)
**Count**: ~350+ warnings

**Strategy**:
1. **Unused imports**: Remove completely
2. **Unused variables**: 
   - If intentionally unused (error handlers, future features): Prefix with `_`
   - If truly unused: Remove
3. **Unused function parameters**: Prefix with `_` if needed for interface compliance

### Phase 2: React Hook Dependencies (Priority: Critical)
**Count**: ~30 warnings

**Strategy**:
1. Add missing dependencies
2. Use `useRef` for callbacks that shouldn't trigger re-renders
3. Wrap objects/arrays in `useMemo` when used in dependencies
4. Use `useCallback` for functions used in dependencies

### Phase 3: Unused ESLint Disable Directives
**Count**: ~15 warnings

**Strategy**: Remove unused `eslint-disable` comments

### Phase 4: Code Quality Improvements
**Count**: ~10 warnings

**Strategy**: Fix ref cleanup issues and other edge cases

## File-by-File Cleanup Order

### High-Impact Files (Most Warnings)
1. `src/pages/UsedMachines.tsx` - 13 unused imports
2. `src/pages/AdvancedModelViewer.tsx` - 12 unused imports
3. `src/components/services/PreventiveMaintenanceDialog.tsx` - 8 unused imports
4. `src/components/sales/PhotoMatchViewer.tsx` - 9 unused variables
5. `src/components/training/InteractiveUserGuide.tsx` - 7 unused variables

### Critical Hook Dependency Files
1. `src/components/fabricator/PrecisionDesignInterface.tsx` - 1 remaining
2. `src/components/3d-model/UnifiedARManager.tsx` - 1 hook issue
3. `src/components/fabricator/ProfileManagement.tsx` - 1 hook issue
4. `src/components/fabricator/Rock60PricingSetup.tsx` - 2 hook issues
5. `src/context/QuoteContext.tsx` - 2 hook issues

## Automated Fixes Applied
✅ Auto-fix removed 54 warnings (unused eslint-disable, formatting)

## Next Steps
1. Batch remove unused imports
2. Fix hook dependencies systematically
3. Prefix intentionally unused variables with `_`
4. Final verification

