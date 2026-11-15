# FR-1 production approval packet (read-only; not authorization)

**Status:** Packet prepared · **production NOT authorized**  
**Frozen tip:** `e17858a59c64426af6067d1ec114e311673daad9`  
**Release vehicle:** draft PR **#158** — https://github.com/almona02/almona-portfolio-forge/pull/158  
**Keep #158 draft** until explicit production authorization.  
**No merge · no production writes · no settings changes · no routines implementation.**

**Backup gate path:** [`FR1_BACKUP_RESTORE_REHEARSAL_EXECUTION.md`](./FR1_BACKUP_RESTORE_REHEARSAL_EXECUTION.md) (recovery + migration rehearsal both **BLOCKED** as of sheet finalize — production still blocked).

## 0. Evidence preserved (Spark / CI)

| Evidence | Revision | Meaning |
|----------|----------|---------|
| Spark **content** PASS | `d3ef35d4` | Independent FR-1 share/privacy/RLS/FE/edge/Python package acceptance |
| Spark **narrow follow-up** (deps + fallback tests) | pending on freeze tip | See `SPARK_FR1_FOLLOWUP_DEPS_FALLBACK.md` |
| Required CI terminal | `e17858a5` | All aggregated PR checks completed without failures (see §6) |
| Disposable battery | packaging tip `9805c9c5` (14/0) | Production-shaped absence of B1 tables |

Do not discard `d3ef35d4` content evidence because the freeze tip is later.

---

## 1. Freeze identity

| Field | Value |
|-------|-------|
| Branch | `release/fr1-slice0-share-privacy` |
| Freeze SHA | `e17858a59c64426af6067d1ec114e311673daad9` |
| Contains | `#155` tip `ca9f5067` **as ancestor** + FR-1 packaging + CVE pin follow-up |
| Staging tip | `feat/service-workflow-b1-planning` @ `1cd5e094` — **untouched** |
| Overlapping open PR | `#155` (open, non-draft) — **do not merge separately** (see §5) |

### Exact artifact revisions (all = freeze tip unless noted)

| Layer | Artifact |
|-------|----------|
| App (FE) | git tree @ `e17858a5` |
| Python backend | git tree @ `e17858a5` (`dnspython==2.9.2`, OTel `1.45.2` / `0.66b2`) |
| Edge | `supabase/functions/ticket-share-attachment` @ `e17858a5` (fail-closed `record_ticket_share_attachment_access`) |
| DB migrations (ordered) | See §3.2 |

---

## 2. Backup / PITR availability (read-only inspection)

### 2.1 What was inspected

| Source | Result |
|--------|--------|
| Supabase MCP `get_project` `shfsebdncjnncqqnewfj` (prod `almona02`) | `status: ACTIVE_HEALTHY`, Postgres 17, region `eu-west-3` |
| Supabase MCP `get_organization` `iuhujuoejbfydldnbqac` | **`plan: free` / `tier_free`** |
| Supabase MCP / CLI | **No API exposure of backup list, PITR windows, or latest recovery point** |
| Staging project `apnmoevmvihfzcnttctx` | Also `ACTIVE_HEALTHY` (not used as prod backup proof) |

### 2.2 Verdict (blocking)

**`ACTIVE_HEALTHY` is not backup evidence.**

On the **free** organization plan returned by the management API:

- Platform **daily backups are not included**.
- **PITR add-on is not included** (and was not verifiable as enabled).
- Therefore: **retention, latest recovery point, and dashboard restore procedure for platform backups are UNAVAILABLE / unverified** for production `shfsebdncjnncqqnewfj`.

**Production authorization remains BLOCKED on backup/restore proof.**

### 2.3 Required backup alternative (before any cutover authorization)

Until the org/project is upgraded to a plan with verified daily backups and/or PITR is enabled and dashboard-verified, cutover must use an **operator-proven logical backup**:

1. **Capture (pre-cutover, production read-only dump window)**  
   - `supabase db dump` (or equivalent `pg_dump` with roles/schema) of `shfsebdncjnncqqnewfj` to an offline artifact store.  
   - Record: timestamp (UTC), dump tool/version, checksum (SHA-256), operator, ticket/change ID.  
   - Prefer schema + data dumps that include `auth`/`storage` as required for a usable restore.

