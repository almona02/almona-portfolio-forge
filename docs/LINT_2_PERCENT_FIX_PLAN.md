# Lint 2% Fix Plan

**Target:** Fix ~327 warnings (2% of 16,373)  
**Generated:** 2026-03-18  
**Baseline:** 7 errors fixed; 16,373 warnings remaining  
**Progress (2026-03-18):** 327 warnings fixed → 16,048 remaining ✅ **2% target reached**

---

## Summary

| Metric | Value |
|--------|-------|
| Total warnings (baseline) | 16,373 |
| Current warnings | 16,048 |
| Fixed so far | 327 ✅ |
| 2% target | ~327 |
| Primary rule categories | no-explicit-any, no-unsafe-*, require-await, no-unused-vars |

### Completed (2026-03-18)
- Phase 1: `npm run lint --fix`
- Phase 2/3: Types (`assembly.ts`, `execution.ts`, `performance-monitoring.ts`, `SystemPacksPage.tsx`)
- Phase 3: `import.meta.env.VITE_API_URL` type assertions in 12 service files
- Phase 3: `analyticsMetricsApi`, `analyticsQueriesApi` errorData typing, response.json() assertions
- Phase 6: errorData pattern in `projectTemplatesApi`, `quoteTemplatesApi`, `reportTemplatesApi`, `reportGenerationApi`, `projectActivitiesApi`, `filterPresetsApi`, `invoiceTemplatesApi`
- Phase 3: `Record<string, any>` → `Record<string, unknown>` in multiple services
- Phase 4: `reportTemplatesApi.test.ts` require-await (json: async () => → json: () => Promise.resolve())
- Phase 3: `CanonicalEngineeringModel.ts` — Record<string, any> → unknown, isCanonicalEngineeringModel type guard

---

## Phase 1: Auto-fix (Est. 20–50 warnings)

```bash
npm run lint -- --fix
```

- Fixes auto-fixable rules (formatting, simple removals).
- Re-run lint to confirm reduction.

---

## Phase 2: Unused Variables / Imports (Est. 80–120 warnings)

**Rule:** `@typescript-eslint/no-unused-vars` (when reported as warn)

**Strategy:**

| Action | When |
|--------|------|
| Remove | Unused imports |
| Prefix with `_` | Intentionally unused params (e.g. `_payload`, `_error`) |
| Remove or use | Unused local variables |

**Priority files (from LINT_FIX_REFINED_PLAN):**

- `src/tests/constitutional/ValidationEnvelopeIntegration.test.ts`
- `src/pages/WorkflowBuilderPage.tsx`
- `src/tests/constitutional/GuaranteeVerification.test.ts`
- `src/tests/fabricator/hardener/HardenerIntegration.test.ts`
- `src/pages/SystemPacksPage.tsx`
- `src/lib/keyboard/shortcuts-fixed.ts`, `shortcuts.ts`
- `src/lib/performance-monitoring.ts`

---

## Phase 3: `no-explicit-any` (Est. 60–80 warnings)

**Rule:** `@typescript-eslint/no-explicit-any`

**Strategy:**

| Pattern | Fix |
|---------|-----|
| `(err: any)` | `(err: unknown)` or `(err: Error)` |
| `value: any` | Add proper type or `unknown` |
| `as any` | Use type assertion with a real type or `unknown` |

**Priority directories:**

- `src/services/` (API error handling)
- `src/tests/` (test mocks)
- `src/types/` (type definitions)

---

## Phase 4: `require-await` (Est. 30–50 warnings)

**Rule:** `@typescript-eslint/require-await`

**Strategy:**

- Remove `async` if the function has no `await`.
- Or add `await` if the function should be async (e.g. `return somePromise` → `return await somePromise`).

**Common locations:**

- Test mocks (`async () => ({ ... })` without await)
- API wrappers that only return promises

---

## Phase 5: `react-hooks/exhaustive-deps` (Est. 5–15 warnings)

**Rule:** `react-hooks/exhaustive-deps`

**Strategy:**

- Add missing dependencies to `useEffect` / `useCallback` / `useMemo`.
- If intentional: `// eslint-disable-next-line react-hooks/exhaustive-deps` with a short comment.

---

## Phase 6: `no-unsafe-*` (Est. 50–80 warnings)

**Rules:** `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-argument`, `no-unsafe-return`

**Strategy:**

- Add type guards or assertions where types are known.
- Use `unknown` and narrow before use.
- Prefer fixing `no-explicit-any` first; many `no-unsafe-*` issues stem from `any`.

**Priority files:**

- `src/services/*.ts` (Supabase/API responses)
- `src/lib/fabricator/` (BOM/optimization types)

---

## Execution Order

1. Run `npm run lint -- --fix`
2. Phase 2: Unused vars (highest impact, low risk)
3. Phase 3: `no-explicit-any` in `src/services/` and `src/types/`
4. Phase 4: `require-await` in tests and services
5. Phase 5: `exhaustive-deps` (manual review)
6. Phase 6: `no-unsafe-*` in high-traffic files

---

## Verification

```bash
# Expect 0 errors
npm run lint -- --quiet

# Count warnings (after full lint)
npm run lint 2>&1 | tail -3
```

**Target:** 0 errors, ~16,046 warnings (327 fewer).

---

## Checklist

- [x] Fix 7 ESLint errors (completed 2026-03-18)
- [ ] Run `npm run lint -- --fix`
- [ ] Phase 2: Unused vars (~80–120 fixes)
- [ ] Phase 3: `no-explicit-any` (~60–80 fixes)
- [ ] Phase 4: `require-await` (~30–50 fixes)
- [ ] Phase 5: `exhaustive-deps` (~5–15 fixes)
- [ ] Phase 6: `no-unsafe-*` (~50–80 fixes)
- [ ] Re-run lint — target: 327 fewer warnings
