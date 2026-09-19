# ALMONA public website launch review

Review date: 19 September 2026. Scope: public website; Fabricator excluded at the owner's request.

## Current status

Public-site improvements are prepared on `codex/public-site-launch` for review. Commercial placeholders and unsupported public claims have been mitigated with enquiry-based content. The public catalogue basket now uses local enquiries rather than database stock reservations. Policies and the other release checks below remain outstanding; this is not a production-launch approval.

## Improvements prepared

- Contact and quote forms prepare an email draft and explicitly say that nothing has been sent. Quote items remain in the basket. A mail application is needed to send the draft; this is not a server delivery integration.
- Quote item edits/removal use the correct line IDs and reject invalid quantities.
- Training enrolment reports database failures instead of claiming success, retains entered information on failure, and accepts an empty optional phone number.
- Service cards and comparison table share quote-only package data. The plan guide suggests a discussion scope from machine count without invented prices, savings or confidence scores.
- Shop cards and quick view request a written quote, wait for the add-to-quote result, and report failures. The default price filter no longer hides expensive machines. Unknown stock requires confirmation.
- Randomly generated ratings, discounts and promotional flags were removed from the shop. Unknown inventory is presented as “Confirm availability”, rather than zero stock. Existing inventory identifiers do not match catalogue IDs; this change does not assert a verified inventory mapping.
- Footer contact actions work, and machine sales links to the shop.
- `/terms` and `/privacy` now have clearly labelled, no-index review drafts. They are not approved legal policies.
- A dependency override that broke service-worker precaching was corrected.

## Pages inspected

The supplied Vercel deployments became accessible after sign-in. Public content was reviewed on home, shop, services, contact, quote, training, used machines, machine catalogue, about, 3D gallery, Digital Egypt and Prestige Agent. Spare parts showed an authentication gate. This was a page/content review, not certification of every integration.

The 3D gallery displayed its content, but WebGL/AR behaviour was not fully verified. Prestige Agent displayed its interface, but live agent responses and backend connectivity were not tested. No live enrolment, external email, payment or order was submitted. Reliable mobile viewport verification remains outstanding.

## Remaining launch work

1. **Catalogue enquiries — fixed locally:** shop and product-page actions add catalogue items to a persistent local basket, without reserving stock or submitting database records. Existing database-product stock validation remains intact. The basket prepares an email draft and downloadable text, explicitly states it has not sent the request, and preserves the items. Delivery is through the visitor's email service; no server-side mail delivery is claimed.
2. **Commercial content — mitigated locally:** public service and machine pricing now requests a written quote; unsupported discounts, warranty/delivery promises and automatically generated training cohorts are removed. Actual prices and schedules can be published once approved records exist. See [commercial content review](COMMERCIAL_CONTENT_REVIEW.md).
3. **Policies:** confirm the legal entity, business address, contact responsible for privacy, data processors, retention periods, analytics/storage behaviour, international processing and applicable customer rights. Review and approve the draft wording before removing its draft notice. The Egyptian Personal Data Protection Center is the official starting point: https://www.pdpc.gov.eg/ . These drafts do not establish compliance.
4. **Content evidence — mitigated locally:** unsupported outcome counters, blanket certification/technology claims and implied institutional endorsements are removed or rewritten. Used-machine drafts are unpublished. Digital Egypt is explicitly an independent proposal. Owner-provided company history and dealership details still need documentary verification; see [commercial content review](COMMERCIAL_CONTENT_REVIEW.md).
5. **Language/accessibility — partially checked:** the public spare-parts page now provides English/Arabic enquiry guidance without requiring sign-in. The quote page was verified at 390px with no horizontal overflow. Full Arabic translation, other phone sizes and all public routes still need a release sweep.
6. **Release checks:** resolve the existing repository lint/type-check failures with the responsible module owners. Fabricator files were left untouched.
7. **Hosting:** choose the production domain and verify Vercel production settings, public access, redirects, metadata/canonical URLs and a rollback deployment. Neither supplied deployment URL alone establishes the intended production domain.

## Verification evidence

- Follow-up dependency audit (19 September 2026): removed the unused service coverage map and its vulnerable MapLibre dependency; updated colord to 2.10.0. Production-only npm audit reports zero known vulnerabilities. The full audit still reports 16 moderate development-tool findings involving Storybook/Vitest; these require a separate tested toolchain upgrade. This is not a complete security certification.
- Mobile preview testing reproduced a language-selection failure: the navbar treated its portalled language menu as an outside click and unmounted it before selection. The handler now preserves clicks within that menu. Two regression tests cover selection and normal outside-click dismissal; both pass. The follow-up build passes and targeted navigation lint has zero errors (three existing warnings).
- The security follow-up passed all 20 focused launch tests and the production build. The initial public-site commit deployed successfully to Vercel Preview, and its homepage rendered in the browser. Production has not been promoted.
- Preview inspection found additional unsupported homepage banner/service-card claims. English, Arabic and Turkish copy now removes the national-asset designation, verified-marketplace/logistics promises and numerical waste-reduction promise.
- Changes are tracked in draft PR https://github.com/almona02/almona-portfolio-forge/pull/33 against the existing feature branch; this does not merge the Fabricator work into production.

- Seven focused regression files pass: 20 tests across contact, quote, enrolment, service packages, quick view, public content and catalogue-basket persistence/validation.
- Targeted lint on the changed public components/pages: zero errors; existing warnings remain.
- The final production build passed after the enquiry changes (357 precache entries). Existing large-bundle and `manualChunks` configuration warnings remain.
- Browser smoke check of the built `/shop` page confirmed 39 catalogue items, high-price machines visible, and “Confirm availability” on unknown stock. Image loading and complete mobile behaviour require further checks. The development preview was blank during the final check; the production preview rendered successfully.
- Repository-wide lint has eight errors in untouched files, mainly Fabricator and its tests; these are not claimed fixed.
- The real application type check (`tsc -p tsconfig.app.json --noEmit`) stops on existing parse errors in `src/lib/fabricator/ManufacturingSettings.ts`, lines 59–60. The root `tsc --noEmit` is not sufficient evidence because it does not check the application sources.
- The repository's Gate 1 secret scan passed. This does not replace a complete security review.
- Browser verification added AIM 3410 from the shop, opened the populated basket, and prepared an encoded email draft with synthetic contact details. Nothing was sent. A phone-width screenshot and DOM measurement confirmed the quote form fits at 390px.
- Public entry pages no longer wait for the simulated manufacturing boot animation or prefetch Fabricator routes. Fabricator's entry animation and module code are preserved.

## Suggested release sequence

First prepare a Vercel preview containing the public-site fixes and approved business content. Verify contact delivery, catalogue enquiries, Arabic/English layouts and mobile behaviour there. Approve the policy text and production domain, then promote the tested deployment and check its public routes and enquiry flow. Keep the Fabricator release separate from this public-site launch.
