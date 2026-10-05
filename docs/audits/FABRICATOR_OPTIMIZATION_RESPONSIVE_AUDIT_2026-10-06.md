# Optimization, cut-list PDF and responsive workflow audit

Date: 6 October 2026. Changes local, not deployed or pushed.

## Findings and changes
- Live Owner A Design loads R3 (1200 x 1400). Desktop Review BOM is present. Optimization cannot run against the unqualified fixture; no approved manufacturing rule/tolerance was fabricated.
- BOM action now opens the position-specific optimization prerequisite screen when qualification is missing, without marking BOM complete. Qualified continuation checks the store completion guard. A regression test verifies route identity and no false completion.
- Legacy Preview3D handoff now uses the authoritative project/position and goes through BOM review rather than losing identity on a legacy optimization route.
- Successful optimization stays on its result screen; Continue to Quote is explicit. A cut-list PDF download is available for reconciled results.
- PDF export validates physical cuts against the design. Long cut lists paginate instead of running below the page. Cutting summary uses EGP rather than an invented dollar symbol.
- Live QC at 390 x 844 has no vertical scrolling despite offscreen measurements/approval actions. Added a bounded vertical scroll container, wrapping actions, single-column phone summary, and wrapping UUIDs.
- Live Quote at 390 x 844 likewise has no vertical scroll container. Added scrolling for pose commercial content, horizontal scrolling for the quote table, and associated Markup/VAT labels. The quote header hid its title/actions offscreen on phones; adjusted shared header spacing/breadcrumb visibility and bounded flex children.
- Design editor intentionally requires width >=1024; phone and tablet portrait show a larger-display notice. Added a read-only position summary and working Measure/BOM links for these widths. CAD editing remains a desktop/landscape activity.
- BOM tabs scroll horizontally and action footer stays within its page rather than floating over other content.

## Evidence
- 22 tests passed across 7 files: optimizer reconciliation, qualification gates, actual PDF generation, position-specific BOM prerequisite navigation, and successful optimization remaining visible for export.
- Actual AdaptiveSolver -> actual PDFExportService generated output/pdf/optimization-cutlist-diagnostic.pdf: 75 physical occurrences, 2 A4 pages. Both pages rendered and visually inspected. Text extraction verified all 75 numbered cuts and page bounds. Explicit TEST ONLY branding; not a manufacturing release.
- Changed-source lint: zero errors; existing warnings remain.
- Final frontend production build passed (65 seconds), entry index-Dd7ZaEun.js. Backend untouched by this slice; previous verified Industrial image and 5 readiness tests remain the backend evidence.
- Local preview ports 4180/4181 returned a stale browser bundle differing from disk; excluded from acceptance. Port4190 matched the recorded production entry. Final fresh origin4193 loaded index-Dd7ZaEun.js and confirmed phone Design summary/1200 x 1400 mm/Measure and BOM links. QC verified at 390px: document width 390, scroll viewport 565px/content 1457px, bottom actions reached by keyboard. At 768px: viewport 796px/content 1018px; no page overflow. Final phone Quote header shows title, theme and user controls within the viewport. Quote empty state renders without stale cost data; populated-table visual acceptance remains pending qualified input.

## Remaining live exit
Approved manufacturing authority and tolerance are still missing for this fixture. Genuine live design -> qualified BOM -> optimization -> production PDF acceptance cannot be marked passed until those are supplied. Manufacturing authority publication UI and owned-profile/rule consumption remain in the broader repair plan. These UI/export changes do not resolve those authority gaps.
