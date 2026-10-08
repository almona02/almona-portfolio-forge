# CI type-check baseline

`npm run type-check` runs `scripts/ci-typecheck-baseline-delta.ts` (**fail-closed**):

- **Node** (`tsconfig.node.json`): must be clean.
- **App** (`tsconfig.app.json`):
  - Non-zero `tsc` exit with **zero** parsed `file(line,col): error TSxxxx` diagnostics → **fail** (crash / config / unparsed).
  - Compared to `typecheck-app-baseline.json` **v2** with per-signature **occurrence counts**.
  - Regression = new `file:TSxxxx` signature, **or** higher occurrence for an existing signature, **or** total `errorCount` increase.
  - Passing does **not** mean type-clean.

Signatures use **posix** repo-relative paths. `tsc` is invoked with `--pretty false`.

## Linux vs Windows

`tsc` diagnostic sets differ by OS/`@types` resolution. Prefer refreshing the committed baseline on **Linux/CI**:

```bash
npm run type-check:baseline
```

Or Actions: **Typecheck base/head delta** → `workflow_dispatch` with `write_baseline=true`, then download the `typecheck-app-baseline-linux` artifact and commit it.

## PR base vs head (Linux)

Workflow `.github/workflows/typecheck-base-head-delta.yml` fingerprints **PR base** and **head** on Ubuntu and fails if head introduces new signatures / occurrence increases / higher total vs base. Artifacts: `typecheck-linux-fingerprints`.

Helpers:

- `scripts/ci-typecheck-emit-fingerprint.ts`
- `scripts/ci-typecheck-compare-fingerprints.ts`

Full dump (no delta gate): `npm run type-check:strict`.
