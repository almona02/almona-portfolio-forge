# Fabrication scalability and architecture review

Date: 2026-10-18. Scope: static inspection of this checkout and the supplied GitDiagram image. This is not a load-test result or certification of deployed capacity.

## Diagram reconciliation

The diagram correctly groups Fabricator Pro, machinery/service, technical intelligence and commercial reporting. Its named EngineeringBay, systemPacks, ReportEngine, PricingEngine and QuotingEngine files exist. It is a product overview, not a deployment or complete data-flow diagram.

- The active router is `src/App.tsx`. The core workflow uses project and position identity under `/fabricator/studio/projects/:projectId/positions/:poseId/`, with measuring, design, BOM, optimization, commercial and production stages. QC, delivery and stock are additional operational concerns absent from the image.
- BOM calculation has a dedicated `src/workers/BOMCalculation.worker.ts`; DXF parsing also has a worker. A worker file's presence alone does not prove every UI path uses it.
- Backend selection is more complex than the image's `app.py`: `api.prestige_endpoints:app`, `apis.main:app` and `apis.v2.app:app` exist. Docker targets disagree. The October 16 infrastructure audit identified the configured Railway Dockerfile.realistic target as apis.main:app; verify current image/deployment metadata before changing routing or scale settings.
- Profile scanning lives in `python_backend/ai_services/scanning/scale_engine/pipeline.py`. Technical assistance must remain separate from approved manufacturing inputs.
- The image omits persistence/auth, cache, background workers, deployment boundaries and operational telemetry. See the README architecture diagram for these layers.

## Prioritized improvements

| Priority | Evidence / opportunity | Upgrade and acceptance evidence |
| --- | --- | --- |
| P0 | Multiple FastAPI app targets and Celery configurations (`python_backend/celery_app.py`, `core/celery_app.py`) | Select and document the deployed API and worker targets; test one reproducible image, readiness probes and queue routing before increasing replicas. |
| P0 | Baseline-delta type checking permits existing application errors | Keep the regression gate; reduce the baseline by workflow boundary, prioritizing units, IDs, BOM and release authorization. Require strict checking for repaired modules and deterministic replay for calculation changes. |
| P1 | BOM, scanning, optimization and reports have different CPU/memory demands | Benchmark each separately; use bounded job queues, per-workshop concurrency, cancellation, timeouts and job IDs. Retry only idempotent work; verify that retries cannot consume stock or release production twice. |
| P1 | `PerformanceOptimizer.cacheSet` does not enforce the configured 50-entry limit; cleanup is a separate call | Enforce eviction on writes, scope keys by validated inputs/system revisions and clear scoped data on identity changes. Test memory growth during a long workshop shift. The helper is used by `Enhanced3DPreview`. |
| P1 | `PerformanceOptimizer.debounce` leaves superseded callers' promises pending; worker wrapper starts a worker per call without a timeout | Define cancellation/settlement semantics and add bounded worker reuse with request correlation. Test rapid edits, worker crashes and stale responses before integrating into authoritative calculations. |
| P1 | Existing lazy routes, manual chunks, virtual-table dependency and workers already provide useful foundations | Measure route chunks with `npm run build:analyze`; inspect actual startup imports of 3D, TensorFlow, PDF and spreadsheet libraries. Virtualize measured large lists; benchmark transfer/copy overhead before moving more work into workers. |
| P1 | No capacity benchmark was run in this review | Create small, medium and large representative jobs; record p50/p95/p99 latency, peak RSS/browser heap, event-loop delay, queue wait and failure rate under concurrent workshops. Set budgets from workshop needs, then repeat at increasing concurrency until saturation. |
| P2 | React 18.3 and React Three Fiber 8 are coupled; Node engine range excludes 24 | First update to a patched Node 22 runtime within current constraints. Evaluate Node 24 and React 19 in separate compatibility changes, including renderer/reconciler peers, CAD interactions, export and deterministic replay. Avoid a bulk major-version upgrade. |

## SEO corrections and remaining work

The shared SEO component previously emitted numeric accuracy, waste, time-saving and ROI claims, a software version and aggregate rating without supporting evidence in the reviewed component. These were removed. Default descriptions now explain actual workflow capabilities; social images use absolute URLs. The sitemap generator now defaults to the same production hostname as robots.txt and lists software landing pages instead of login, registration and the old workflow route.

Remaining: audit page-specific SEO overrides and public landing pages for the same unsupported claims; prerender public marketing/catalogue routes with matching per-route canonical metadata; exclude authenticated operational screens from indexing through explicit route metadata. The global SEO defaults alone do not solve SPA indexing. Verify rendered HTML and canonical behavior with Search Console after deployment. A generation check extracted zero machine routes from the current constants file and picked up a non-www hostname from local configuration. The checked-in sitemap was preserved; verify catalogue data sourcing and the deployment hostname before regenerating it. Sitemap generation still assigns current timestamps rather than verified content modification dates; replace that before treating lastmod as authoritative.

## Upgrade references

- [React 19 migration guidance](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Node.js release support](https://nodejs.org/en/about/previous-releases)
- [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google review structured-data guidance](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)

No dependency versions or manufacturing algorithms were changed by this review. Performance opportunities above require measured implementation and validation, not an assumed speedup.

## Validation in this checkout

- Targeted ESLint for `src/components/SEO.tsx`, `node --check scripts/generate-sitemap.js`, static HTML JSON-LD parsing and `git diff --check` passed.
- `npm run build` exited 0, including PWA generation. It reported chunks above 1000 kB, an unknown input option `manualChunks`, and browser externalization of `node:crypto` from `validateOptimizationEvidencePayload.ts`. Inspect the emitted bundle and browser validation path before relying on these configurations; increasing the warning threshold would not improve performance.
- No load test, production deployment, dependency upgrade or workshop acceptance run was performed. The existing sitemap was preserved after the generator diagnostic described above.
