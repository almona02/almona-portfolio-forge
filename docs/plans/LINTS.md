# LINTS — project-wide cleanup

Status: open, incremental. Started 2026-10-18 on `codex/lints`. Working baseline refreshed 2026-11-06 on `fix/live-schema-credibility` (see the inventory section below). Lint batches stay in their own commits, separate from the live-schema feature work.

## Scope and gates

Cover the entire project in bounded batches, starting with the ESLint-supported `src/` tree. Existing configuration excludes backend Python, generated output and certain UI files; zero errors in this gate does not mean every repository file is linted. Add suitable checks for scripts, Deno functions and Python as separate reviewed batches rather than silently treating them as covered.

Keep ESLint errors at zero, reduce warnings, and preserve runtime behavior. Do not disable rules, blanket-cast to `any`, weaken validation, regenerate the type baseline to conceal regressions, or claim lint cleanup alone improves runtime throughput. Runtime changes need focused verification.

PR #97 has merged. Current main was integrated into `codex/lints`; LINTS now targets main. Keep it draft/open for subsequent verified batches; do not merge or deploy.

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

Immediate work is Wave 1 in the 2026-11-06 inventory section. The list below remains the later domain order.

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

Final integration checks: both accessibility suites passed all 14 tests; the secret scan and diff checks passed. The full type-regression gate passed with 1,675 existing application errors against the 1,791-error baseline, zero new signatures and zero occurrence increases. Node-project types are clean. The baseline was not changed; this is not a type-clean result. A merge-tree check against the updated parent branch also completed without conflicts.

## API boundary batch — 2026-10-19

Five API modules reduced from **108 warnings to zero**, with zero errors and no weakened lint rules. Two new boundary test files are also warning-free. The combined API, ticket governance and accessibility regression run passed 52 tests. See the [before/after comparison and remaining contract issues](../audits/LINTS_API_BATCH_2026-10-19.md). Counts from the earlier snapshot are historical, not a same-checkout project-wide comparison.

Latest full snapshot before this refresh (2026-10-19): **2,356 files, 0 ESLint errors, 16,076 warnings**. Type regression gate passed with 1,665 existing app errors; no baseline changes.

## Inventory baseline — 2026-11-06

Checkout: `fix/live-schema-credibility`. Commands: `npm run lint:report`, then `npm run lint:inventory`. The JSON report `.eslint-report.json` stays untracked.

**2,464 files, 0 errors, 13,388 warnings.** Thirty-nine messages are auto-fixable. This is the baseline for the next batches. The earlier spoken figure of 13,377 is 11 below this run; use 13,388. The October snapshot above is a different checkout, so the drop from 16,076 is directional.

| Rule | Warnings |
| --- | ---: |
| `@typescript-eslint/no-unsafe-member-access` | 4,758 |
| `@typescript-eslint/no-unsafe-assignment` | 3,092 |
| `@typescript-eslint/no-explicit-any` | 2,289 |
| `@typescript-eslint/no-unsafe-call` | 1,413 |
| `@typescript-eslint/no-unsafe-argument` | 841 |
| `@typescript-eslint/no-unsafe-return` | 455 |
| `@typescript-eslint/require-await` | 438 |
| `@typescript-eslint/no-unnecessary-type-assertion` | 39 |
| `@typescript-eslint/no-misused-promises` | 34 |
| `@typescript-eslint/no-floating-promises` | 10 |
| `@typescript-eslint/unbound-method` | 9 |
| `@typescript-eslint/no-base-to-string` | 6 |
| `react-hooks/exhaustive-deps` | 3 |
| `@typescript-eslint/restrict-template-expressions` | 1 |

Highest concentrations:

| File | Warnings |
| --- | ---: |
| `src/components/fabricator/ProfileManagement.tsx` | 242 |
| `src/lib/tax/TaxExemptionHandler.ts` | 164 |
| `src/services/productionService.ts` | 156 |
| `src/components/fabricator/InventoryDashboard.tsx` | 153 |
| `src/services/invoices/InvoiceReminderService.ts` | 139 |
| `src/services/customersApi.ts` | 135 |
| `src/components/fabricator/SystemPackTuningStudio.tsx` | 130 |
| `src/lib/fabricator/DualOutputGenerator.ts` | 128 |
| `src/lib/pricing/PricingEngine.ts` | 124 |
| `src/lib/pricing/PriceHistoryService.ts` | 119 |

`src/lib/fabricator/AlgorithmSelector.ts` and `src/components/fabricator/drafting/utils/inputValidator.ts` are clean. `src/lib/ydt/IntelligenceGate.ts` has 20 warnings, `src/tests/constitutional/GuaranteeVerification.test.ts` has 35, and `src/components/fabricator/drafting/DraftingWorkbench.tsx` has 2.

Coordinator: **muse-wonder-1.0 (1M context)**, non-Contributor. Editors for Wave 1: **muse-spark-1.3 (1M context)**, non-Contributor. Reserved domain files wait for **muse-wonder-full-1.0**.

### Reserved — do not assign to Spark

Pricing, tax, stock, production, schema ownership, and constitutional surfaces. Spark chats must not open these paths.

- `src/lib/tax/TaxExemptionHandler.ts` (164)
- `src/services/productionService.ts` (156)
- `src/components/fabricator/InventoryDashboard.tsx` (153)
- `src/components/fabricator/ProfileManagement.tsx` (242)
- `src/components/fabricator/SystemPackTuningStudio.tsx` (130)
- `src/components/fabricator/Rock60PricingSetup.tsx` (113)
- `src/lib/pricing/PricingEngine.ts` (124)
- `src/lib/pricing/PriceHistoryService.ts` (119)
- `src/lib/inventory/RemnantMarketplace.ts` (105)
- `src/lib/ydt/IntelligenceGate.ts` (20)
- `src/tests/constitutional/GuaranteeVerification.test.ts` (35)
- `src/components/fabricator/drafting/DraftingWorkbench.tsx` (2)
- `src/lib/constitutional/**` (about 111 source warnings and 113 test warnings)
- `src/lib/fabricator/QualityVerificationEngine.ts` (2, release/QC)

