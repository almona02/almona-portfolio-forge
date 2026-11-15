# B7 / service-workflow — release-readiness packet (preparation only)

**Prepared:** 2026-11-15 after B7 retirement  
**Authority:** Read-only inspection + staging evidence. **Do not merge. Do not change production. Do not disable production auto-deploy settings.**

---

## 1. Issue heads, dependency order, required CI

| Issue | State | Head OID | Base | Role |
|------:|-------|----------|------|------|
| **#155** | OPEN · **frozen** | `ca9f506715567e1f2ea08fdcd4e2bb0d5e3d10da` | `main` | Slice 0 security + machine-identity PR1 — **merge gate for production app tip** |
| **#156** | OPEN · **draft lineage** | branch tip `4049b6378d8a865fb7249f3a9818a6c768945484` (B1→B7 work on `feat/service-workflow-b1-planning`) | historically depends on #155 / slice0-security | Workflow B1–B7 — **not** authorized for production merge |

**Dependency order**

```text
#155 (ca9f5067)  →  production app + Slice0/MI DB A–E
#156 / B1…B7     →  only after #155 production cutover plan is authorized;
                    B1–B7 DB packages are additive on staging and are NOT on production today
```

**#155 required CI (current rollup — SUCCESS unless noted)**

| Check | Result |
|-------|--------|
| Frontend Build & Test / Pipeline Summary / Vite production build | SUCCESS |
| Backend Tests & Security / Build & Scan Docker | SUCCESS |
| Typecheck base/head delta (Linux app tsc) | SUCCESS |
| Gate 1 shipability (secret scan + Vite) | SUCCESS |
| Supabase Migrations (version-format, approval-replay, marketplace-replay) | SUCCESS |
| Security Pipeline (dependency/code/headers) | SUCCESS |
| Constitutional + Hardening suites | SUCCESS |
| Marketplace reliability / Signup regression / Tech visibility / YDT tests | SUCCESS |
| Lighthouse CI | SUCCESS |
| Smoke / Supabase Preview / drafting-test-coverage | SKIPPED (workflow) |

`mergeable`: **MERGEABLE** (conflicts clean). Merge still **forbidden** until production DB cutover is authorized (auto-deploy risk).

**#156 / B7 branch CI:** treat as staging-verification lineage; do not use as production merge tip. Staging Spark acceptance of B7 does **not** authorize production.

---

## 2. Exact accepted revisions (staging B7)

| Layer | Revision / stamp | Evidence |
|-------|------------------|----------|
| Frontend (preview journey) | `78372312d73f79a78605a8f31d14df5b1b827c93` · `dpl_46faneJn7bnf6oE9rzxZm6Cfa6dn` | Binding + G-01/G-04; share **revoked** at retirement |
| Docs / closeout tip | `4049b637` | Linkage + hash correction + cleanup docs |
| Backend (Railway staging `slice0-api`) | `96f1d833cdddf0e81b45aa8251a219c045246662` · deploy `64673eff-…` | F-B7-01/02 |
| Database (staging) | F-B7-04 stamp `20261115184700` → F-B7-03 stamp `20261115185008` | `B7_STAGING_APPLY_6c501536.md` · Spark `1dc28279` / journey `6547040b` |
| Edge | `ticket-share-attachment` **v2** | Access-event record before sign |
| Digests (`lf_sha256`) | F-B7-04 `21c7352c…` · F-B7-03 `5bd81592…` | Tip == chunk; no reapply |

**Production app tip for Slice 0 / MI (unchanged):** still `#155` = `ca9f5067` — **not** the B7 branch tip.

---

## 3. Complete production migration order (+ staging chunk↔source)

### 3.1 Must ship with #155 (`ca9f5067`) — production **absent** today

Read-only prod `shfsebdncjnncqqnewfj`: **no** Slice 0 / MI / B1–B7 `schema_migrations` rows (latest prod catalog ends ~`20261106000000`).

| Order | Repo source | Staging live stamp(s) / name | Notes |
|------:|-------------|------------------------------|-------|
| A | `supabase/migrations/20261111010000_service_slice0_security_boundary.sql` | `20261110233314`…`33433` (`…_p1`…`_p2c`) | Chunked on staging |
| B | `docs/operations/slice0/staging_service_tickets_rls.sql` | `20261110233441` | Ops package; policy align |
| C | `…/20261111180000_machine_identity_pr1.sql` | `20261111165835` (abandon `…165001`) | Do not re-apply abandoned stamp |
| D | `…/20261111190000_machine_identity_missing_serial_plate_evidence.sql` | `20261111180711` | |
| E | `…/20261111200000_staging_machine_photos_and_ticket_number.sql` | `20261111193746` | |

