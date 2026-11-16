# Spark — Lane A isolated local Supabase (Auth/API/Storage)

| Field | Value |
|-------|-------|
| **Accepted runtime** | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| **Contract** | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| **Project id** | `almona-lane-a-local` (separate from default `almona-portfolio-forge` and FR-1 recovery) |
| **Outbound** | Disabled (no Twilio/OAuth/analytics/vector/OpenAI; Mailpit local only) |
| **Bind** | Loopback only (`127.0.0.1`) |

## Startup

```bash
# From repo root on runtime tip e1345a0a (or branch containing this handoff)
bash scripts/service-workflow/bootstrap_lane_a_supabase.sh

# Frontend (after bootstrap writes .artifacts/lane-a-local/.env.lane-a.local)
cp .artifacts/lane-a-local/.env.lane-a.local .env
# Ensure locale JSON is reachable at /locales/* (copy repo locales/ → public/locales/ if Vite 404s)
mkdir -p public/locales && cp -R locales/. public/locales/
npm run dev -- --host 127.0.0.1 --port 3000
```

Stop:

```bash
supabase stop --workdir scripts/service-workflow/lane-a-supabase
```

## Ports

| Service | URL |
|---------|-----|
| API / Auth / Storage / REST | `http://127.0.0.1:54421` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54422/postgres` |
| Studio | `http://127.0.0.1:54423` |
| Mailpit | `http://127.0.0.1:54424` |
| Frontend | `http://127.0.0.1:3000` |

Default local project (`54321` / `54322`) is **not** this stack — keep FR-1 recovery there if needed.

## Secure fixture access (synthetic only)

Credentials and service role are **not** committed. Operator/Spark machine file:

`.artifacts/lane-a-local/FIXTURES_ACCESS.txt` (gitignored)

| Fixture | Email | Role | UI |
|---------|-------|------|-----|
| Admin author | `lanea.admin.author@local.test` | `admin` | `/admin?tab=service-routines` |
| Support reviewer | `lanea.support.reviewer@local.test` | `support` | `/support/routines` |
| Technician (denied draft UI) | `lanea.tech.denied@local.test` | `technician` | no `/support/routines` / no `/admin` |
| Customer (denied) | `lanea.customer.denied@local.test` | `customer` | denied staff routes |

Passwords: defaults set by bootstrap (`LANE_A_FIXTURE_PASS_*` env overrides). Rotate by re-running bootstrap. **Never** use on staging/production.

## Verified locally (Cursor bootstrap)

- Login (Admin + Support + Technician tokens)
- REST openapi + Storage list
- RPC: Admin create/submit draft; Support record review; Technician draft preview denied
- UI: Admin **Service Routines** panel (`New draft`); Support **Service routine review** (sees in-review queue); Support `/admin` redirected home

## Implementation constraint (not concurrent-draft evidence)

**At most one in-flight `draft|in_review` version per routine**, enforced by partial unique index `service_routine_versions_one_draft_in_flight`. Spark probe `SPK-CC-inflight-draft` / `SPK-CC-inflight-review` PASS (`22023`) confirms denial of a second in-flight version — this is an **implementation constraint**, **not** evidence that same-routine concurrent draft publication is supported or required.

## Spark sanitized verification commits (attribution preserved)

Pushed as-authored (Spark QA &lt;sparksubagent@almona.invalid&gt;); historical evidence not rewritten:

| Branch | Tip | Notes |
|--------|-----|-------|
| `origin/spark/laneA-verify-5e53ee00` | `db09f89a392c877d4c823ef62d54c722b83ea6a1` | Independent battery on freeze |
| `origin/spark/laneA-verify-e1345a0a` | `75db91254e61f2e3c1627ccbf4ee30f97b83d489` | Correction re-verify; browser was NOT RUN until this local env |

Results JSON (on those branches): `docs/operations/service-workflow/spark-probes/SPARK_LANE_A_RESULTS_*.json`

## Out of scope

No staging/prod apply · no merge · no FR-1 recovery changes · runtime preserved at `e1345a0a` unless a demonstrated defect requires a new correction SHA.