### Wave 1 — four disjoint Spark chats

These may run in parallel. Each chat edits only its files and only the named promise rules. Leave every other warning. Do not disable rules, add `any`, edit the typecheck baseline, or reformat unrelated lines. Preserve behavior: a function that callers await keeps a thenable return (`return Promise.resolve(...)`) when dropping `async` would change the type.

After each chat, run `npx eslint` on that chat's files. S1–S3 must pass `--max-warnings 0`. S4 may keep its single `no-explicit-any`. Then run the tests that cover the touched files, and `npm run type-check` without updating the baseline. Integrate one verified batch at a time.

#### S1 — single-warning promise handlers (5)

Each file has exactly one warning.

| File | Rule |
| --- | --- |
| `src/components/fabricator/special/FlyScreenDesigner.tsx` | `no-misused-promises` |
| `src/components/shop/ai-advisor/AiEquipmentAdvisor.tsx` | `no-misused-promises` |
| `src/components/theme/AppThemeProvider.test.tsx` | `no-floating-promises` |
| `src/hooks/useImagePreloading.ts` | `no-misused-promises` |
| `src/pages/fabricator/workflow/OptimizationPage.tsx` | `no-misused-promises` |

#### S2 — CNC connectors, `require-await` only (38)

Each file contains only this rule.

- `src/integrations/cnc/BiesseCNC.ts` (9)
- `src/integrations/cnc/ElumatecCNC.ts` (10)
- `src/integrations/cnc/HomagCNC.ts` (10)
- `src/integrations/cnc/TrumpfCNC.ts` (9)

#### S3 — fabricator tests that contain only `require-await` (25)

- `src/lib/fabricator/inventory/loadOwnedPhysicalBarLots.test.ts` (21)
- `src/lib/fabricator/bom/generateAcknowledgedBOM.test.ts` (4)

#### S4 — `src/core/state/stateMachines.ts` (16)

Fix the 16 `require-await` warnings. Leave the one `no-explicit-any` untouched.

Wave 1 covers 84 warnings. The remaining mass is the unsafe-`any` family (12,848 warnings on the 2026-11-06 report). Reserved domain files stay with muse-wonder-full-1.0. Do not fan that work out across Spark.

### Wave 1 review — accepted

Reviewed on this checkout. The other dirty files belong to the live-schema work and were not part of the review. A full recount and `npm run type-check` wait until the lint edits are separated from that work, because either gate would mix the two.

ESLint on the twelve Wave 1 files: S1–S3 are clean at `--max-warnings 0`. `stateMachines.ts` keeps the one `no-explicit-any` at line 253. Vitest passed 33 tests across `AppThemeProvider.test.tsx`, `generateAcknowledgedBOM.test.ts`, `loadOwnedPhysicalBarLots.test.ts`, and `OptimizationPage.failClosed.test.tsx`.

S1 wraps each async handler in `() => void (async () => { ... })()` so the handler still runs when the click or timeout fires. S2 and S4 drop `async` and return `Promise.resolve(...)`, including the catch paths. S3 does the same in the test doubles. `stateMachines.ts` also drops trailing spaces on five JSDoc lines and the final blank line. The `?` glyphs in its comments were already question marks at HEAD.

### Wave 2 — three disjoint Spark chats

Same rules as Wave 1. Files below contain only `require-await`, are absent from the current dirty tree, and are outside the reserved list. Payments, economics, `Tier3Validator.ts`, advisory code, and constitutional paths stay out.

#### S5 — tests only (22)

- `src/hooks/fabricator/useEngineeringSystemPacks.test.ts` (5)
- `src/hooks/__tests__/usePythonAPI.test.ts` (3)
- `src/tests/integration/calibration.integration.test.ts` (3)
- `src/tests/lib/fabricator/bomBuilder.test.ts` (3)
- `src/utils/lazyImport.test.ts` (2)
- `src/components/commercial/client-portal/ClientInvoiceViewer.test.tsx` (1)
- `src/components/fabricator/EngineeringBayWrapper.save.test.tsx` (1)
- `src/components/fabricator/SavePoseActions.test.tsx` (1)
- `src/hooks/fabricator/__tests__/useEgyptianPredictiveGrid.test.ts` (1)
- `src/lib/catalog/UnifiedProfileCatalog.purchase.test.ts` (1)
- `src/pages/fabricator/studio/ManufacturingApprovalsPage.scroll.test.tsx` (1)

#### S6 — single-purpose UI files (8)

- `src/components/fabricator/QuickReportsPanel.tsx` (2)
- `src/components/fabricator/hardener/HardenerSelectionPanel.tsx` (1)
- `src/components/fabricator/MassProductionDashboard.tsx` (1)
- `src/components/fabricator/ReplayVerificationPanel.tsx` (1)
- `src/components/fabricator/supplier/ProfileSuggestionsPanel.tsx` (1)
- `src/components/services/ServiceCard.tsx` (1)
- `src/pages/admin/TheFoundry.tsx` (1)

#### S7 — Yilmaz cut-list adapters (3)

- `src/integrations/yilmaz/CNCCutListGenerator.ts` (1)
- `src/integrations/yilmaz/DCCutListGenerator.ts` (1)
- `src/integrations/yilmaz/YilmazCutListAdapter.ts` (1)

### Wave 2 review — accepted

All 21 files stayed inside S5–S7. ESLint on those files passed `--max-warnings 0` (exit 0, no output). The 11 S5 test files passed 51 tests.

