# Mobile, Arabic and development-tool review

Date: 19 September 2026. Scope: public website; no Fabricator module implementation changes.

## Development dependency security

The previous 16 moderate findings shared a vulnerable Vitest mocking dependency. Updated Vitest and its browser/UI/coverage packages to 4.1.11, Storybook and its addons to 10.6.0, and Chromatic's addon to the compatible 5.3.1 release. Migrated the optional browser provider and dependency-inlining configuration. The resolved dependency tree has compatible peers and the full npm audit reports **zero known vulnerabilities**, including development dependencies.

Sources: [Vitest advisory and patched release](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [Storybook migration requirements](https://storybook.js.org/docs/releases/migration-guide).

The Storybook static build passes. Four test constructor mocks were updated to constructible functions for Vitest 4. An unsupported string matcher was replaced with a standard assertion. The export checksum fixture now fixes the export time because generated file headers include timestamps; this does not change production exports or claim timestamp-independent checksums. A clean-install dry run completed without forcing peer resolution.

Final broad validation: **102 test files passed, two skipped; 771 tests passed, 14 skipped**, with Fabricator-path and golden-master exclusions stated below. The Arabic regression tests also passed with the upgraded V8 coverage provider. Targeted source lint reports zero errors and 52 warnings. The standalone Vitest config is outside the repository's ESLint project configuration; it is validated by actual test execution rather than claiming a successful config-file lint.

## Mobile and language fixes

- The shared legacy language provider now follows i18next instead of overwriting the selected language and document direction. Initial document language also uses the selected language instead of resetting it from the browser preference.
- Added English/Arabic public-copy resources for contact and quote forms, validation, draft download, footer, core catalogue actions, training syllabus/programmes, public product headings and gallery overview.
- Email and phone inputs retain left-to-right entry inside Arabic forms. Contact cards use smaller padding on phones and logical spacing for RTL.
- Training enquiry content scrolls within short phone screens. A scoped margin correction keeps this centred dialog within the viewport.
- The catalogue button now scrolls to the product section. With no approved used-machine listings, the public page provides a bilingual availability-enquiry state instead of empty search tools and unsupported marketplace guarantees.

## Browser evidence and limits

Final rebuilt-preview verification at 390×664 confirmed the Arabic training dialog fits horizontally (left 16px, right 374px), scrolls internally, and displays the selected programme in Arabic. No enquiry was submitted.

The owner confirmed almona02.com and chose to retain Vercel hosting. The root domain currently redirects to www.almona02.com. No Sites migration or production promotion was performed.

The initial review at 360px inspected contact, shop, services, training, used machines, About, machine catalogue, 3D gallery, Digital Egypt, spare parts, Terms, Privacy and Prestige Agent. These rendered without horizontal document overflow; no broken loaded images were found in those snapshots. Lazy images below the viewport and interactive 3D/AR behaviour were not certified by those checks.

After the language fixes, the contact page was visually inspected at 360px. Arabic labels and document `dir=rtl` / `lang=ar` were verified, including after reload. Services, training, shop and quote pages were checked at 360px with Arabic headings, RTL direction and document width matching the viewport. The training dialog was inspected at 390×664: scrolling worked, and inspection identified the margin offset corrected above. No live training enquiry, email or order was submitted.

This is **not a complete Arabic translation sign-off**. About-page body/components, detailed manufacturer descriptions and catalogue/helper modules, Prestige Agent content, and the draft legal policy bodies still contain English. The legal pages remain review drafts pending business details. Full keyboard/screen-reader checks, physical iOS/Android testing and external embedded 3D experiences remain unverified.

The broad test run excludes Fabricator-path and golden-master tests. Repository-wide lint/type failures documented in the main launch review remain separate. Do not interpret focused public checks as a full platform certification.
