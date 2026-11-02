# Root organization and deletion audit — 2 November 2026

Base: main `7b169ec096b064348da7cffb3689e012d18f39e4`. Branch: `codex/root-organization`. The original `cursor-nov-qty-evidence-layout` checkout and its untracked local files are untouched.

## Result

Tracked root files: **175 → 95**. Removed **67 files / 15,576,933 bytes** of unreferenced console exports, downloaded build snapshots, a desktop shortcut and an obsolete one-off deletion helper. Moved **13 retained files** into documentation/tooling folders. This reduces checkout clutter, not Git history size or a measured browser bundle/runtime cost.

## Evidence and boundaries

- Generated text exports were classified by their console/test/lint/build content and root-report naming. Tracked filename references were inventoried without publishing their contents. Unreferenced exports were removed; reports named in the historical lint plan were archived and the links updated.
- `index-DckkseTE.js`, `vendor-prod.js`, its map and `animation_asset.js` are downloaded/minified build snapshots. Filename/stem scans found no consumers. Active Vite input remains `index.html` → `src/main.tsx`; PWA globbing is confined to dist, and catalogue/release scripts read the built output rather than these root files.
- `live_site.html` is an unreferenced downloaded page. `projects - Shortcut.lnk` is a desktop shortcut, not source. `delete-file.js` is an unreferenced one-off helper that deletes a specific algorithm source file; it was removed without executing it or deleting its target module.
- The Redis helpers have no relative project imports; current-working-directory dotenv behavior is retained. Their syntax and external dependency resolution were checked without making network calls or cache mutations.
- The optional PowerShell installer is relocated byte-for-byte; its destinations are based on user-profile/environment paths, not its old root directory. It was parsed without execution.
- The diagram generator now uses its own file location to select the documentation output folder. Regeneration exposed three stale source labels; those were aligned with the existing SVGs. Regenerated illustrations match their prior tracked content and no SVG is recreated at root.
- Private/untracked local files, environment files, migrations/SQL, manufacturing sources, runtime knowledge, deployment descriptors and unrelated branch work were not removed or relocated. No blanket zero-byte or recursive cleanup tool was run.

## Exact moves

| Old root path | New path |
| --- | --- |
| `COMMIT_MESSAGE.txt` | `docs/archive/commit-messages/COMMIT_MESSAGE.txt` |
| `FINAL_COMMIT_MESSAGE.txt` | `docs/archive/commit-messages/FINAL_COMMIT_MESSAGE.txt` |
| `lint_output.txt` | `docs/archive/root-reports/lint_output.txt` |
| `lint_report.txt` | `docs/archive/root-reports/lint_report.txt` |
| `temp_plan_list.txt` | `docs/archive/root-reports/temp_plan_list.txt` |
| `env-check.ts` | `scripts/diagnostics/redis/env-check.ts` |
| `check-redis-env.ts` | `scripts/diagnostics/redis/check-redis-env.ts` |
| `test-cache-performance.ts` | `scripts/diagnostics/redis/test-cache-performance.ts` |
| `generate_diagrams.py` | `scripts/documentation/generate_diagrams.py` |
| `architecture_overview.svg` | `docs/architecture/diagrams/architecture_overview.svg` |
| `dual_output_engine.svg` | `docs/architecture/diagrams/dual_output_engine.svg` |
| `ydt_intelligence_flow.svg` | `docs/architecture/diagrams/ydt_intelligence_flow.svg` |
| `download.ps1` | `scripts/setup/install-blackbox-cli.ps1` |

## Exact removals

