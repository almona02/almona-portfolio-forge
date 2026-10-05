# Compiler Hardening — Action Plan for a Better Codebase

**Date:** 2025-02-17  
**Scope:** Phased adoption of stricter TypeScript and ESLint rules per [compiler_hardening_plan](.cursor/plans/compiler_hardening_plan_c052a596.plan.md)

---

## Executive Summary

| Metric | Current | Target |
|--------|---------|--------|
| ESLint config | `recommended` (no type-aware) | `recommendedTypeChecked` → `strictTypeChecked` |
| Type-aware rules | None | Full type-safe linting |
| `no-explicit-any` | ~3.3k warnings | 0 |
| `react-hooks/exhaustive-deps` | ~15+ warnings | 0 or justified |
| `projectService` | Not enabled | Enabled for type-aware linting |

---

## Phase 1: Prerequisites for Type-Aware Linting (~1 hour)

**Goal:** Enable `projectService` without "file not found" errors.

### 1.1 Add `allowJs` to tsconfig.app.json

**Why:** 5 `.js` files in `src` are included in ESLint but not in tsconfig:

| File | Path |
|------|------|
| `trigger-deploy.js` | `src/trigger-deploy.js` |
| `password-policy.js` | `src/lib/password-validation/` |
| `advanced-password-validation.js` | `src/lib/password-validation/` |
| `common-passwords.js` | `src/lib/password-validation/` |
| `password-validation.js` | `src/lib/password-validation/` |

**Action:** Add `"allowJs": true` to `tsconfig.app.json` `compilerOptions`.

### 1.2 Verify Shared UI Paths

**Current:** Imports use `@/shared/ui/ui/*` — the actual folder is `src/shared/ui/ui/`. This is valid; `include: ["src"]` covers it. No changes needed unless path aliases differ.

**Action:** Verify `tsconfig.app.json` `include: ["src"]` covers all linted paths. No symlinks or excludes expected.

### 1.3 Optional: Align Root tsconfig.json

**Current:** Root has `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`.

**Action:** For consistency with project references, set:
```json
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true,
"noUnusedLocals": true,
"noUnusedParameters": true
```

---

## Phase 2: Enable recommendedTypeChecked (Warn Mode) (~30 min) ✅ DONE

**Goal:** Enable type-aware linting without breaking CI (errors → 0, warnings allowed).

### 2.1 Update eslint.config.js

**Changes:**
1. Add `languageOptions.parserOptions`:
   ```js
   languageOptions: {
     parserOptions: {
       projectService: true,
       tsconfigRootDir: import.meta.dirname,
     },
   },
   ```
2. Replace `...tseslint.configs.recommended` with `...tseslint.configs.recommendedTypeChecked`
3. Downgrade noisy rules to `warn` so CI passes:
   - `@typescript-eslint/no-unsafe-assignment`: `warn`
   - `@typescript-eslint/no-unsafe-member-access`: `warn`
   - `@typescript-eslint/no-unsafe-call`: `warn`
   - `@typescript-eslint/no-unsafe-argument`: `warn`
   - `@typescript-eslint/no-unsafe-return`: `warn`
   - `@typescript-eslint/restrict-template-expressions`: `warn`
   - `@typescript-eslint/restrict-plus-operands`: `warn`

### 2.2 Validate

Run `npm run lint` and confirm **0 errors** (warnings acceptable).

---

## Phase 3: Fix High-Impact Violations (2–4 weeks)

**Priority order by rule and impact.**

### 3.1 Quick Wins (Do First)

| Task | Effort | Files | Action |
|------|--------|-------|--------|
| Fix 3 existing `react-hooks/exhaustive-deps` warnings (from lint reports) | 0.5 day | ~3–5 | Add missing deps or justify with `// eslint-disable-next-line` + comment |
| Fix `no-unused-vars` errors | 0.5 day | varies | Remove or prefix with `_` |
| Fix `no-explicit-any` in top 10 high-traffic files | 1 day | ~10 | Replace `any` with proper types |

### 3.2 no-explicit-any (~3.3k warnings)

**Strategy:** Fix by directory, starting with high-traffic modules.

| Directory | Est. Count | Priority |
|-----------|------------|----------|
| `src/lib/fabricator/` | 50+ | P0 |
| `src/lib/realityos/` | 30+ | P0 |
| `src/types/fabricator.ts` | 15 | P0 |
| `src/components/fabricator/` | 100+ | P1 |
| `src/services/` | 80+ | P1 |
| `src/lib/` (other) | 100+ | P2 |
| `src/components/` (other) | 100+ | P2 |
| `src/tests/` | 50+ | P3 |

