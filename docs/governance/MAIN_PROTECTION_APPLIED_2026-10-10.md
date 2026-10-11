# Main branch protection — applied 10 October 2026

**Status:** APPLIED via GitHub classic branch protection API.  
**Actor:** Cursor agent (sequence authorization in Oct 10 readiness follow-up).  
**Rulesets:** still `[]` (classic protection is active).

## Settings (verified via GET)

| Setting | Value |
|---|---|
| Required approving reviews | **1** |
| Dismiss stale reviews | **yes** |
| Require conversation resolution | **yes** |
| Require branches up to date (`strict`) | **yes** |
| Enforce admins | **yes** |
| Allow force pushes | **no** |
| Allow deletions | **no** |
| Bypass / push restrictions | none (`restrictions: null`); admins still enforced |

## Required status checks (always-triggered only)

Path-filtered workflows intentionally **excluded**.

1. `constitutional-compliance`
2. `constitutional-validation`
3. `Frontend Build & Test`
4. `Repository secret scan`
5. `Vite production build`
6. `Pipeline Summary`
7. `Validate All Tests Passed`
8. `Golden Master Accuracy Tests`
9. `Security Audit`

## Verify

```bash
gh api repos/almona02/almona-portfolio-forge/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts, reviews: .required_pull_request_reviews, force: .allow_force_pushes.enabled, delete: .allow_deletions.enabled}'
```