2. **Prove restoration (mandatory gate, before merge/apply)**  
   - Restore the dump into a **new disposable Supabase project** (not production).  
   - Prove: project comes up; FR-1 prerequisite objects from Slice0/MI exist as currently in prod; sample ticket/share/attachment-shaped rows readable under expected policies; checksum inventory of critical tables.  
   - Record restore duration and any dump gaps.  
   - **Fail the gate** if restore is incomplete or unproven.

3. **Cutover-time second dump**  
   - Immediately before write-pause exit / migration apply, take a fresh dump (same procedure) so the recovery point is as close as possible to apply time.

4. **If plan is upgraded later**  
   - Re-verify in Dashboard → Database → Backups: daily backup list **or** PITR earliest/latest recovery points.  
   - Screenshot/export those fields into this packet revision.  
   - Prefer PITR when available (finer RPO); otherwise daily backup + proven logical dump still required for apply-window granularity.

### 2.4 Production restore procedure (if FR-1 apply must be undone)

| Path | When | How | Notes |
|------|------|-----|-------|
| **A. Forward-repair** | Preferred for post-apply defects in F7 SQL/app | Patch migration / redeploy edge+app @ known-good SHA | Do **not** reopen `ticket_shares` INSERT or public buckets |
| **B. Logical restore** | Catastrophic / irreversible schema damage | Restore proven dump to **new** project, cut DNS/env to it **or** coordinated in-place restore with full downtime | In-place overwrite discards all writes after dump point |
| **C. Platform PITR/daily** | Only if later verified enabled | Dashboard restore to recovery point **before** bad apply | Currently **not verified available** |

**App-only rollback after Slice0 A / RLS / F7 is live is unsafe** for security posture (old clients may expect weak paths; DB remains hardened).

---

## 3. Cutover plan (for use only after explicit authorization)

### 3.1 Write-pause scope

| Surface | Pause? | Mechanism (operator) |
|---------|--------|----------------------|
| Customer ticket create / message / share create | **Yes** | Short maintenance banner + optional edge deny / feature flag if available; communicate ETA |
| Staff govern transitions / escalate / revoke | **Yes** during DB apply window | Same maintenance window |
| Public share **reads** (existing tokens) | Prefer pause | Avoid mid-apply token races; revoke residual risk noted (signed URL ≤60s) |
| Unrelated product surfaces (marketplace, catalogue) | Optional | Minimize blast radius; not required for FR-1 DB consistency |
| Auth login | Prefer allow (read-only) | Do not rotate secrets mid-window |

**Owner:** production on-call + release captain.  
**Duration:** migrations + edge deploy + smoke (target: single contiguous window).

### 3.2 Ordered deployment (DB → edge → backend → frontend)

**Critical:** merging #158 to `main` will **auto-start app deploys** (see §4). Database and edge are **not** auto-applied by that merge. Sequence must prevent incompatible pairs from serving traffic.

| Step | Action | Exact revision |
|------|--------|----------------|
| 0 | Freeze traffic (write-pause); confirm backup gate §2.3 PASS | — |
| 1 | **DB apply** on `shfsebdncjnncqqnewfj` in **authoritative** order (A→C→D→E→RLS→F7-04→F7-03; see rehearsal §6.1) | From `e17858a5`: `20261111010000` → `180000` → `190000` → `200000` → `201000` RLS → `20261115190000` F7-04 → `20261115190100` F7-03 |
| 2 | **Edge** deploy `ticket-share-attachment` | Source tree `e17858a5` |
| 3 | **Backend** Railway service `almona-portfolio-forge` | Image/build from `main` @ `e17858a5` (see §4 coordination) |
| 4 | **Frontend** Vercel production (`almona-portfolio-forge` / `almona02.com`) | Build from `main` @ `e17858a5` |
| 5 | Exit write-pause; run §3.4 validation | — |