**Patterns:**
- Replace `(x: any)` with `(x: unknown)` and add type guards
- Replace `Record<string, any>` with `Record<string, unknown>` or generic types
- Add proper interfaces for event handlers, API responses

### 3.3 restrict-template-expressions

**Pattern:** Wrap numbers in `String()` or ensure `${n}` typed as `string | number`.

```ts
// Before
`Count: ${count}`

// After
`Count: ${String(count)}`  // or `${count}` if count is string | number
```

### 3.4 no-unsafe-* Rules

**Root cause:** `any` propagation. Fix by:
1. Typing function params/returns
2. Avoiding `any` in JSON parsing: use `unknown` + type guards
3. Typing third-party library callbacks

### 3.5 no-non-null-assertion

**Pattern:** Replace `!` with null checks or optional chaining.

```ts
// Before
const x = obj!.prop;

// After
const x = obj?.prop ?? defaultValue;
```

### 3.6 require-await

**Action:** Remove `async` from functions with no `await`, or add `await` where needed.

---

## Phase 4: Upgrade Rules to Error (1–2 weeks)

**Strategy:** Change Phase 2 downgraded rules from `warn` to `error` one at a time. Fix before moving to the next.

| Rule | Order |
|------|-------|
| `@typescript-eslint/no-unsafe-assignment` | 1 |
| `@typescript-eslint/no-unsafe-member-access` | 2 |
| `@typescript-eslint/no-unsafe-call` | 3 |
| `@typescript-eslint/no-unsafe-argument` | 4 |
| `@typescript-eslint/no-unsafe-return` | 5 |
| `@typescript-eslint/restrict-template-expressions` | 6 |
| `@typescript-eslint/restrict-plus-operands` | 7 |

---

## Phase 5: Add strictTypeChecked (Optional, 1–2 weeks)

**Goal:** Enable stricter rules beyond `recommendedTypeChecked`.

### 5.1 Config Change

Replace `recommendedTypeChecked` with `strictTypeChecked` in `eslint.config.js`.

### 5.2 Downgrade New Strict Rules to Warn Initially

- `@typescript-eslint/no-confusing-void-expression`
- `@typescript-eslint/no-useless-constructor`
- `@typescript-eslint/use-unknown-in-catch-callback-variable`
- `@typescript-eslint/no-unnecessary-condition`
- `@typescript-eslint/no-unnecessary-type-parameters`
- `@typescript-eslint/no-deprecated`
- `@typescript-eslint/no-redundant-type-constituents`
- `@typescript-eslint/no-unnecessary-type-assertion`

### 5.3 Fix and Upgrade Incrementally

Same pattern as Phase 4: fix violations, then upgrade rules to `error`.

---

## Alternative: Minimal Hardening (No Type-Aware)

If full strict is not a near-term goal:

1. **Fix 3 existing `react-hooks/exhaustive-deps` warnings** — quick win
2. **Gradually fix `no-explicit-any`** in new/modified files via `// eslint-disable-next-line` removal and proper typing
3. **Keep current config** — `recommended` + `no-explicit-any: warn` + `no-unused-vars: error`

---

## File Change Summary

| File | Phase 1 | Phase 2 | Phase 3–5 |
|------|---------|---------|-----------|
| `tsconfig.app.json` | Add `allowJs: true` | — | — |
| `tsconfig.json` | Optional: align strict | — | — |
| `eslint.config.js` | — | projectService, recommendedTypeChecked, rule overrides | Upgrade rules |
| `COMPILER_HARDENING.md` | — | Update | Update with progress |
| `src/**/*.ts(x)` | — | — | Fix violations |

---

## Effort Estimate

| Phase | Effort |
|-------|--------|
| Phase 1 | ~1 hour |
| Phase 2 | ~30 min |
| Phase 3 | 2–4 weeks (depends on team size) |
| Phase 4–5 | 1–2 weeks |

---

## Recommended Next Steps

1. **Today:** Phase 1 (allowJs, verify paths) + Phase 2 (enable recommendedTypeChecked in warn mode)
2. **This week:** Fix the 3 `react-hooks/exhaustive-deps` warnings
3. **Sprint 1:** Tackle `no-explicit-any` in `src/lib/fabricator/` and `src/types/fabricator.ts`
4. **Sprint 2+:** Phase 3 batch fixes, then Phase 4 rule upgrades
