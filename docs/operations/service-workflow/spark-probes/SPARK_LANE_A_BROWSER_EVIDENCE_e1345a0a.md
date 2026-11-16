# Lane A browser evidence — runtime `e1345a0a` (isolated local Supabase)

Independent Spark verification. Contract `1350b749` (unchanged).

## Evidence distinctions (preserved)

| Layer | Result | Artifact |
|-------|--------|----------|
| Disposable (ephemeral PG) | 79/79 | `spark/laneA-verify-e1345a0a` |
| Component (vitest) | 11/11 | `spark/laneA-verify-e1345a0a` |
| Local browser (this branch) | 14/14 UI asserts + 9 persisted-state/audit checks | this branch |
| Staging / production | NOT tested, NOT changed | — |

## What the browser chain proved

1. Admin creates + edits a routine draft (default payload path).
2. Invalid publication surfaces itemised 22023 errors; version untouched.
3. Distinct Support reviewer at `/support/routines` reads the exact submitted draft and records review.
4. Admin publishes; published preview matches reviewed content (ordinal 1).
5. Reload preserves published state; repeat publication idempotent, no duplicate.
6. Retirement preserves readable history; retired code reuse denied.
7. Technician/Customer cannot reach staff routes or draft content (redirects + RPC 403; retired preview allowed for Tech only).

Step 5's repeat publication was **browser-session API-assisted** (session token + REST RPC from the logged-in browser context), **not a UI button action** — the UI offers no repeat control by design. All other steps are genuine UI interactions. Persisted state and audit rows were verified against the isolated DB for the successful chain; no full database audit restart was performed.

## Environment

Isolated loopback Supabase (`54421` API/Auth/REST, `54422` DB, `54423` Studio, `54424` Mailpit) + Vite app on `:3000` served from a clean checkout of the runtime SHA with `VITE_SUPABASE_URL` on the isolated stack. Synthetic fixtures only; credentials live in gitignored operator files, never in this branch.

## Non-blocking observation

The `?tab=service-routines` deep link intermittently lands on admin Overview (query stripped); the sidebar nav path always works (`admin_entry: nav-click` in results). Pre-existing shell behavior, not a Lane A defect; did not block any step.

## Manifest

- `scripts/service-workflow/browser_journey_lane_a.py` — Playwright journey runner (suffix arg isolates reruns).
- `scripts/service-workflow/browser_lane_a_db_verify.sql` — persisted-state/audit checks T1–T9.
- `SPARK_LANE_A_BROWSER_RESULTS_e1345a0a.json` — 14/14 step results.
- `browser-e1345a0a/` — 11 screenshots (02–12) + submitted/support/published/retired payload JSONs.

Secrets excluded: no credentials, session tokens, anon/service keys, or signed URLs anywhere in this branch. Screenshots and payloads were inspected before commit (5 pixel-read, all payloads pattern-scanned).

## Reproduce

```bash
LANE_A_APP_ROOT=<checkout serving :3000> LANE_A_DB_PASSWORD=<isolated pg password> \
  python scripts/service-workflow/browser_journey_lane_a.py <fresh-suffix>
PGPASSWORD=<isolated> psql "host=127.0.0.1 port=54422 user=postgres dbname=postgres" \
  -f scripts/service-workflow/browser_lane_a_db_verify.sql
```

Requires the isolated stack + fixtures from `SPARK_LANE_A_LOCAL_SUPABASE_HANDOFF.md`. Never point at staging/production.
