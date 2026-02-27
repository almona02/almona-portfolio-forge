# Refined Lint Fix Plan

**Generated:** 2026-02-27  
**Source:** Consolidated from `LINT_FIX_PLAN.md`, `LINT_CLEANUP_PLAN.md`, `LINT_ANALYSIS.md`, `COMPILER_HARDENING_ACTION_PLAN.md`, and live `npm run lint` / `lint-results.json`

---

## Current State (2026-02-27)

| Metric | Value |
|--------|-------|
| **ESLint errors** | 0 |
| **ESLint warnings** | 67 |
| **Files with issues** | 39 |
| **TypeScript build** | ✅ Passes |
| **Config** | `recommendedTypeChecked` + `projectService` |

### Rule Breakdown

| Rule | Count | Severity | Fixability |
|------|-------|----------|------------|
| `@typescript-eslint/no-unused-vars` | 66 | warn | Manual |
| `react-hooks/exhaustive-deps` | 1 | warn | Manual |

---

## Execution Order

### Phase 1: Auto-fix (5 min)

```bash
npm run lint -- --fix
```

- Fixes any auto-fixable rules (formatting, simple unused-var removals where safe).
- Re-run lint after to confirm reduction.

---

### Phase 2: Unused Variables/Imports (P1 — High Impact)

**Target:** 66 `no-unused-vars` warnings across 39 files.

**Strategy:**

| Action | When to use |
|--------|-------------|
| **Remove** | Unused imports, truly dead variables |
| **Prefix with `_`** | Intentionally unused (e.g. `catch (_error)`, callback params, future placeholders) |
| **Use or remove** | Unused function params — either use them or prefix with `_` |

**Files by warning count (top 15):**

| File | Warnings |
|------|----------|
| `src/tests/constitutional/ValidationEnvelopeIntegration.test.ts` | 7 |
| `src/pages/WorkflowBuilderPage.tsx` | 6 |
| `src/tests/constitutional/GuaranteeVerification.test.ts` | 3 |
| `src/tests/fabricator/hardener/HardenerIntegration.test.ts` | 3 |
| `src/pages/SystemPacksPage.tsx` | 2 |
| `src/lib/keyboard/shortcuts-fixed.ts` | 2 |
| `src/lib/keyboard/shortcuts.ts` | 2 |
| `src/lib/performance-monitoring.ts` | 2 |
| `src/services/__tests__/projectActivitiesApi.test.ts` | 2 |
| `src/tests/e2e/WorkflowPerformanceAudit.test.ts` | 2 |
| `src/core/authority/certification/DeterministicReplayEngine.ts` | 2 |
| `src/core/authority/validation_envelopes/MaterialCertificationConstraints.ts` | 2 |
| `src/lib/3d/explodedViewUtils.ts` | 2 |
| `src/lib/3d/hardware/HardwareModelLibrary.ts` | 2 |
| `src/lib/fabricator/ConstraintEngine.ts` | 2 |
| `src/lib/fabricator/goldTier/FenestrationSystemValidator.ts` | 2 |
| `src/lib/fabricator/goldTier/PatternMigrationService.ts` | 2 |

**Suggested order:** Start with high-warning files, then sweep remaining single-warning files.

---

### Phase 3: React Hook Dependencies (P2 — Critical for Correctness)

**Target:** 1 `react-hooks/exhaustive-deps` warning.

**Strategy:**

- **Option A:** Add missing deps (verify no infinite loops or extra re-renders).
- **Option B:** Add `// eslint-disable-next-line react-hooks/exhaustive-deps` with a short comment explaining why (e.g. mount-only effect, intentional stale closure).

**Note:** `LINT_FIX_PLAN.md` and `LINT_ANALYSIS.md` list more exhaustive-deps issues from older runs. Current `lint-results.json` shows only 1. Re-run lint after Phase 2 to confirm.

---

### Phase 4: Project Service / Ignored Files (P3 — Optional)

**Current workaround:** `src/shared/ui/ui/sidebar.tsx` and `src/shared/ui/ui/sonner.tsx` are in ESLint `ignores` due to project-service path resolution.

**Options:**

1. Create `tsconfig.eslint.json` extending `tsconfig.app.json` with explicit `include: ["src/**/*.ts", "src/**/*.tsx"]` and try `project: ['./tsconfig.eslint.json']`.
2. File an issue with typescript-eslint for project references + projectService path resolution.
3. Consolidate `sidebar.ts` + `sidebar.tsx` (and `sonner.ts` + `sonner.tsx`) if the split is unnecessary.

---

### Phase 5: Stricter Rules (P4 — Future)

**From `COMPILER_HARDENING_ACTION_PLAN.md`:**

- `recommendedTypeChecked` → `strictTypeChecked` would add ~28k errors.
- `no-explicit-any` (~3.2k) and `no-unsafe-*` (~21.9k) are currently `warn`.
- **Recommendation:** Keep current config until Phase 1–3 are done. Then consider incremental directory-by-directory tightening.

---

## Verification Commands

```bash
# Lint (expect 0 errors; warnings acceptable for now)
npm run lint

# TypeScript build
npm run build

# Optional: lint with max-warnings 0 to fail on any warning
npm run lint -- --max-warnings 0
```

---

## Summary Checklist

- [ ] Run `npm run lint -- --fix`
- [ ] Fix 66 `no-unused-vars` warnings (remove or prefix with `_`)
- [ ] Fix 1 `react-hooks/exhaustive-deps` warning
- [ ] Re-run `npm run lint` — target: 0 errors, 0 warnings
- [ ] (Optional) Re-enable lint for `sidebar.tsx` / `sonner.tsx` via tsconfig fix
- [ ] (Future) Consider `strictTypeChecked` and incremental `no-unsafe-*` fixes
