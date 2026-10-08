# CI type-check baseline

`npm run type-check` runs `scripts/ci-typecheck-baseline-delta.ts`:

- **Node** (`tsconfig.node.json`): must be clean.
- **App** (`tsconfig.app.json`): compared to `typecheck-app-baseline.json`. CI fails only when the error **count increases** or a **new** `file:TSxxxx` signature appears. Passing does **not** mean type-clean.

Refresh after intentional debt reduction:

```bash
npm run type-check:baseline
```

Full diagnostic dump (no delta gate): `npm run type-check:strict`.