S5 keeps `act` thenable by returning `Promise.resolve()` from the callback, and test doubles that callers await still return promises. S6 drops `async` on handlers whose callers use `void`, and keeps a thenable where `MassProductionOptimizer` awaits `projectLoader` and where `ServiceCard` uses `.then`. The replay stub throws synchronously; `replayComputation` accepts `Promise<T> | T` and does not call the stub. S7 keeps promise returns. Failed Yilmaz validation uses `Promise.reject`, which matches the old `async` function: the caller gets a rejection rather than a synchronous throw.

### Wave 3 — three disjoint Spark chats

Same `require-await` rule. These files were unmodified at review time and contained only that rule on the 2026-11-06 report. Still held: payments, economics, `Tier3Validator.ts`, advisory code, constitutional paths, and the Maalem teaching, reasoning, cognition, and workshop-NLP engines.

#### S8 — small libraries (12)

- `src/lib/exports/windowSnapshotGenerator.ts` (2)
- `src/lib/geolocation/LocationService.ts` (2)
- `src/lib/profile/ProfileDataSheetParser.ts` (2)
- `src/lib/3d/materials/TextureLibrary.ts` (1)
- `src/lib/3d/mullionConstraintSolver.ts` (1)
- `src/lib/mobile/MobileMeasurementSync.ts` (1)
- `src/lib/performance/PerformanceMetricsAggregator.ts` (1)
- `src/lib/yilmazScraper.ts` (1)
- `src/lib/nlp/EgyptianDialectDetector.ts` (1)

#### S9 — presets, trust, guild (7)

- `src/lib/presets/SandDustProtectionEngine.ts` (1)
- `src/lib/presets/SegmentReinforcementCalculator.ts` (1)
- `src/lib/presets/StructuralAnalyzer.ts` (1)
- `src/lib/presets/ThermalBreakOptimizer.ts` (1)
- `src/lib/trust/TrustMetricsService.ts` (2)
- `src/lib/trust/EgyptianTrustScoring.ts` (1)
- `src/lib/guild/GuildSystem.ts` (1)

#### S10 — memory, ledger, analytics, learning (22)

- `src/lib/data/collect-maalem-data.ts` (5)
- `src/lib/memory/EgyptianOralTraditionMemory.ts` (4)
- `src/lib/realityos/EventLedger.ts` (4)
- `src/lib/analytics/WorkshopPerformanceAnalytics.ts` (3)
- `src/lib/learning/KnowledgeValidator.ts` (3)
- `src/lib/verification/EgyptianVerificationDialog.ts` (3)

### Wave 3 review — accepted

All 22 files stayed inside S8–S10. ESLint on those files passed `--max-warnings 0` (exit 0, no output). Pattern matches Wave 1–2: drop `async`, keep `Promise<T>`, wrap returns (and void methods) in `Promise.resolve(...)`. Catch paths in `windowSnapshotGenerator.ts` also return thenables. `encodeAsEgyptianMemory` correctly stayed `async` because it still awaits the creators. Keeping Promise signatures on currently uncalled stubs is intentional; do not convert those to sync.

Wave 1–3 together cleared the pure `require-await` pile that was clean of other rules, except the seven files below. Remaining `require-await` mostly sits in mixed files next to `no-unsafe-*` / `no-explicit-any`; those batches must fix only `require-await` and leave the other warnings.

### Wave 4 — three disjoint Spark chats

#### S11 — last pure `require-await` files (11)

- `src/lib/supplychain/SupplyChainIntelligence.ts` (3)
- `src/lib/intelligence/ShapeInferenceEngine.ts` (2)
- `src/lib/intelligence/SupplierIntelligence.ts` (2)
- `src/lib/ai/EquipmentRecommendationEngine.ts` (1)
- `src/lib/conversation/HumanConversationEngine.ts` (1)
- `src/lib/personality/EgyptianResponseTranslator.ts` (1)
- `src/localization/turkish/TRYCurrencyCalculator.ts` (1)

#### S12 — `require-await` only; leave the one `no-explicit-any` (13)

- `src/machine-connectors/RemoteSupportLauncher.ts` (6 require-await, 1 any)
- `src/modules/commercial/ERPBridge.ts` (6 require-await, 1 any)
- `src/lib/api/analytics.ts` (2 require-await, 1 any)

After lint, these three files may still show their `no-explicit-any` warnings. Do not touch those lines.

#### S13 — `require-await` only in CNC adapters (10)

Leave every non-`require-await` warning.

- `src/lib/cnc/CNCIntegration.ts` (4 require-await among 7 total)
- `src/lib/cnc/adapters/ElumatecAdapter.ts` (3 among 6)
- `src/lib/cnc/adapters/YilmazAdapter.ts` (3 among 6)

### Wave 4 review — accepted

All 13 files stayed inside S11–S13. S11 is clean at `--max-warnings 0`. S12 leaves exactly the three `no-explicit-any` warnings. S13 leaves nine out-of-scope warnings (`any` / `no-unsafe-*` / one pre-existing `no-misused-promises` on a real-await `setInterval` callback).

S11 keeps thenable returns, including `Promise.reject` for the missing-supplier path. S13 keeps Promise signatures because `BaseCNCAdapter` awaits them. S12 is the one intentional sync narrowing: `endSession` / `cancelSession` / `requestEmailSupport`, the six ERPBridge sync methods, and `getDashboardData` became sync because no in-repo caller awaits them (ERPBridge `await` only appears in a doc comment; `jobsStore` awaits a ConnectivityFactory adapter, not ERPBridge). Future work should prefer `Promise.resolve` when unsure.

### Progress note

Waves 1–4 cleared the easy `require-await` work. Remaining `require-await` mostly lives in mixed files beside `no-unsafe-*`.