Never ship FE/BE that call `create_ticket_share` / access-event RPCs **before** F7-03 is applied. Never leave new DB without edge that records attachment access (fail-closed).

### 3.3 Validation checks (post-apply)

1. Migration inventory: seven FR-1-relevant migration versions present; **no** `service_workflow_b*` tables required.  
2. Owner/assignee/admin|support ticket SELECT; unrelated customer empty.  
3. Owner create share via RPC; governance audit `share_created`; direct `ticket_shares` INSERT denied.  
4. `get_shared_ticket` excludes internal notes; access event row written.  
5. Revoke → subsequent payload denied; `share_revoked` audit.  
6. Null-safe: unrelated cannot revoke/escalate unassigned ticket.  
7. Edge: valid share+path → signed URL; access event; wrong path → 403; **bucket remains private**.  
8. Python: ticket scope + internal-note filter; missing job tables fail closed (no 500).  
9. `pip-audit` pins remain at fixed versions on deployed backend image.

### 3.4 Rollback triggers

| Trigger | Immediate action |
|---------|------------------|
| Migration apply fails mid-way | Stop; do not deploy apps; forward-repair or restore per §2.4 |
| Edge deploy fails / 503 on access event | Keep write-pause; redeploy edge @ `e17858a5`; do not open public bucket |
| FE/BE serving against missing RPC | Hold or revert app deploy to pre-merge SHA; DB may stay if already applied |
| Data corruption / irreversible policy damage | Invoke §2.4 B/C; incident commander owns call |

### 3.5 Recovery responsibilities

| Role | Owns |
|------|------|
| Release captain | Go/no-go, write-pause clock, merge timing vs DB/edge |
| DB operator | Dump proof, migration apply, restore decision |
| Edge operator | Function deploy + secret presence |
| Backend owner | Railway deploy health `/health` |
| Frontend owner | Vercel production promote/ready |
| On-call | Rollback triggers, customer comms |

---

## 4. Automatic deployments on merge — incompatibility control

### 4.1 Observed auto-deploy surfaces (read-only)

| System | Binding | Evidence |
|--------|---------|----------|
| **Vercel** `almona-portfolio-forge` | Production deploys from **`main`** | Latest production deployment meta: `githubCommitRef=main` |
| **Railway** `almona-portfolio-forge` (prod env) | Source repo `almona02/almona-portfolio-forge`, **branch `main`**, `checkSuites: true` | `describe-service` |
| **Supabase DB migrations** | **Not** auto-applied on GitHub merge | Manual / dashboard / CLI apply required |
| **Supabase Edge functions** | **Not** auto-applied on merge | Manual `supabase functions deploy` (or equivalent) |

### 4.2 Coordination rule (mandatory)

**Do not merge #158 until:**

1. Backup gate §2.3 is PASS, **and**  
2. Release captain is in the write-pause window ready to apply DB+edge **immediately**, **and**  
3. One of the following app controls is in place:

**Preferred (safest):**  
- Temporarily **disable auto-deploy** on Vercel production + Railway `main` watch (settings change — only when authorized), **or** use protected “wait for approval” deploy.  
- Merge #158 → apply DB → deploy edge → **then** manually promote/redeploy FE+BE @ `e17858a5` → re-enable auto-deploy.

**Alternative (if auto-deploy cannot be paused):**  
- Apply DB+edge **first** while apps still on pre-FR-1 `main` (**only if** migrations are backward-compatible with current production app — Slice0 A + RLS harden behavior; F7-03 changes share create contract).  
- **F7-03 + FE `create_ticket_share` are not safely mixable in either order without a pause:** old FE inserts into `ticket_shares` may be denied after F7; new FE RPC fails before F7-03.  
- Therefore: **write-pause + near-simultaneous DB/edge/app cutover** is required; pure “merge and hope” is **rejected**.

**Hard forbid:** merge → Vercel/Railway serve `e17858a5` FE/BE against production DB that has **not** yet received F7-03/RLS package.

---

## 5. #158 as release vehicle vs overlapping #155

