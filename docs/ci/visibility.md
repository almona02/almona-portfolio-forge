# Technical visibility harness

This read-only audit measures public technical readiness. It does not measure rankings, actual Googlebot access, indexing, or AI citations. It never submits enquiries or changes inventory. Production audit results may fail until existing SEO defects are repaired separately.

## Run

```sh
npm ci
npx playwright install chromium
npm run visibility:test
npm run visibility:type-check
npm run visibility:check -- --base https://www.almona02.com --performance
npm run visibility:check -- --base http://localhost:4173 --out artifacts/visibility-local
npm run visibility:compare -- --baseline docs/ci/visibility-baseline.json --current artifacts/visibility/report.json
```

On Windows shells that consume npm option arguments, invoke the runner directly: `node node_modules/tsx/dist/cli.mjs scripts/visibility/run.ts --base=https://www.almona02.com --performance`. Use the same direct invocation for `scripts/visibility/compare.ts` if necessary.

Start a built Vite preview separately for local checks. `--manifest scripts/visibility/routes.json` selects the route contract; `--sitemap-limit 100` caps sampled sitemap/page URLs, with critical routes sampled first. XML structural validation covers every entry. Sitemap indexes are detected but child sitemap traversal is not supported in v1: configure a URL-set endpoint before using an index. No credentials are needed. Browser contexts are fresh for every page and service workers are blocked. Arabic/English listing variants use `?lng=ar/en`. A listing must be discoverable through a public anchor; missing inventory is recorded as a coverage gap.

Reports contain response status, redirect chains, headers, raw and rendered SEO/content snapshots, browser/asset failures, JSON-LD findings, Lighthouse medians and optional baseline deltas. Treat artifacts as public-page data; never run against authenticated/private URLs. All HTML evidence is escaped in the report.

Exit codes: **0** no critical failures; **1** confirmed critical site defects; **2** inconclusive critical measurements or runner failure. Advisory findings and baseline deltas never fail the audit. Persistent 429/5xx responses are inconclusive after two retries. A spoofed Googlebot user agent is a diagnostic only. Local results cannot verify production routing or edge headers. Lighthouse uses three mobile runs, reports LCP/CLS/TBT and performance medians, and is not field Core Web Vitals. Missing field data remains unknown.

## CI and baseline acceptance

PRs run fixture checks and audit a local build. Successful `Vercel Deploy` runs trigger a production audit; nightly and manual runs also target production. Artifacts are retained for 30 days. Reports use GitHub job summaries and workflow notifications only. Branch protection must select Technical Visibility if it should be a required PR gate.

The accepted baseline is deliberately absent until a real production run is reviewed. Download `report.json`, verify canonical-host redirects and all coverage gaps, then commit that unchanged report as `docs/ci/visibility-baseline.json` in a reviewed PR. Never auto-accept failing results or overwrite the baseline from CI. The comparator rejects different origins or local/deployed modes; baseline comparisons use stable finding IDs and statuses, ignoring timestamps and volatile text. Performance remains advisory and appears separately.

## Known boundaries

JSON-LD checks are basic Product/Offer consistency checks, not Google's Rich Results Test. No live Search Console or field-metrics source is configured. Alternate reciprocity is checked among sampled pages; unvisited targets remain unknown. Empty inventory cannot be distinguished from undiscoverable inventory without an inventory source. No database/RLS assumptions are made. Fetch failures never establish Google de-indexing. Remediation priorities are sitemap/build drift, marketplace discoverability, metadata/canonical consistency and missing-listing semantics.