### Inventory baseline — 2026-11-06 (post Wave 1–4 recount)

Same checkout. Commands: `npm run lint:report`, then `node scripts/lint-inventory.mjs .eslint-report.json`.

**2,464 files, 0 errors, 13,194 warnings** (was 13,388). Cleared **194** warnings.

| Rule | Now | Was |
| --- | ---: | ---: |
| `@typescript-eslint/require-await` | 249 | 438 |
| `@typescript-eslint/no-misused-promises` | 30 | 34 |
| `@typescript-eslint/no-floating-promises` | 9 | 10 |
| `@typescript-eslint/no-unsafe-member-access` | 4,758 | 4,758 |
| `@typescript-eslint/no-unsafe-assignment` | 3,092 | 3,092 |
| `@typescript-eslint/no-explicit-any` | 2,289 | 2,289 |

Pure `require-await` files outside reserved/dirty trees: **0**. About 130 `require-await` remain in unmodified mixed files; the rest of the 249 sit in reserved or already-dirty live-schema paths.

### Inventory baseline — 2026-11-07 (post Wave 5, pre-PR)

Commands: `npm run lint:report`, then `node scripts/lint-inventory.mjs .eslint-report.json`.

**2,464 files, 0 errors, 13,148 warnings** (was 13,194 after Wave 4; was 13,388 at first Wave baseline). Cleared **240** from the first baseline.

| Rule | Now | After Wave 4 | First baseline |
| --- | ---: | ---: | ---: |
| `@typescript-eslint/require-await` | 203 | 249 | 438 |
| `@typescript-eslint/no-misused-promises` | 30 | 30 | 34 |
| `@typescript-eslint/no-floating-promises` | 9 | 9 | 10 |

Unsafe-`any` family unchanged (4,758 / 3,092 / 2,289). Pre-PR gates: frontend Vitest **361 files / 2262 tests passed** (2 files skipped, 4 expected fail, 14 skipped); backend pytest **266 passed, 17 skipped**.

### Wave 5 — three disjoint Spark chats

Fix **only** `@typescript-eslint/require-await`. Leave every other warning. Prefer `Promise.resolve(...)` / `Promise.reject(...)` over sync API narrowing. Do not edit reserved domain files.

#### S14 — tests and near-pure helpers (16)

Leave every non-`require-await` warning.

- `src/context/AuthContext.ownerIsolation.test.tsx` (5)
- `src/components/fabricator/PurchaseWizard.test.tsx` (3)
- `src/tests/components/fabricator/EngineeringBayValidationPerformance.test.ts` (3)
- `src/lib/exports/ExportService.ts` (3)
- `src/lib/regional/RegionalLocalizationEngine.ts` (2)

#### S15 — PDF export `require-await` only (14)

Leave `any` / `no-unsafe-*` / `no-misused-promises` in this file alone.

- `src/modules/reporting/PDFExportService.ts` (14 of 31)

#### S16 — connectivity / alerts / automation (16)

Leave every non-`require-await` warning.

- `src/lib/connectivity/ConnectivityGateway.ts` (6)
- `src/lib/analytics/alertSystem.ts` (6)
- `src/services/automation/ActionExecutor.ts` (4)

### Wave 5 review — accepted (S15 amended)

S14 and S16 used the preferred `Promise.resolve` / `Promise.reject` pattern. `ExportService.processQueue` / `processQueueItem` correctly went sync because callers already use `void`. Vitest on the three S14 suites: 11 passed.

S15 kept the methods `async` and inserted `await Promise.resolve();` at the top (CRLF edit constraint). Call sites already `await` those privates, so the extra microtask is safe. Out-of-scope warnings left alone. Coordinator follow-up: dropped `async` from the `img.onload` arrow that still had `require-await` (was not in the original 14-method list). `PDFExportService.ts` now has **0** `require-await` and 17 remaining out-of-scope warnings (including one `no-misused-promises` on `toBlob`).

Do not treat `await Promise.resolve()` as the default pattern for later waves; prefer drop-`async` + `Promise.resolve(...)` when the editor can rewrite the returns.

### Merge — PR #136 (2026-11-07)

Merged to `main` as `c74d0f76`. Waves 6–7 landed uncommitted on `chore/lint-require-await-wave6`. Post-Wave-7 inventory: **2,459 files, 0 errors, 13,039 warnings**, `require-await` **120**.

### Wave 8 — three disjoint Spark chats (S23–S25)

About **99** remaining `require-await` sit in reserved / wonder-full holds (pricing, tax, stock remnants, YDT, Maalem/NLP/cognition, economics, payments, constitutional, advisory, `QualityVerificationEngine`). Spark gets the remaining **~15** across **14** files.

Fix **only** `@typescript-eslint/require-await`. Leave every other warning. Prefer `Promise.resolve(...)` / `Promise.reject(...)`. Do not use `await Promise.resolve()` unless a multi-line rewrite is blocked. Do not edit reserved paths. Do not commit.

#### S23 — tests + invoice parser (5)

- `src/pages/fabricator/studio/ManufacturingApprovalsPage.settings.test.tsx` (1)
- `src/tests/integration/ticketing/ServiceSystemIntegration.test.ts` (1)
- `src/tests/lib/fabricator/executionService.test.ts` (1)
- `src/lib/inventory/InvoiceParser.ts` (2, pure)

#### S24 — fabricator UI pages (4)

Leave every non-`require-await` warning (these files are heavily mixed).

- `src/components/fabricator/Enhanced3DPreview.tsx` (1 among 78)
- `src/components/fabricator/ProfileImportTool.tsx` (1 among 92)
- `src/pages/fabricator/workflow/UnifiedDesignPage.tsx` (1 among 5)
- `src/pages/SystemPacksPage.tsx` (1 among 25)

