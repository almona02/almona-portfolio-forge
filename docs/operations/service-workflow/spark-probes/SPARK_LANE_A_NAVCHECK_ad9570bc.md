# Spark — Lane A navigation-correction evidence (`ad9570bc`)

Independent verification of the login-return-path correction and the staging
packet byte-length fix. Authorship: Spark QA (`sparksubagent@almona.invalid`).

## SHA bindings

| Item | SHA |
|------|-----|
| Correction under review | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| Packet binding (frontend) | `af1883cecd388a18ad7d7a39e9a2a7910ffc9c7a` |
| Packet correction (bytes) | `0419455969db302ea9e4672c46fed4d49f2ad984` |
| Accepted runtime baseline | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Contract | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| Migration blob | `3ca6fb4165cd92c38fe18274d7869123fd834e45` · 38958 bytes · sha256 `62255ac2…c1b` |

## Verdicts

- **Navigation correction `ad9570bc`: PASS (targeted)** — redirect safety,
  role boundaries, query/hash preservation, plus genuine cold-load browser
  check 9/9. No full-battery restart.
- **Staging packet at `04194559`: READY (packet-only)** — byte length
  corrected to 38958; frontend/migration bindings intact. Neither verdict
  authorizes production; no staging apply performed.

Preserved: contract PASS `1350b749`; implementation PASS `e1345a0a`
(disposable 79/79, component 11/11, browser 14/14 + 9 state/audit);
historical BLOCKED `5e53ee00`.

## Files

- `SPARK_LANE_A_NAVCHECK_ad9570bc.json` — machine-readable record (results,
  environment, observations, preserved verdicts).
- `coldload_navcheck_ad9570bc.py` — sanitized Playwright probe: fresh context
  per case, deep-link before login, real form login. Passwords via
  `LANE_A_FIXTURE_PASS_{ADMIN,SUPPORT,TECH}` env only; prints URLs + PASS/FAIL,
  never secrets.

## Re-run

```bash
git worktree add <path> ad9570bc22b30d649b9223a3b74fe2f836adb143
cd <path> && npm ci
# isolated stack (loopback 54421-54424), then in worktree:
cp .artifacts/lane-a-local/.env.lane-a.local .env
cp -R locales/. public/locales/   # unconditional; restore 2 tracked stubs after
npx vite --host 127.0.0.1 --port 3000
LANE_A_FIXTURE_PASS_ADMIN=… LANE_A_FIXTURE_PASS_SUPPORT=… \
LANE_A_FIXTURE_PASS_TECH=… python coldload_navcheck_ad9570bc.py
```

Targeted unit scope (26/26, independently executed):

```bash
npx vitest run src/lib/auth/safeReturnPath.test.ts \
  src/components/auth/loginReturnPath.test.tsx \
  src/components/auth/ProtectedRoute.test.tsx src/lib/roleRouting.test.ts \
  src/pages/SupportRoutineReviewPage.route.test.tsx \
  src/tests/security/studioProtectedRoute.test.tsx
```

## Sanitization

No credentials, tokens, keys, or signed URLs in this commit. No screenshots
taken. `FIXTURES_ACCESS.txt` and `.env` are gitignored and not included.