Canonical packaging narrative: `docs/operations/slice0/PRODUCTION_RELEASE_RUNBOOK.md`.

### 3.2 Service-workflow B1–B7 (staging-applied; **not** production-authorized)

Apply to production **only** under a separate explicit authorization after #155 cutover. Staging chunk↔source reconciliation:

| Slice | Repo / package source | Staging live stamps (order) |
|-------|----------------------|-----------------------------|
| Security remediation | `applied-sql/01…05_…` + unstamped 01b/01c | `20261112141845` → `42222` → `42617` (+ profile SELECT `…152447` / `…152930` / `…153007`) |
| B1 | `20261111210000_service_workflow_b1_data_contract.sql` | `20261111222941` |
| B2 | B2 assignment migration | `20261111223057` |
| B3 | `applied-sql/b3-staging/01…05` @ filenames `…180000`…`…201500` | `20261112191932` → `192046` → `192133` → `192242` → `192533` |
| B4 | `applied-sql/b4-staging/` | `20261112224008`…`224219` + `…232020` attachment definer |
| B5 | `applied-sql/b5-staging/` | `20261115120412` → `120443` → `123124` |
| B6 | `applied-sql/b6-staging/` (chunked + corrections) | `20261115151114` → `151624` → `151655` → `151750` → `151814` |
| B7 | tip `20261115181000` (F-B7-04) then `20261115180000` (F-B7-03) | **`20261115184700` → `20261115185008`** |

**Rule:** Production packaging uses **repo file order + content digests (`lf_sha256`)**; staging MCP stamps differ — map stamps in the release ticket; never re-apply by filename if content already present.

---

## 4. Production drift / preflight / backup readiness

| Item | Status (read-only) |
|------|--------------------|
| Slice 0 / MI / B1–B7 on prod | **Absent** — full ordered apply required for any of these packages |
| Writer incompatibility | Old app + new DB (A) breaks direct updates; new app + old DB missing `govern_*` / identity RPCs — **synchronized cutover required** |
| Backup / PITR | **Required before any prod apply** — record backup id + timestamp; logical counts for tickets/machines/shares/storage |
| App rollback targets | Prior Vercel prod deployment + prior Railway prod deploy — **insufficient alone** once DB A lands; pair with DB restore |
| Edge secrets (prod) | Verify signed ticket-share attachment path; **no** public-bucket fallback |
| Preflight | Object existence / digest checks for `govern_*`, `register_machine_identity`, `link_ticket_machine`, ticket_number trigger, private buckets — after apply, before traffic |

Detail: `PRODUCTION_RELEASE_RUNBOOK.md` §2–3.2.

---

## 5. Coordinated cutover (auto-deploy on merge)

| Surface | Auto on merge to `main`? | Implication |
|---------|--------------------------|-------------|
| Vercel production frontend | **Yes** (`almona02.com` / `www`) | Merging #155 deploys `ca9f5067` writers immediately |
| Railway production API | **Yes** (prod service tracks `main`) | Same window as frontend |
| Supabase production migrations | **No** (CI = format/replay only) | Must be applied in the **same change window** as app, ordered A→E |
| Staging Railway `slice0-api` | Separate staging pin (`96f1d833` for B7) | Not the production cutover path |

**Cutover sketch (authorization required — not executed here):** freeze writes → DB A–E → merge/promote `#155`/`ca9f5067` → validate → lift freeze. Never leave mixed old/new writers vs DB. **Do not merge B7 branch as production tip** under current gates.

---

## 6. Remaining limitations / deferred scope

- **No production authorization** for Slice 0, MI, or B1–B7.
- **#155 frozen** / **#156 draft** — staging B7 acceptance ≠ production release.
- G-01 used **legacy serial-only** ticket create; canonical `machine_id` UUID path verified separately (`B7_MACHINE_LINKAGE_CLOSEOUT.md`).
- Live **service-role** branches and **multi-session races**: disposable evidence only — not live PASS.
- Parts fulfillment / automatic further-work linkage: out of B7 scope.
- Tracked non-B7 storage orphan (older prefix) remains per B6 closeout — do not delete unidentified data.
- Preview share for B7 journey **revoked**; do not regenerate for production prep.
- Fixture credentials **rotated and discarded** — re-mint only under a new authorized staging handoff.

---

## Spark final check pointer

See `B7_RETIREMENT_EXECUTED.md` § Spark final check. Retirement artifacts: handoff `CLEANUP_EXECUTION.json` + `CREDENTIALS_RETIRED.md`.
