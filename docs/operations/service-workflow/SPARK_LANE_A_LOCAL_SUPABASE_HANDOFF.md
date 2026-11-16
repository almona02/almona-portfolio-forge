# Spark — Lane A isolated local Supabase (Auth/API/Storage)

| Field | Value |
|-------|-------|
| **Accepted runtime (hold)** | `e1345a0aef857e857fe5af50176c1fcb633aae70` — **hold while Spark reviews**; no runtime edits |
| **Contract** | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| **Frontend correction (review)** | `ad9570bc22b30d649b9223a3b74fe2f836adb143` — login-return path; on `origin/feat/service-routines-authoring` |
| **Packet commit (frontend binding)** | `af1883cecd388a18ad7d7a39e9a2a7910ffc9c7a` — binds frontend tip above; migration blob unchanged vs `e1345a0a` |
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

### Stop / retire local sessions (after evidence preserved)

```bash
# Frontend
# stop Vite on 3000 (taskkill / Ctrl+C)

# Isolated Lane A Supabase (Auth/API/Storage)
supabase stop --workdir scripts/service-workflow/lane-a-supabase

# Optional disposable Postgres-only compose (55458)
docker compose -f scripts/service-workflow/docker-compose.lane-a-local.yml down

# Do NOT stop default almona-portfolio-forge (54321) if used for FR-1 recovery
# Shred local fixture file when done with browser work:
#   shred/overwrite .artifacts/lane-a-local/FIXTURES_ACCESS.txt (gitignored)
```

### Restart isolated environment

```bash
git checkout e1345a0aef857e857fe5af50176c1fcb633aae70   # or branch containing handoff docs
bash scripts/service-workflow/bootstrap_lane_a_supabase.sh
cp .artifacts/lane-a-local/.env.lane-a.local .env
mkdir -p public/locales && cp -R locales/. public/locales/
npm run dev -- --host 127.0.0.1 --port 3000
```

Fixture passwords: see regenerated `.artifacts/lane-a-local/FIXTURES_ACCESS.txt` (not committed).

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
| `origin/spark/laneA-verify-browser-e1345a0a` | `6601c5caf46bbc0c74ee6238898027af3e25a949` | Independent browser evidence on `e1345a0a` (14/14 UI + 9 state/audit); authorship preserved |

Results JSON (on those branches): `docs/operations/service-workflow/spark-probes/SPARK_LANE_A_RESULTS_*.json`

## Spark review hold — frontend correction `ad9570bc`

| Item | Full SHA / note |
|------|-----------------|
| Frontend correction under review | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| Remote reachability | Present on `origin/feat/service-routines-authoring` (ancestor of branch tip) |
| Packet commit binding that frontend | `af1883cecd388a18ad7d7a39e9a2a7910ffc9c7a` (`docs(service): bind Lane A staging packet frontend to ad9570bc`) |
| Migration at frontend tip | blob `3ca6fb4165cd92c38fe18274d7869123fd834e45` · SHA-256 `62255ac2329864f11aa19bf66eb72ff5a491935c8fd586820ea3c0cb9ccbbc1b` · **38958** bytes — identical to accepted baseline `e1345a0a` |
| Runtime hold | Stay on accepted baseline `e1345a0aef857e857fe5af50176c1fcb633aae70` for Lane A SQL/runtime; do not move acceptance to `ad9570bc` until Spark closes review |

```bash
git fetch origin feat/service-routines-authoring
git cat-file -t ad9570bc22b30d649b9223a3b74fe2f836adb143   # expect: commit
git merge-base --is-ancestor ad9570bc22b30d649b9223a3b74fe2f836adb143 origin/feat/service-routines-authoring && echo reachable
git show af1883cecd388a18ad7d7a39e9a2a7910ffc9c7a:docs/operations/service-workflow/LANE_A_STAGING_DEPLOYMENT_PACKET.md | head -20
```

## Out of scope

No staging/prod apply · no merge · no FR-1 recovery changes · runtime held at `e1345a0a` while Spark reviews `ad9570bc` / packet `af1883ce`.
