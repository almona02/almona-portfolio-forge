# Lane A — reproducible isolated local browser + fixtures

**Runtime tip:** `e1345a0aef857e857fe5af50176c1fcb633aae70` (correction on freeze `5e53ee00`).  
**Never** point `VITE_SUPABASE_*` at staging or production.  
**Never** apply Lane A migration to staging/production.

## Docker (Path A′ — isolated Postgres battery)

Docker Desktop engine is **available**. Compose service:

```bash
docker compose -f scripts/service-workflow/docker-compose.lane-a-local.yml up -d
bash scripts/service-workflow/apply_lane_a_docker.sh          # base + migration + battery
# or: bash scripts/service-workflow/apply_lane_a_docker.sh migrate  # skip battery
```

| Field | Value |
|-------|-------|
| Host/port | `127.0.0.1:55458` |
| DB | `routines_lane_a` |
| User / password | `postgres` / `lane_a_local_only` (local disposable only) |
| Verified | Battery **29 PASS / 0 FAIL** against this container |

Container is **Postgres only** (no Auth/PostgREST). It is for contract/SQL evidence, not a full Vite→Supabase browser stack.

Stop:

```bash
docker compose -f scripts/service-workflow/docker-compose.lane-a-local.yml down
```

---

## Role fixtures

### SQL battery (Path A / A′) — synthetic UUIDs, no passwords

| Role | UUID |
|------|------|
| Admin A (author) | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` |
| Admin B | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2` |
| Support | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1` |
| Technician | `cccccccc-cccc-cccc-cccc-ccccccccccc1` |
| Customer | `dddddddd-dddd-dddd-dddd-ddddddddddd1` |
| Sales | `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1` |

Hosted runner (non-Docker alternate):

```bash
python scripts/service-workflow/run_disposable_routines.py
```

### Browser (Path B) — disposable Supabase Auth/API only

| Fixture | `profiles.role` | Entry |
|---------|-----------------|-------|
| Admin A | `admin` | `/admin?tab=service-routines` author/submit/publish |
| Admin B | `admin` | optional second reviewer |
| Support S | `support` | **`/support/routines`** record review (not `/admin`) |
| Technician T | `technician` | published preview RPC only; **no** `/support/routines` |

Local `.env` (never commit) — disposable project or `supabase start` only:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<disposable-anon-only>
```

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
