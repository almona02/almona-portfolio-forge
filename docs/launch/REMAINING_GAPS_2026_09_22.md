# Remaining gaps — 22 September 2026

## Fixed in this change

- Replaced an invalid mapped interface with a mapped type in
  `ManufacturingSettings.ts`; manufacturing values and calculations are unchanged.
- Replaced the empty-root TypeScript check with explicit strict application and
  Node/Vite project checks, including the constitutional workflow's direct call.
- Fixed two unused Vite callback parameters; the Node/Vite strict check passes.

Validation: 39 manufacturing-settings tests, 22 constitutional drafting tests,
and 40 manufacturing-truth/kerf/DoWin regression tests passed (101 total).
The Tier-0 ML-import scan also passed. No physical dimensions were changed.
The corrected `verify:shipability` command passes the secret scan, then exits
with code 2 at application type checking; the production build is not reached.

## Confirmed remaining blockers

| Priority | Gap | Evidence/status |
| --- | --- | --- |
| P0 | Strict application type debt | The corrected shipability command reports 1,846 diagnostics across 561 files on this repair branch. The former root check compiled no application files. The corrected gate must remain red until this debt is addressed. |
| P0 | Quote hardening release | GitHub reports PR #34 open/draft. Its merge and live backend release are not verified. |
| P0 | Ownership enforcement release | PR #35 is open/draft and stacked on #34. Verified identity handling exists there, not in the current feature base. Deploy frontend token support before backend enforcement. |
| P0 | Partial quote records | `QuoteService` writes the header and items in separate repository requests, with no shared transaction. An item failure can leave a header. |
| P0 | Linked resource authorization | The quote route forwards caller-provided `machine_id` and `related_service_ticket_id` without checking resource ownership. PR #35 protects the quote owner, not these references. |
| P0 | Wider tenant security audit | The earlier profile repair is scoped. Remaining policies, privileged RPCs and endpoints have not received a complete cross-customer audit. |
| P1 | CI security enforcement | `hardening-validation.yml` swallows pip-audit and bandit failures with `|| true`. Its performance-regression step is still a placeholder. |
| P1 | CI branch coverage | Several constitutional/hardening PR workflows target main/develop only; the current feature-base/stacked PRs do not automatically run every advertised gate. |
| P1 | Physical parity acceptance | Passing DoWin tests does not establish full parity: assertions explicitly expect rejection and retain UNPROVEN glass/angle-compensation categories. External evidence and acceptance remain required. |
| P1 | Pending-price semantics | Quote loading in `QuoteContext` drops `price_pending`; the page infers request-only pricing from a zero amount rather than preserving the explicit state. |
| P1 | Money precision | Quote-service arithmetic uses Python floats rather than a defined decimal rounding policy. |

## Still unverified

- Live signup/login/ticket/quote journeys against the deployed application.
- Complete operator-isolation and hardening pipelines beyond the named tests above.
- Latest production Arabic/mobile behavior, accessibility and physical-device checks.
- Policy approval/business details, backup restoration, monitoring and rollback drills.

This review used source inspection, local checks and current GitHub PR state.
It did not execute production customer transactions or re-audit the live database.
