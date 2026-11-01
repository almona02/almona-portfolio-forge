# Public catalogue and browsing readiness — 27 October 2026

Base revision: `0be3683340731aab98dcddacfa9bff5bb47c9983`. This is a frontend change set; production deployment and Search Console indexation are separate from PR validation.

## Confirmed problems and resulting behavior

- Reproduced a Products-page crash by placing malformed JSON in `saved_comparisons`: the page displayed “Something went wrong” and a JSON parse error. Reading optional saved comparisons now tolerates malformed/blocked storage without deleting the stored value.
- The shipped public JSON contained 92 machines while the application's authoritative source contained 94, with specification differences in three shared records. The public JSON is synchronized, and the production HTML/JSON generator imports the authoritative source directly.
- The production build now emits full catalogue HTML for `/products` and `/products/machines`, plus model documents for all 94 machines. This is the same public catalogue used by the interactive application. No credentials, database queries, stock assertions or fabricated prices are required to generate these documents.
- Catalogue HTML includes all model links before JavaScript. Rendered catalogue pages retain an expandable directory of every model. Model pages include specifications, documentation links, canonical URLs and Product structured data without invented Offers. Missing model requests return 404 through the preview/deployment routing boundary; client-side missing views are noindexed.
- Public catalogue HTML remains visible if application startup fails. The interactive application still loads on these routes; the static content is a recovery/readability layer, not a separate bot-only response.
- Corrected crawler-resource routing: real robots/sitemap/llms files bypass SPA HTML fallback. Unavailable AI catalog endpoints, including `/.well-known/ai-catalog.json`, return 404. No AI capability or manifest was fabricated. Lighthouse should mark the optional catalog N/A, rather than count it as a failed malformed manifest.
- Replaced the homepage's continuously rendered decorative canvas with compressed artwork, removed initial opacity gating, made slide autoplay opt-in, scoped arrow navigation to the carousel and corrected tab/progress semantics. Optional sections and command search load on demand. The audited UI chunk no longer forces command-search code to download with the initial visit.
- Added real responsive WebP files for the audited machine images; unknown local images no longer claim nonexistent width/format variants. The homepage artwork variant is 97,482 bytes, compared with the report's approximately 361.8 KiB original.
- Named the WhatsApp launcher, corrected its stacking order, improved footer contrast and named model specification downloads. Corrected command-dialog container styling exposed by the browser smoke test.
- CI follow-up: named the WhatsApp panel's quick-message toggle and phone-call button, exposed the toggle's expanded state, and extended mobile/desktop smoke coverage to audit the open panel before closing it.
- Clarified default SEO titles/descriptions and removed conflicting opening-hours/toll-free claims from shared metadata. Vercel HTML rewrite destinations follow its cleanUrls convention.

## Validation

- Production Vite build, catalogue generation and release-asset retention completed.
- Deployment packaging correction: added the catalogue generator to `.vercelignore` exceptions. A full production build from 3,100 tracked files filtered through `.vercelignore` passed and generated all 94 model documents; this catches the missing-script failure that an unfiltered local build missed.
- 21 focused Vitest tests passed across seven files, plus four Node HTML-generation tests.
- Type-check baseline-delta gate passed: 1,643 existing application diagnostics versus a baseline of 1,791, with no new signatures or occurrence increases. This is not a type-clean application.
- Full ESLint run: zero errors; warnings remain in the repository. Secret-scan gate passed.
- Browser smoke exercises JavaScript-disabled catalogue/model reading, malformed-comparison recovery, model links, missing-product HTTP status, mobile/desktop navigation, WhatsApp, keyboard command search and targeted accessibility rules. Evidence is written to `artifacts/public-refinement/` and uploaded by the existing Technical Visibility workflow.
- HTML tests cover catalogue completeness, model specifications and schema, preserved interactive entry, invalid IDs, and script/HTML escaping.
- All five marketplace homepage-recovery scenarios passed against the production build with system Chrome. The test now scrolls to the deferred About entry before asserting its loaded content; navigation counts, runtime-error checks and persistent-failure retry assertions remain enforced.

## Performance evidence

Three fresh Lighthouse 13.5.0 runs per device and revision, served sequentially from the same local production-preview origin with system Chrome. Mobile uses Lighthouse's default simulated throttling; desktop uses its desktop preset. Values below are medians.

| Device | Metric | Local baseline | Refined |
|---|---|---:|---:|
| mobile | Performance | 52 | 68 |
| mobile | FCP | 5.39 s | 0.92 s |
| mobile | LCP | 11.54 s | 7.76 s |
| mobile | TBT | 375 ms | 324 ms |
| mobile | CLS | 0.016 | 0.024 |
| mobile | Speed Index | 5.88 s | 2.66 s |
| desktop | Performance | 83 | 93 |
| desktop | FCP | 1.36 s | 0.26 s |
| desktop | LCP | 2.10 s | 1.71 s |
| desktop | TBT | 46 ms | 60 ms |
| desktop | CLS | 0.002 | 0.014 |
| desktop | Speed Index | 1.83 s | 1.00 s |

Every refined run scored 100 for Accessibility, SEO, Best Practices and agent browsing (3/3 applicable audits). The unavailable optional AI catalog and WebMCP checks are N/A. First-party script transfer fell from 860,137 to 809,562 bytes (5.9%). Mobile LCP remains above the 2.5-second target, so this batch does not claim a Core Web Vitals pass or completion of all performance work.

Raw benchmark summaries and browser evidence accompany the delivered audit; full Lighthouse JSON remains in the local benchmark directory. The captured original PSI scores (58/95) must not be compared directly with these local before/after measurements.

The original supplied PSI snapshot is a separate environment: mobile performance 58 and desktop 95, accessibility 88, SEO/Best Practices 100, agent browsing 1/4. Local baseline runs use the same source revision but local serving and a different Chrome/network environment, so their numbers must not be presented as that PSI snapshot or a guaranteed production score.

## Release validation and remaining limits

Review and merge the PR through the existing deployment process, then verify the deployed Products URL and representative model URLs with Search Console URL Inspection (raw response and rendered HTML), submit the sitemap, and request reindexing as appropriate. Inspect the deployed robots/sitemap/llms MIME types and the optional catalog 404 classification. A PR cannot guarantee Google indexation, rankings, AI citations or a rolling field Core Web Vitals pass.

No auth/RLS/schema changes were made. Broad application-provider splitting, full critical-CSS extraction, real-user INP collection and a full catalogue asset/content audit remain separate follow-ups if the measured results justify them. Existing unrelated build warnings and application type diagnostics were not reclassified as new regressions.
