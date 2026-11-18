# Lane C checklist browser environment

Isolated full-stack stand for the checklist journey. Bound to correction `e27f21a530fe0eb122ab7886eb8a7854f066a896` and migration `supabase/migrations/20261118140000_service_routines_lane_c_checklist_history_reader.sql` SHA-256 `ed93cd16831987e9f89f3dad7b8b018dc83464cc6c06427e24fe7837324fdf1d`.

This is not a staging apply, a merge, production, or FR-1. A login-only smoke test does not satisfy the journey: the attending technician must open the visit checklist and record the safety-gate Pass. The owning customer must then get no attempt-history rows.

## Dependencies

| Tool | Use |
|------|-----|
| Docker engine | Supabase local containers, loopback only |
| Supabase CLI | `supabase start` for GoTrue, PostgREST, Postgres |
| `psql` | Apply the SQL chain (PostgreSQL 17 client is the known local path) |
| Python 3 | Fixture provisioning and the journey script |
| Node + `npm run dev` | Vite on `127.0.0.1:3012` |
| Playwright Chromium | `lane_c_checklist_browser_journey.py` (`pip install playwright` then `playwright install chromium`) |

No Twilio, OAuth, analytics, or outbound mail. Mailpit is local only. Confirmations are off so synthetic users can sign in without a mailbox.

## Configuration

| Item | Value |
|------|--------|
| Project id | `almona-lane-c-checklist-local` |
| Config | `scripts/service-workflow/lane-c-checklist-supabase/supabase/config.toml` |
| API / Auth / REST | `http://127.0.0.1:54431` |
| Postgres | `127.0.0.1:54432` |
| Studio | `http://127.0.0.1:54433` |
| Mailpit | `http://127.0.0.1:54434` |
| Frontend | `http://127.0.0.1:3012` (`vite --mode lane-c`) |
| Frontend env file | `.env.lane-c.local` (gitignored; URL and local anon key only) |

Schema apply order:

1. `scripts/service-workflow/lane_c_browser_prelude.sql` — profiles and workflow helpers; does **not** replace `auth.uid()`
2. `scripts/service-workflow/disposable_lane_c_deps.sql` — tickets, jobs, visits, and the staging-equivalent ticket SELECT/UPDATE policies
3. `scripts/service-workflow/lane_c_browser_ui_columns.sql` — columns the technician screen selects
4. Lane A migration, STG-01, Lane B, ticket-header RLS, Lane C, then the F-LC-VIS-1 reader migration

Ticket RLS is enabled by the ticket-header migration. History SELECT is the correction reader, not `can_read_ticket_workflow`.

## Fixtures

Emails only. Passwords and the local service-role key are written to `.artifacts/lane-c-checklist-browser/FIXTURES_ACCESS.txt` and are not committed. Non-secret ids and ports are in `.artifacts/lane-c-checklist-browser/environment.json`.

| Email | Role | Journey relation |
|-------|------|------------------|
| `lanec.tech.attending@local.test` | technician | Assignee and attending; records LOTO Pass |
| `lanec.support@local.test` | support | Staff history read |
| `lanec.admin@local.test` | admin | Seed author |
| `lanec.customer.owner@local.test` | customer | Ticket owner; history empty; workspace RPC denied |
| `lanec.customer.other@local.test` | customer | Unrelated; history empty |
| `lanec.tech.other@local.test` | technician | Unrelated; history empty |

Seed ticket number: `T-LC-BROWSER`. Checklist item: safety gate `sg1` / `LOTO`.

## Start

From the repo root, on a commit that contains `e27f21a5`:

```bash
bash scripts/service-workflow/bootstrap_lane_c_checklist_browser.sh
npm run dev -- --host 127.0.0.1 --port 3012 --mode lane-c
python scripts/service-workflow/lane_c_checklist_browser_journey.py
```

The bootstrap refuses to run if `e27f21a5` is not an ancestor of HEAD or the reader migration hash differs. It refuses a second apply once the reader function exists.

Stop and discard the local database:

```bash
supabase stop --workdir scripts/service-workflow/lane-c-checklist-supabase --no-backup
```

Do not stop any other local Supabase project. Do not point `VITE_SUPABASE_URL` at staging or production.

## Local run

Executed on this workspace against correction `e27f21a5` (HEAD at bootstrap `f0b43da6`). Docker engine 28.3.0, Supabase CLI 3.2.0, Vite 7.3.7 in mode `lane-c`. Ticket `relrowsecurity` was on. History SELECT policy was `admin_private.can_read_checklist_attempt_history(ticket_id, job_id, visit_id)`. Browser calls used `127.0.0.1:54431` only.

`lane_c_checklist_browser_journey.py` — **10/10 PASS**:

- Attending technician opened the checklist and recorded LOTO Pass (revision 1).
- That technician’s history SELECT returned the `sg1` / `passed` row. Support SELECT returned the same row.
- Owning customer: history SELECT `[]`, workspace RPC 403, checklist panel not shown.
- Unrelated customer and unrelated technician: history SELECT `[]`.
