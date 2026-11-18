# Coverage UI browser environment

Isolated Auth / PostgREST / Postgres stand for the **coverage UI journey**.

This is **environment work only**. It is distinct from the F-COV-CAP-1 product correction (`20261118220000_service_coverage_f_cov_cap_1.sql`). It does not authorize staging apply, production, merge, or FR-1.

## Dependencies

| Tool | Use |
|------|-----|
| Docker engine | Supabase local containers, loopback only |
| Supabase CLI | `supabase start` for GoTrue, PostgREST, Postgres |
| `psql` | Apply the SQL chain |
| Python 3 | Fixture provisioning and journey script |
| Node + Vite | Frontend on `127.0.0.1:3013` (`--mode coverage`) |
| Playwright Chromium | Optional journey runner |

## Configuration

| Item | Value |
|------|--------|
| Project id | `almona-coverage-browser-local` |
| Config | `scripts/service-workflow/coverage-browser-supabase/supabase/config.toml` |
| API / Auth / REST | `http://127.0.0.1:54441` |
| Postgres | `127.0.0.1:54442` |
| Studio | `http://127.0.0.1:54443` |
| Frontend | `http://127.0.0.1:3013` |
| Env file | `.env.coverage.local` (gitignored) |

Schema apply (bootstrap): prelude → lane-b deps → coverage deps → Lane A → STG-01 → Lane B → coverage base → F-COV-CAP-1.

## Fixtures

Emails only. Passwords land in `.artifacts/coverage-browser/FIXTURES_ACCESS.txt` (not committed).

| Email | Role | Journey relation |
|-------|------|------------------|
| `coverage.admin@local.test` | admin | Create / manage / generate |
| `coverage.support@local.test` | support | Create / manage / generate |
| `coverage.tech@local.test` | technician | Management denied |
| `coverage.customer.owner@local.test` | customer | Own-machine schedule |
| `coverage.customer.other@local.test` | customer | Isolation |

Seed includes one published routine + active machine coverage for the panel.

## Start

```bash
bash scripts/service-workflow/bootstrap_coverage_browser.sh
npm run dev -- --host 127.0.0.1 --port 3013 --mode coverage
python scripts/service-workflow/coverage_browser_journey.py
```

Stop:

```bash
supabase stop --workdir scripts/service-workflow/coverage-browser-supabase --no-backup
```

Do not point `VITE_SUPABASE_URL` at staging or production. Do not stop other local Supabase projects.