#### S25 — libs / services / connector (6)

Leave every non-`require-await` warning.

- `src/core/notifications/NotificationService.ts` (1 among 58)
- `src/lib/fabricator/multiProfileDXFExtractor.ts` (1 among 72)
- `src/lib/redis/realtimeCacheInvalidator.ts` (1 among 101)
- `src/lib/sync/WorkspaceSynchronizer.ts` (1 among 26)
- `src/lib/ticketing/TicketGovernanceService.ts` (1 among 6)
- `src/machine-connectors/YilmazNetworkProtocol.ts` (1 among 44)

#### Wave 8 holds (not Spark)

`QualityVerificationEngine`, `SmartRemnantSystem`, `AutoRemnantGenerator`, `EngineeringBayConstitutionalCompliance.test.ts`, plus pricing/tax/YDT/Maalem/payments/economics/constitutional/advisory — wonder-full or later reserved waves.

### Wave 8 review — accepted (S23–S25)

All 14 assigned files on `chore/lint-require-await-wave6`, uncommitted. Coordinator ESLint: **0** `require-await`, **0** errors on those paths (515 other-rule warnings left alone). S23 vitest: **12 passed**. Preferred `Promise.resolve` / `Promise.reject` pattern; `InvoiceParser` / several libs normalized to LF during edit (content-only intent).

**Branch note:** Spark edits briefly landed on `fix/prod-ci-python-magic`; moved onto `chore/lint-require-await-wave6`. Waves 6–7 were lost on an earlier branch switch and **re-applied 2026-11-07** (S17–S22) alongside Wave 8.

### Waves 6–8 redo — accepted (2026-11-07)

All S17–S25 paths on `chore/lint-require-await-wave6`, uncommitted (**62** files including `LINTS.md`). Coordinator ESLint on the **61** source paths: **0** `require-await`, **0** errors, **0** parse errors. Vitest smoke (S17 + S19 ProductionCommand + S20 + S23): **15 files / 102 tests passed**. Full inventory: **2,459 files, 0 errors, 13,024 warnings**, `require-await` **105** (remainder is reserved / wonder-full). Preferred `Promise.resolve` / `Promise.reject` throughout; no `await Promise.resolve()` no-ops in the redo. `FabricatorTemplates.ts` parses clean. Do not commit until the user asks.

### Merge — PR #140 (2026-11-08)

Merged Waves 6–8 to `main`. Post-merge inventory unchanged for remaining work: **`require-await` 105**, all in reserved / wonder-full domains. Spark-safe open set: **0**. Next waves use careful reserved-domain editors on `chore/lint-require-await-wave9` (from `origin/main`).

### Waves 9–10 — reserved / wonder-full `require-await` only

Fix **only** `@typescript-eslint/require-await`. Leave every other warning. Prefer `Promise.resolve(...)` / `Promise.reject(new Error(...))`. Do not change AICS-001 control flow, IntelligenceGate decisions, pricing formulas, tax logic, or advisory recommendations beyond dropping unused `async` while keeping thenable returns. Do not commit.

#### S26 — Maalem / NLP / cognition (~27)

- `src/lib/nlp/EgyptianWorkshopNLP.ts` (11, pure)
- `src/lib/teaching/MaalemTeachingEngine.ts` (7, pure)
- `src/lib/reasoning/MaalemReasoningEngine.ts` (6, pure)
- `src/lib/cognition/EngineeringMind.ts` (1)
- `src/lib/cognition/FabricatorBrain.ts` (1)
- `src/lib/cognition/PlatformIntelligence.ts` (1)

#### S27 — YDT (~29)

- `src/lib/ydt/YDTCoreService.ts` (8)
- `src/lib/ydt/QuickStartYDT.ts` (7, pure)
- `src/lib/ydt/YDTCompetitiveTracker.ts` (6)
- `src/lib/ydt/YDTEnforcementService.ts` (4)
- `src/lib/ydt/HybridEgyptianMaalem.ts` (3)
- `src/lib/ydt/YDTBusinessLayer.ts` (1)

#### S28 — constitutional / Tier3 / QC (~14)

- `src/lib/constitutional/WiringValidator.ts` (4)
- `src/tests/constitutional/GuaranteeVerification.test.ts` (3)
- `src/lib/constitutional/PositionStateSyncService.ts` (2)
- `src/lib/fabricator/QualityVerificationEngine.ts` (2, pure)
- `src/lib/constitutional/__tests__/AuditLogRotation.test.ts` (1)
- `src/lib/import/Tier3Validator.ts` (1, pure)
- `src/tests/components/fabricator/EngineeringBayConstitutionalCompliance.test.ts` (1)

#### S29 — pricing / payments / economics (~23)

- `src/lib/pricing/PricingProvenanceService.test.ts` (8)
- `src/services/payments/PaymentLinkGenerator.ts` (4, pure)
- `src/lib/pricing/SystemPricingService.provenance.test.ts` (2)
- `src/services/payments/PaymentService.ts` (2)
- `src/components/fabricator/EnhancedPricingConfigDialog.tsx` (1)
- `src/components/fabricator/PricingTuningStudio.tsx` (1)
- `src/lib/economics/CashFlowOptimizer.ts` (1)
- `src/lib/economics/InflationProtector.ts` (1)
- `src/lib/economics/ScrapValueEngine.ts` (1)
- `src/lib/pricing/PricingEngine.ts` (1 among 124)
- `src/lib/pricing/RealTimeQuoteCalculator.ts` (1)

#### S30 — advisory / remnants (~10)