| PR | Tip | Role |
|----|-----|------|
| **#158** (draft) | `e17858a5` | **Sole FR-1 production release vehicle** — includes `#155` content as ancestor **plus** RLS package, F7-03/04, privacy Python, edge audit, CVE pins, tests |
| **#155** (open) | `ca9f5067` | Historical Slice0+MI staging PR; **subset** of #158 ancestry |

**Handling without a second deployment:**

1. Authorize and merge **only #158** (when production authorization exists).  
2. **Close #155** as superseded by #158 (do not merge #155 to `main`).  
3. No cherry-pick of #155 after #158 — that would duplicate Slice0/MI history and risk a second deploy wave.

Merging both would either no-op conflict or re-trigger auto-deploys; it is unnecessary and rejected by this packet.

---

## 6. CI inventory reconciliation (33 vs 31) on freeze tip `e17858a5`

**Queried inventories (exact HEAD `e17858a59c64426af6067d1ec114e311673daad9`):**

| Query | Count | Contents |
|-------|------:|----------|
| GitHub **Check Runs** API `GET /repos/.../commits/{sha}/check-runs` | **31** | Named workflow jobs (incl. 3 `skipped`) |
| GitHub **Commit Statuses** API `GET /repos/.../commits/{sha}/status` | **2** | `Vercel – almona-portfolio-forge`, `Vercel – almona-slice0` |
| `gh pr checks 158` / CI subscription aggregate | **33** | Check runs **+** commit statuses |

**Identity:** `31 + 2 = 33`. There is no missing third inventory; the “31” figure is check-runs-only.

### 6.1 Check Runs (31)

**Success (28):**  
acceptance, approval-replay, audit, Backend Tests & Security, Build & Scan Docker Image, build-and-scan, code-scan, constitutional-compliance, constitutional-validation, dependency-scan, Frontend Build & Test, frontend-lint, Golden Master Accuracy Tests, Golden Master Performance Tests, lighthouse, Linux app tsc base vs head, marketplace-replay, Performance Regression Detection, Pipeline Summary, regression, Repository secret scan, Security Audit, security-headers, test, Validate All Tests Passed, Vercel Preview Comments, version-format, Vite production build  

**Skipped (3):**  
drafting-test-coverage (path filter N/A), smoke (production marketplace deployment_status only), Supabase Preview (preview integration skipped)

### 6.2 Commit Statuses (2)

Vercel – almona-portfolio-forge (success), Vercel – almona-slice0 (success)

### 6.3 Skip coverage judgment

None of the three skips remove required FR-1 packaging coverage (migrations, backend security/pip-audit, frontend tests, docker scan all ran successfully on this HEAD).

---

## 7. Authorization checklist (all must be true)

- [ ] Freeze tip still `e17858a5` (or explicit re-freeze with new CI+Spark)  
- [ ] Spark content PASS on `d3ef35d4` preserved  
- [ ] Spark narrow follow-up PASS on freeze tip (deps + fallback tests)  
- [ ] **Backup gate §2.3 PASS** (logical restore proven **or** platform backups/PITR dashboard-verified with recorded recovery points)  
- [ ] Write-pause + ordered cutover owners assigned  
- [ ] Auto-deploy coordination §4.2 locked  
- [ ] Explicit written production authorization recorded  
- [ ] #158 undrafted only at that moment; #155 closed superseded — **not** merged  

Until then: **keep #158 draft; no merge; no production apply; no settings changes.**

---

## 8. Pointers

- Candidate scope: [`FR1_RELEASE_CANDIDATE.md`](./FR1_RELEASE_CANDIDATE.md)  
- Spark content handoff: [`SPARK_FR1_RELEASE_CANDIDATE_REVIEW.md`](./SPARK_FR1_RELEASE_CANDIDATE_REVIEW.md)  
- Spark follow-up handoff: [`SPARK_FR1_FOLLOWUP_DEPS_FALLBACK.md`](./SPARK_FR1_FOLLOWUP_DEPS_FALLBACK.md)  
- Historical Slice0 order notes: [`../slice0/DEPLOYMENT_PACKAGE.md`](../slice0/DEPLOYMENT_PACKAGE.md)
