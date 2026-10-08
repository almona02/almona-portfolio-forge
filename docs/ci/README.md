# CI type-check baseline

`npm run type-check` runs `scripts/ci-typecheck-baseline-delta.ts`:

- **Node** (`tsconfig.node.json`): must be clean.
- **App** (`tsconfig.app.json`): compared to `typecheck-app-baseline.json`. CI fails only when the error **count increases** or a **new** `file:TSxxxx` signature appears. Passing does **not** mean type-clean.
- Signatures use **posix** repo-relative paths (`src/...:TSxxxx`). `tsc` is invoked with `--pretty false` for stable parsing across OS/TTY.
- Linux CI can report **more** diagnostics than Windows (e.g. `@types`/R3F). The committed baseline is a **Linux CI fingerprint** (currently **1816** errors / **848** signatures). Local Windows with fewer errors still passes (count ≤ baseline, no new signatures).

Refresh after intentional debt reduction (prefer Linux/CI so the fingerprint matches runners):

```bash
npm run type-check:baseline
```

Full diagnostic dump (no delta gate): `npm run type-check:strict`.
