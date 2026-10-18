# LINTS — project-wide cleanup

Status: open, incremental. Branch: `codex/lints`. Started 2026-10-18.

## Scope and gates

Cover the entire project in bounded batches, starting with the ESLint-supported `src/` tree. Existing configuration excludes backend Python, generated output and certain UI files; zero errors in this gate does not mean every repository file is linted. Add suitable checks for scripts, Deno functions and Python as separate reviewed batches rather than silently treating them as covered.

Keep ESLint errors at zero, reduce warnings, and preserve runtime behavior. Do not disable rules, blanket-cast to `any`, weaken validation, regenerate the type baseline to conceal regressions, or claim lint cleanup alone improves runtime throughput. Runtime changes need focused verification.

This PR is stacked on `codex/admin-accessibility` so its diff contains lint work rather than the admin feature series. Keep it draft/open; do not merge or deploy. Retarget to main after its parent lands and verify the resulting diff and checks again.

## First parallel batches

| Batch | Files | Warnings before | Warnings after |
| --- | --- | --- | --- |
| Admin panels/dashboard and accessibility tests | 5 | 27 | 0 |
| App settings API | 1 | 18 | 0 |
| Support and technician screens | 5 | 37 | 0 |
| Total | 11 | 82 | 0 |

Changes use migration-derived local table contracts where generated database types are missing, remove unsafe aliases, use typed table records and handle promise rejections. Local contracts are temporary compile-time descriptions, not runtime response validation. Regenerate authoritative database types in a separate schema-alignment batch.

The initial active-checkout scan covered 2,353 files and reported 1 error / 16,266 warnings. That scan included an untracked machine admin panel absent from the isolated PR. Its unused import was subsequently removed by concurrent admin work. Use the isolated branch report for the PR result; do not subtract these counts to claim an exact project-wide reduction across different checkouts.

## Repeatable verification

```sh
npm run lint:report
npm run lint:inventory
npm run type-check
npm run test -- src/components/admin/panels/PanelFilters.accessibility.test.tsx src/pages/AdminDashboard.accessibility.test.tsx
```

`lint:report` uses the existing rules/severities and writes an ignored local `.eslint-report.json`; its exit status still fails on errors. `lint:inventory` summarizes total errors/warnings, rule counts and the twenty highest-priority files. Pass an ESLint JSON path as its argument to inspect a saved report. Warnings remain visible and are not reclassified as errors in the broad gate; each completed batch must also pass targeted `eslint --max-warnings 0`.

The type check is baseline-delta, not type-clean. Capture results without modifying its baseline. The existing accessibility suites passed 14 tests in the first batch. Review promise error paths and database contracts along with static checks.

## Next batches

1. API boundaries: service contracts, ticket messaging, admin user/ticket APIs and used-machine service. Derive types from authoritative schema and narrow unknown external values.
2. Fabricator configuration: schema alignment first. `createProfile`, `createAccessory`, `createRule` and `saveTuning` omit ownership fields required by the reviewed migrations. Resolve ownership behavior with focused tests; do not invent optional Insert fields just to satisfy lint.
3. Remaining session screens: login, services and fabricator admin. Separate event/promise cleanup from domain changes.
4. Follow the full inventory by warning concentration, prioritizing manufacturing input validation, optimization, stock mutations and release/QC boundaries. Assign disjoint file ownership to parallel agents and integrate one verified batch at a time.
5. Add lint coverage for excluded first-party scripts/functions and appropriate Python checks. Record exclusions and distinguish lint/type/dependency findings.

After every batch, run targeted zero-warning lint, relevant behavior tests, the type regression gate, and a fresh full lint inventory. Track each batch here or in a linked follow-up audit. Do not repeatedly broaden tests without a changed integration risk.

## Verified isolated-branch lint snapshot

Full ESLint report: **2,352 files, 0 errors, 16,171 warnings**. Each of the 11 changed source files also passes targeted lint with `--max-warnings 0`. No rule severities or exclusions were changed.

Highest remaining warning concentrations:

| File | Warnings |
| --- | --- |
| `src/modules/reporting/PDFExportService.ts` | 386 |
| `src/services/commercial/CommercialPDFService.ts` | 354 |
| `src/components/fabricator/ProfileManagement.tsx` | 335 |
| `src/components/shop/ProductQuickView.tsx` | 231 |
| `src/lib/reports/comparisonPdf.ts` | 227 |
| `src/components/fabricator/drafting/utils/inputValidator.ts` | 221 |