- `src/tests/integration/ticketing/Wave2AdvisoryIntegration.test.ts` (3)
- `src/components/ticketing/advisory/dashboard/AdvisoryDashboard.tsx` (2)
- `src/future/advisory/AIQualityPredictor.ts` (2, pure)
- `src/lib/inventory/SmartRemnantSystem.ts` (2)
- `src/future/advisory/RemnantUsagePredictor.ts` (1)
- `src/lib/inventory/AutoRemnantGenerator.ts` (1)
- `src/tests/performance/ticketing/AdvisoryPerformanceBenchmark.test.ts` (1)

### Waves 9–10 review — accepted (2026-11-08)

All S26–S30 paths on `chore/lint-require-await-wave9`, uncommitted. Coordinator ESLint (`--no-cache`) on the **37** reserved paths: **0** `require-await`, **0** errors, **0** parse errors. Full inventory after Waves 9–10: **2,459 files, 0 errors, ~12,933 warnings**, and **`@typescript-eslint/require-await` is gone from the project** (0).

Coordinator follow-ups applied: YDT `Promise.reject(error)` sites wrapped for `prefer-promise-reject-errors`; pricing/economics `new Promise(resolve => resolve(sync()))` simplified to `Promise.resolve(sync())`. Formulas / gate / advisory logic unchanged beyond async drops.

Vitest in this environment fails suite load with `TypeError: ... reading 'config'` (vitest/`@vitest/*` version skew) — not attributed to these edits. S27 agent had previously reported `src/lib/ydt` 16 tests green before the skew manifested. Do not commit until the user asks.

### Merge — PR #142 (2026-11-08)

Merged Waves 9–10 to `main` as `709acd90`. **`require-await` is 0 project-wide.** Next rule family: `@typescript-eslint/no-misused-promises` (30) and `@typescript-eslint/no-floating-promises` (9). Branch: `chore/lint-promise-misuse-wave1`.

### Wave P1 — promise misuse / floating (39)

Fix **only** `no-misused-promises` and `no-floating-promises`. Leave every other warning. Preferred patterns:
- Event / callback expecting `void`: wrap with `void fn()` or `(...args) => { void fn(...args); }` — do not leave floating promises.
- Fire-and-forget: prefix with `void` and ensure `.catch` / logged rejection where failures matter.
- Do not disable rules. Do not commit.

#### P1a — redis + python client + scheduler (20)

- `src/lib/redis/realtimeCacheInvalidator.ts` (11 misused)
- `src/lib/api/pythonHeavyClient.ts` (6 floating)
- `src/services/automation/AutomationScheduler.ts` (3 misused)

#### P1b — UI / hooks / pages (9)

- `src/core/activity/ActivityTimeline.tsx` (1 misused, 1 floating)
- `src/components/admin/panels/CatalogAdminPanel.tsx` (1 floating)
- `src/components/services/YilmazMachineRegistration.tsx` (1 misused)
- `src/components/support/TicketWizardDialog.tsx` (1 misused)
- `src/components/ui/ProjectTemplates.tsx` (1 misused)
- `src/hooks/useAutoSave.ts` (1 misused)
- `src/hooks/useJobStatus.ts` (1 floating)
- `src/pages/SystemPacksPage.tsx` (1 misused)

#### P1c — libs / connectors (8)

- `src/integrations/yilmaz/YilmazCNC.ts` (1)
- `src/lib/cnc/CNCIntegration.ts` (1)
- `src/lib/collaboration/3dCollaborationService.ts` (1)
- `src/lib/fabricator/performanceOptimizer.ts` (1)
- `src/lib/fabricator/ProductionWorkflow.ts` (1)
- `src/lib/import/ProfileImporter.ts` (1)
- `src/lib/workspace/WorkspaceSyncService.ts` (1)
- `src/modules/reporting/PDFExportService.ts` (1)

#### P1d — reserved (2)

- `src/components/ticketing/advisory/dashboard/AdvisoryDashboard.tsx` (1 misused)
- `src/lib/constitutional/PositionStateSyncService.ts` (1 misused)

### Wave P1 review — accepted (2026-11-08)

All P1a–P1d paths on `chore/lint-promise-misuse-wave1`, uncommitted (**22** files including plan). Coordinator ESLint (`--no-cache`) on the **21** source paths: **0** `no-misused-promises`, **0** `no-floating-promises`, **0** errors. Full inventory: **2,459 files, 0 errors, 12,881 warnings** — both promise rules are **gone project-wide**. Fixes used `void` wrappers / sync callbacks around async work; no rule disables. Do not commit until the user asks.

### Wave P2 — small leftover rules (58)

Fix **only** these rules (leave `no-unsafe-*` / `no-explicit-any` alone):
- `@typescript-eslint/no-unnecessary-type-assertion` (39)
- `@typescript-eslint/unbound-method` (9)
- `@typescript-eslint/no-base-to-string` (6)
- `react-hooks/exhaustive-deps` (3)
- `@typescript-eslint/restrict-template-expressions` (1)

Patterns: drop redundant `as` casts; for unbound-method in tests use `vi.mocked` / bind / extract; for base-to-string / restrict-template coerce safely (`String(x)` / narrow); for exhaustive-deps fix deps without changing intentional behavior. Do not disable rules. Do not commit until coordinator says so.

### Wave P2 review — accepted (2026-11-08)

P2a–P2c completed on `chore/lint-promise-misuse-wave1` (P2c agent hit a model-limit error after edits landed; coordinator confirmed `unbound-method` 0). Committed with P1 as `3d8c76e6`. Full inventory: **2,459 files, 0 errors, 12,804 warnings**. Cleared project-wide (all **0**): `no-misused-promises`, `no-floating-promises`, `no-unnecessary-type-assertion`, `unbound-method`, `no-base-to-string`, `exhaustive-deps`, `restrict-template-expressions`. Remaining mass is the `no-unsafe-*` / `no-explicit-any` family.

### Merge — PR #143 (2026-11-08)

Merged P1–P2 to `main` as `ca4ed82f`.