| Root file | Bytes |
| --- | ---: |
| `backend_test_output.txt` | 1,353 |
| `build_output.txt` | 2,040 |
| `constitutional_test_results.txt` | 149,980 |
| `debug_failures.txt` | 14,514 |
| `e2e_api_fix.txt` | 23,054 |
| `e2e_arabic_error.txt` | 23,578 |
| `e2e_current_error.txt` | 23,430 |
| `e2e_cuts_error.txt` | 23,602 |
| `e2e_debug_final.txt` | 22,826 |
| `e2e_debug_log.txt` | 14,470 |
| `e2e_error.txt` | 17,212 |
| `e2e_error_2.txt` | 13,654 |
| `e2e_error_3.txt` | 13,800 |
| `e2e_error_log.txt` | 22,904 |
| `e2e_final_debug.txt` | 24,238 |
| `e2e_final_failures.txt` | 22,642 |
| `e2e_mock_error.txt` | 22,696 |
| `e2e_smoke_output.txt` | 2,215 |
| `failures_5.txt` | 12,238 |
| `failures_6.txt` | 12,238 |
| `failures_7.txt` | 9,680 |
| `frontend_test_output.txt` | 2,853,797 |
| `full_test_report.txt` | 2,325,046 |
| `hardener_test_output.txt` | 28,484 |
| `lint-output.txt` | 80,498 |
| `lint-report.txt` | 9,400 |
| `lint-sample.txt` | 73 |
| `lint-warnings-2.txt` | 27,760 |
| `lint-warnings-3.txt` | 43,866 |
| `lint-warnings-4.txt` | 21,938 |
| `lint-warnings-remaining.txt` | 18,811 |
| `lint-warnings.txt` | 34,170 |
| `lint.txt` | 11,840 |
| `lint_compact.txt` | 0 |
| `lint_final.txt` | 10,688 |
| `lint_final_v2.txt` | 8,530 |
| `lint_full.txt` | 11,704 |
| `lint_output_2.txt` | 3,168 |
| `lint_output_utf8.txt` | 7,889 |
| `test_all_v1.txt` | 725,948 |
| `test_detail.txt` | 22,654 |
| `test_detail_v2.txt` | 22,656 |
| `test_detail_v3.txt` | 18,124 |
| `test_failure_log.txt` | 24,372 |
| `test_failures_2.txt` | 20,024 |
| `test_failures_3.txt` | 17,194 |
| `test_output.txt` | 1,705 |
| `test_output_2.txt` | 1,283 |
| `test_output_3.txt` | 32,503 |
| `test_output_debug.txt` | 4,956 |
| `test_output_final.txt` | 235 |
| `test_output_log.txt` | 2,257 |
| `test_output_log_2.txt` | 2,033 |
| `test_output_log_3.txt` | 199 |
| `test_output_v2.txt` | 13,588 |
| `test_report.txt` | 5,556,604 |
| `test_summary.txt` | 6,508 |
| `ui-lint.txt` | 588 |
| `unit_test_output.txt` | 2,494 |
| `verification_error.txt` | 2,058 |
| `animation_asset.js` | 157,063 |
| `index-DckkseTE.js` | 1,094,590 |
| `vendor-prod.js` | 1,871,107 |
| `vendor-prod.js.map` | 84 |
| `live_site.html` | 4,891 |
| `projects - Shortcut.lnk` | 720 |
| `delete-file.js` | 469 |

## Verification

Twelve moved files retain their existing content; only the diagram generator needs a path/label correction. Generator output was checked against the tracked SVGs from an unrelated working directory, with no output placed in that directory or the root. Diagnostic transpilation/import-resolution checks and PowerShell parser checks pass. Updated historical report links and relocated command paths are checked. On the project-supported Node 22.22.2 runtime: the full build passed, including two public catalogue pages, 94 machine documents and release-asset processing. The workflow suite passed 53 tests across 11 files and the admin accessibility suites passed 15 tests across two files (68 focused tests). The full type-regression gate passed with 7 existing application errors against the unchanged 1,791-error baseline, zero new signatures/increases, and clean node-project types. This is not type-clean. Secret scan, 19 relative-link checks, exact-path ignore checks and diff checks passed. Existing large-chunk, manualChunks input-option and browser node:crypto warnings remain.

## Next deletion review

The October 19 list of 698 static-graph candidates is historical and must not be reused as a current deletion list. Any further source cleanup needs a refreshed graph and review of workers, scripts, tests, direct URLs, platform clients and implicit consumers. Root manual images/JSON/PDF samples and deployment/SQL variants remain purpose-review candidates, not confirmed trash. Preserve needed fixtures and deployment contracts; remove or relocate only with consumer evidence in the same change.

See [Project layout](../PROJECT_LAYOUT.md) for the intended folder structure. The root count above covers tracked files in this branch; it does not include, delete or reorganize pre-existing private/untracked files in the original workspace.

### Validation runtime note

The host default Node 22.17 is below package.json's `>=22.19 <23` engine range. Its first build compiled Vite successfully but failed at the existing catalogue script's native TypeScript import. The final build and tests used the README-recommended Node 22.22.2 from a portable runtime verified against the official SHA256 list, stored only in ignored `.artifacts/root-organization/runtime/`. No source workaround, global Node install or dependency update was introduced. Both the supported-runtime and original-host type checks reported the same seven existing application errors.
