# Compiler & Linter Hardening

Investigation and options for enabling stricter ESLint and TypeScript checks.

## Current State (After Hardening)

### TypeScript
- **tsconfig.app.json**: Already strict (`strict: true`, `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, etc.)
- **tsconfig.node.json**: Now hardened with `noUnusedLocals: true`, `noUnusedParameters: true`
- **tsconfig.json** (root): Uses project references; referenced configs control app/node compilation

### ESLint (Hardened — Phase 2 Complete)
- **Base**: `tseslint.configs.recommendedTypeChecked` + `projectService: true`
- **no-explicit-any**: `warn`
- **no-unused-vars**: `error`, with ignore patterns for `_`, `vi`, `mock`
- **Type-aware rules** (no-unsafe-*, require-await, no-floating-promises, etc.): `warn` (0 errors, ~21.9k warnings)
- **Workaround**: `src/shared/ui/ui/sidebar.tsx`, `sonner.tsx` in `ignores` (project service path resolution)

## Full Strict Options (Requires Codebase Fixes)

### ESLint: strictTypeChecked
Enabling `...tseslint.configs.strictTypeChecked` with `projectService: true` yields **~28,000 errors**:
- `@typescript-eslint/no-unsafe-*` (assignment, member-access, call, argument, return)
- `@typescript-eslint/restrict-template-expressions` (numbers in template literals)
- `@typescript-eslint/no-non-null-assertion`
- `@typescript-eslint/require-await`
- `@typescript-eslint/no-unnecessary-condition`
- And more

### ESLint: recommendedTypeChecked
Enabling `...tseslint.configs.recommendedTypeChecked` yields **~19,000 errors** (subset of strict).

### Phased Adoption
1. **Phase 1** (done): `allowJs` in tsconfig.app.json
2. **Phase 2** (done): `recommendedTypeChecked` + `projectService`, downgrade noisy rules to `warn` → 0 errors
3. **Phase 3**: Fix warnings, upgrade to `error` incrementally
4. **Phase 4**: Add `strictTypeChecked` rules incrementally

## Enabling Type-Aware Linting

To use `recommendedTypeChecked` or `strictTypeChecked`, add to `eslint.config.js`:

```js
{
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
},
...tseslint.configs.recommendedTypeChecked,  // or strictTypeChecked
```

**Note**: `projectService` requires all linted files to be included in a tsconfig. Files like `.js` in `src/lib/password-validation/` or paths such as `src/shared/ui/ui/` may cause "not found by project service" errors. Fix by:
- Adding `allowJs: true` and including those paths in `tsconfig.app.json`, or
- Adding `allowDefaultProject` for config files, or
- Excluding problematic paths from `eslint` via `ignores`

## Available typescript-eslint Configs

| Config | Description |
|--------|-------------|
| `recommended` | Base recommended rules |
| `recommendedTypeChecked` | + type-aware rules |
| `strict` | + stricter rules (no type info) |
| `strictTypeChecked` | recommended + recommendedTypeChecked + strict + strictTypeChecked |
| `stylistic` | Style-only rules |
| `stylisticTypeChecked` | Style + type-aware style |

## Quick Reference: Upgrade to Full Strict

```js
// eslint.config.js - full strict (expect ~28k errors until fixed)
export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", "archive/**", "python_backend/**", "public/**"] },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // ... plugins and rule overrides
);
```