### Wave T1–T3 — `no-explicit-any` only (any-only files)

Spark batches on `chore/lint-type-safety-wave1` (rebased onto PR #143). Fix **only** `@typescript-eslint/no-explicit-any` on files that had no other type-safety rules.

### Wave T1–T3 review — accepted (2026-11-08)

**48** files uncommitted on `chore/lint-type-safety-wave1`. Coordinator ESLint (`--no-cache`) on all T1–T3 paths: **0** `no-explicit-any`, **0** errors, **0** warnings. `npm run type-check` **PASS** (node clean; app no baseline regression).

Coordinator follow-up: T1’s `hingeUtils` `[key: string]: unknown` clashed with `lib/3d` `HardwarePlaceholder` (`Window3DGenerator` TS2345). Replaced with a structural `HingePlaceholderLike` + generic `findSashHinges<T>` so Vector3 positions stay compatible. No `as any`, no rule disables, no baseline edits. Do not commit until the user asks.

Committed as `6ef8008b` on `chore/lint-type-safety-wave1`. Post-T1–T3 inventory: **12,713** warnings, `no-explicit-any` **2,192**. Pure any-only open set is nearly exhausted (~18). Next Spark wave (T4–T6) finishes those, then starts mixed files with **fix only `no-explicit-any`** and leave `no-unsafe-*` alone.

### Merge — PR #144 (2026-11-08)

Merged T1–T3 to `main` as `71a1f3ce`.

### Wave T4–T6 review — accepted (2026-11-08)

**39** fixed files uncommitted on `chore/lint-type-safety-wave1` (fast-forwarded onto PR #144). Coordinator ESLint: **0** `no-explicit-any`, **0** errors, **0** warnings on those paths. `npm run type-check` **PASS**. Correct skip: `TicketWizardWithYDT.tsx` (YDT reserved; still 1 `any`). Paired `no-unsafe-*` clears on the same expressions are expected side effects, not scope creep. Do not commit until the user asks.

### Wave T7–T9 — mixed singles / small multi (`any` only)

Post-T4–T6 working-tree inventory: ~**1,798** open `any` outside reserved. Spark gets low-coupling mixed files: fix **only** `no-explicit-any`; leave `no-unsafe-*`. Skip constitutional tests, YDT/advisory/pricing/tax.

### Wave T7–T9 review — accepted (2026-11-08)

**64** fixed files uncommitted on `chore/lint-type-safety-wave1` (T7: 18, T8: 28, T9: 18; stacked on uncommitted T4–T6). Coordinator ESLint (`--no-cache`):

| Wave | `no-explicit-any` | remaining `no-unsafe-*` (left alone) | errors |
|------|-------------------|--------------------------------------|--------|
| T7   | **0**             | 3 (ReportGenerator JSON.parse; button-gold-tier children.props) | 0 |
| T8   | **0**             | 4 (VisualCustomizer, cacheHelper, PDF cutlist test ×2) | 0 |
| T9   | **0**             | **0** (paired clears only) | 0 |

`npm run type-check` **PASS** (0 new signatures). Spot-check: no `as any`, no `eslint-disable` for `no-explicit-any` on the 64 paths. Notable flags (not blockers): `regionalConfig` currency `.locale` always undefined at runtime (preserved); DesignTemplatesLibrary / FabricationReportGenerator tighten crash paths. Do not commit until the user asks.

Post-T7–T9 inventory (working tree, includes uncommitted T4–T6): **2,459** files, **0** errors, **12,464** warnings; `no-explicit-any` **2,060** (~**1,757** Spark-safe); buckets: singles **61**, multi 2–3 **126**, multi 4–6 **109**, multi 7+ **76**.

### Wave T10–T12 — corrected scope (supervisor 2026-11-08)

Stay on `chore/lint-type-safety-wave1`. Preserve uncommitted T4–T9. No commit/merge/deploy.

**Pre-dispatch** (`71a1f3ce`, dirty **106**, ahead **1**): assigned **26** files all still have `no-explicit-any`; total **36** `any` / **224** `no-unsafe-*` on those paths; assigned files otherwise clean of prior-wave edits. Provenance: `.lint-wave-provenance/t10t12-before.json`.

**Holds (deferred, not approved):** DraftingWorkbench; CNC/network; production workflows; stock mutations; QC/release (`qualityApproval`, `positionRelease`, …); pricing/tax; YDT; advisory; `FreightCalculator`; Ambiguous commercial/evidence clients until classified.

**T10** — 10 UI/presentation singles (verified 1 `any` each).
**T11** — 11 util/geometry/data singles (verified 1 `any` each).
**T12** — 5 bounded UI multi (verified 3 `any` each). Notes: `MacroRecorderPanel` L93 executor = type as `RecordedAction` only or skip (no replay/semantic edits; do not edit `MacroRecorder.ts`). `FabricatorCustomersPanel` already uses `Database` Insert/Update — remove `as any` only if existing typed client accepts it; else skip (no invented DB contracts).

Common Spark rules: target rule only; no double-assert/baseline/disable/behavior change; paired unsafe clears OK; new unsafe not OK; skip sites needing validation/ownership/manufacturing/shared-contract changes. Distinguish “target rule cleared” from “file warning-free”.

### Wave T10–T12 review — accepted (2026-11-08)

Coordinator ESLint (`--no-cache` JSON) + `npm run type-check` **PASS** (0 new signatures). No `as any` / disables on completed paths. Diff: **24** files (+88/−45) for completed work; `smartCategories.ts` / `emailTemplates.ts` unchanged (held).

| Wave | Status | `any` | Notes |
|------|--------|-------|-------|
| T10 | **complete** 10/10 | **0** | Remaining unsafe on MobileTicketCreator (3), MachineRegistration (4), NodeEditor (13), Products (3) — pre-existing, not warning-free |
| T11 | **partial 9/11 completed** | completed files **0**; held files still **1 each** | **Held (explicit):** `src/constants/smartCategories.ts`, `src/services/email/emailTemplates.ts` — shared index contracts; not in commit scope. Geometry/export tests reported green by Spark |
| T12 | **complete** 5/5 | **0** | CustomersPanel: removed redundant casts atop `createClient<any>` (no invented DB types). MacroRecorder: `RecordedAction` on executor only; `MacroRecorder.ts` untouched |

**Still held:** DraftingWorkbench, CNC/network, production/stock/QC/release, pricing/tax, YDT, advisory, `smartCategories`, `emailTemplates`, and deferred classification list from supervisor.

Post-T10–T12 inventory (working tree): **2,459** files, **0** errors, **12,304** warnings; `no-explicit-any` **2,026** (~**1,709** Spark-safe under corrected holds); singles **38**, multi 2–3 **119**, multi 4–6 **108**, multi 7+ **76**.

### Checkpoint prep — T4–T12 (2026-11-08, awaiting CEO auth)

Proposed title: `chore: reduce explicit any across lint batches T4–T12`

**Manifest reconciled:** **127** completed source files + `docs/plans/LINTS.md` = **128** paths. Exact list: `.lint-wave-provenance/t4t12-commit-manifest.txt`.
**Excluded from staging:** `output/pdf/optimization-cutlist-diagnostic.pdf` (test artifact), `.lint-wave-provenance/`, `shield-hackathon/`.
**Not in scope / held:** `TicketWizardWithYDT.tsx` (never edited), `smartCategories.ts`, `emailTemplates.ts`.

**Targeted eslint** on 127 sources: **0** errors, **0** `no-explicit-any`, **53** residual `no-unsafe-*` across **13** files — do **not** describe the batch as warning-free. **114/127** files happen to be warning-free after paired clears; that is not the acceptance claim.
**Type-check:** PASS (0 new signatures).
**git diff --check:** PASS after stripping trailing whitespace on 5 touched lines.
**Diffstat:** 128 files, +427/−224.

**Behavior-test verification (coordinator re-run):** **BLOCKED** in this environment — Vitest fails suite load with `TypeError: ... reading 'config'` (known `@vitest/*` skew; not attributed to these edits). Spark-session reports previously claimed green subsets (T8/T10/T11/T12); those are not re-confirmed here. Treat as disclosed verification gap, not a test pass.

**Review notes for CEO:** no rule disables, no baseline/config edits, no `as any` in source scope. ~61 `as unknown as` bridges remain (mostly 3D/chart ref and API bridges replacing prior `as any`). Intentional stricter UI paths: DesignTemplatesLibrary requires grid before save; FabricationReportGenerator skips comparison panel when KM-212/`yilmaz` absent. `ManualCuttingPacketGenerator` gray fill uses equal RGB. Invalid material/userType strings now narrow to `undefined` instead of flowing unchecked.

Do not commit or open a PR until the CEO authorizes.

### Merge — PR #145 (2026-11-08)

Merged T4–T12 (+ DualWrite CI fingerprint fix) to `main` as `00a7ae12`.

### Wave T13–T15 — prepared, not dispatched (2026-11-08)

Post-merge inventory on `main` @ `00a7ae12`: **2,459** files, **0** errors, **12,304** warnings; `no-explicit-any` **2,026** (matches prior reference). Spark-safe singles after holds/exclusions: **16** (only). Commercial evidence clients and DB `supabase as any` sites remain deferred.

**Still held:** `smartCategories.ts`, `emailTemplates.ts`, DraftingWorkbench, CNC/machine converters, production dashboards/commands, stock/QC/release, pricing/tax, YDT/advisory/constitutional, `clientCore`/`performanceMonitoring`/`PurchaseWizard`/`deliveryAcknowledgement` (typed-client gaps), `YilmazEgyptRules`, commercial `loadSavedOptimizationEvidence*` / `poseQuotesClient`.

Batches sized to available low-risk singles (≤10 each); no edits dispatched.

### Wave T13–T15 review — pending commit (2026-11-08)

Branch `docs/lint-t13t15-prep` @ docs tip `eca1fde6`; source edits uncommitted.

**Attribution:** T13 = six-file report; T14 = t1; T15 = t2. `t1-before.json` reconstructed via HEAD swap (baseline `eca1fde6`).

**Accepted (13):** T13 all 6 (ProfileScannerUploader catch restored to `.message` access via `{ message: string }` assert); T14 all 5; T15 `SmartMeasuringInterface`, `resolveSystemPackProfiles`.

**Held (3):** `UnifiedDesignPage` + `GlazingSpecFlat.spacer`; `ProjectSummaryDashboard`; `EnhancedCalibrationManager`. Plus earlier holds.

**Paired clears:** on the 13 accepted files, inventory delta vs post-PR145 = **−13 any** and **−72 no-unsafe-***; **0 rises**; **0** changes outside those files (confirmed in `.lint-wave-provenance/t13t15-paired-clears.json`).

**Geometry contract:** `getGeometryAriaLabel(type, element)` — TS does not correlate params; no in-repo callers; case casts assume caller keeps discriminant consistent (same runtime risk as prior `any`).

**Gates:** targeted eslint `any` 0 / errors 0 / residual unsafe remain; `npm run type-check` PASS; `git diff --check` PASS.

**Vitest diagnosis:** project `vitest@4.1.12` fails suite collect (`getRunner()` undefined → `runner.config` in `@vitest/runner` `initSuite`); reproduced on one-line smoke. Final-state suites **20/20 PASS** under local provenance harness `vitest@3.2.4` (`.lint-wave-provenance/vitest3-runner/`, no package.json change). Package vitest pin repair is a separate track.
