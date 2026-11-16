# Lane A — reproducible isolated local browser + fixtures

**Runtime base:** correction tip on top of freeze `5e53ee00` (see disposition).  
**Never** point `VITE_SUPABASE_*` at staging or production.  
**Never** apply Lane A migration to staging/production.

## Docker status (recorded at correction)

`docker` CLI is installed, but the Docker Desktop engine pipe was **unavailable** (`dockerDesktopLinuxEngine` not found). Compose file is provided; **do not** fall back to staging. Use Path A (battery) and/or Path B (dedicated disposable Supabase / local `supabase start` when that stack is available).

Compose (when engine is up):

```bash
docker compose -f scripts/service-workflow/docker-compose.lane-a-local.yml up -d
# Then apply disposable_routines_base.sql + Lane A migration via psql to localhost:55458
```

That container is **Postgres only** (no Auth/PostgREST). Browser UI still needs a disposable Supabase API (Path B).

---

## Role fixtures

### SQL battery (Path A) — synthetic UUIDs, no passwords

| Role | UUID |
|------|------|
| Admin A (author) | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` |
| Admin B | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2` |
| Support | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1` |
| Technician | `cccccccc-cccc-cccc-cccc-ccccccccccc1` |
| Customer | `dddddddd-dddd-dddd-dddd-ddddddddddd1` |
| Sales | `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1` |

```bash
python scripts/service-workflow/run_disposable_routines.py
```

### Browser (Path B) — create in a **disposable** Supabase project only

| Fixture | `profiles.role` | Entry |
|---------|-----------------|-------|
| Admin A | `admin` | `/admin?tab=service-routines` author/submit/publish |
| Admin B | `admin` | optional second reviewer |
| Support S | `support` | **`/support/routines`** record review (not `/admin`) |
| Technician T | `technician` | published preview RPC only; **no** `/support/routines` |

Local `.env` (never commit):

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<disposable-anon-only>
```

Or a throwaway cloud project URL — **not** Railway staging / production.

```bash
npm run dev   # http://localhost:3000
```

Script: Admin A create → submit → Support S `/support/routines` → Record review → Admin A publish → Preview → retire.

---

## Support vs Admin

| Surface | Roles | Capabilities |
|---------|-------|--------------|
| `/admin?tab=service-routines` | Admin only | Full Lane A authoring |
| `/support/routines` | Admin + Support | In-review queue, preview, record review |
| `/support/desk` | Admin + Support | Tickets (+ link to routine reviews) |
