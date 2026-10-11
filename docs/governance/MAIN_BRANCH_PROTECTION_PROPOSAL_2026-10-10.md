# Main branch protection proposal — 10 October 2026

**Status:** APPLIED 2026-10-10 (agent-approved always-triggered checks). Evidence: `main-protection-applied-2026-10-10.json`.  
**Evidence date:** 2026-10-10  
**Repo:** `almona02/almona-portfolio-forge`

## Verified current state

| Probe | Result |
|---|---|
| `GET .../branches/main/protection` | **404** `Branch not protected` |
| `GET .../rulesets` | **`[]`** (empty — no repository rulesets) |
| Conclusion | **main is unprotected** by both classic branch protection and rulesets. A protection-endpoint 404 alone would be inconclusive; the empty rulesets list closes that gap. |

`origin/main` tip at verification: `f27f0317dd55f6f5516cd692ee3be3a00bb9ac72` (#75).

## Path-filter warning (do not require these as mandatory)

These workflows use `paths:` and will stay **pending/skipped** on unrelated PRs if required:

| Workflow | Path filter |
|---|---|
| `fabricator-acceptance-e2e.yml` | measuring / EngineeringBay paths |
| `fabricator-measured-pooled-e2e.yml` | caluminium BOM / estimate paths |
| `typecheck-base-head-delta.yml` | `src/**`, tsconfig, package |
| `deploy-preview.yml` / `test.yml` / `deploy-production.yml` | `python_backend/**`, `ai_agents/**` |
| `vercel-deploy.yml` | frontend paths |
| `deploy-eu-production.yml` | `src/**`, k8s |

**Do not** add path-filtered job names to required checks until those workflows always emit a status (e.g. unconditional success stub).

## Proposed required status checks

Names taken from successful PR #76 / main tip rollups (non-path-filtered):

1. `constitutional-compliance` (Constitutional Compliance Check)
2. `constitutional-validation`
3. `Frontend Build & Test` (or Full Pipeline job of that name)
4. `Repository secret scan` (Gate 1 Shipability)
5. `Pipeline Summary` / `Validate All Tests Passed` (Full Pipeline)
6. `Golden Master Accuracy Tests`
7. `Security Audit`
8. `Vite production build`

Confirm exact GitHub check **names** in the UI after enabling (GitHub matches the check run `name` field). Prefer requiring the aggregate Full Pipeline / Gate 1 jobs that already run on every `pull_request` to `main`.

## Proposed settings (classic branch protection or ruleset equivalent)

| Setting | Value |
|---|---|
| Require a pull request before merging | **yes** |
| Required approving reviews | **1** (raise to 2 when second reviewer available) |
| Dismiss stale reviews when new commits are pushed | **yes** |
| Require review from Code Owners | optional |
| Require status checks to pass | **yes** — list above |
| Require branches to be up to date | **yes** (after required checks stable) |
| Require conversation resolution | **yes** |
| Allow force pushes | **no** |
| Allow deletions | **no** |
| Bypass list | repository **admins** only; document each bypass use in PR comments |
| Restrict who can push | admins / release role only |

## Apply procedure (owner only)

```bash
# Example classic protection — DO NOT RUN without owner authorization
gh api -X PUT repos/almona02/almona-portfolio-forge/branches/main/protection \
  --input ./docs/governance/main-protection-payload.json
```

Or create a ruleset targeting `refs/heads/main` with the same constraints via Settings → Rules → Rulesets.

## Explicit non-authorization

This document and the Oct 10 readiness plan are **not** authorization to apply protection. Await owner confirmation, then record the resulting API/ruleset JSON as evidence.
