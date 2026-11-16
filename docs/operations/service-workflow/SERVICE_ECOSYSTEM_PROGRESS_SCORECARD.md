# Service ecosystem — progress scorecard

**Original plan:** Cursor plan `service_ecosystem_plan_a70ef088` (*Service Ecosystem Plan*, Nov 2026)  
**Repo path for this living score:** `docs/operations/service-workflow/SERVICE_ECOSYSTEM_PROGRESS_SCORECARD.md`  
**Updated:** 2026-11-16 (reconciliation against accepted staging / FR-1 evidence already in the repository)  
**Nature of this document:** Documentation reconciliation only — **not** new implementation, Spark verdicts, fresh tests, merge authorization, or production authorization.

---

## Headline milestones (preferred)

Unsupported single-number “percent complete” headlines are **not** the status of record. Use the milestones below. Separate **staging acceptance**, **release-candidate verification**, **recovery readiness**, and **production deployment**.

| Milestone | Status | Evidence (accepted; not re-run here) |
|-----------|--------|--------------------------------------|
| Slice 0 + machine identity staging | **Staging accepted** | Frozen #155 tip `ca9f5067`; program closeout chain |
| B1–B2 jobs / assignment | **Staging accepted** | `B1_B2_STAGING_ACCEPTANCE_CLOSEOUT.md` @ staging program tip |
| B3 visits / safety | **Staging accepted for continued development** | `4e0ddd22` — staging-backed **local browser**; hosted preview **unresolved** for that original run ([`B3_STAGING_DEVELOPMENT_ACCEPTANCE.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/B3_STAGING_DEVELOPMENT_ACCEPTANCE.md)) |
| B4 technician report submission | **Staging accepted** | `f63c9145` |
| B5 manager review / issue / owner issued-report access | **Staging accepted** | Tip **`2a4042ad`** — returned-report resubmission + owner issued-report access passed in the **deployed browser** ([`B5_STAGING_ACCEPTANCE_2a4042ad.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/B5_STAGING_ACCEPTANCE_2a4042ad.md)) |
| B6 acknowledgment / closure | **Staging accepted + closeout retained** | Tip **`da2132b6`** — accept, refuse disposition, unavailable-contact evidence, close, idempotent re-close ([`B6_STAGING_ACCEPTANCE_da2132b6.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/B6_STAGING_ACCEPTANCE_da2132b6.md), [`B6_STAGING_CLOSEOUT_da2132b6.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/B6_STAGING_CLOSEOUT_da2132b6.md); Spark live/browser `c32657e7`, zero-confirm `ecc9e7c0`) |
| B7 permission / audit / journey staging | **Staging verification complete · operationally closed** | Program closeout [`CORE_SERVICE_PROGRAM_STAGING_CLOSED.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/CORE_SERVICE_PROGRAM_STAGING_CLOSED.md); retirement executed [`B7_RETIREMENT_EXECUTED.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/B7_RETIREMENT_EXECUTED.md); final retirement evidence **`32750762`** (`test(spark): B7 record closed — retirement verified`) |
| Canonical machine UUID linking | **Separately verified** | Not the G-01 create gesture — see distinction below ([`B7_MACHINE_LINKAGE_CLOSEOUT.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/B7_MACHINE_LINKAGE_CLOSEOUT.md); Spark L-0..L-3 `d4a9950d`) |
| FR-1 Slice0 + share/privacy RC | **Independent content + follow-up accepted · CI green · production unapplied** | Freeze tip **`e17858a5`**; content PASS `d3ef35d4`; follow-up PASS `a86c6ab0`; packet [`FR1_PRODUCTION_APPROVAL_PACKET.md`](./FR1_PRODUCTION_APPROVAL_PACKET.md) — **production remains unapplied / not authorized** |
| Recovery readiness (FR-1 gate) | **Not ready** | Verified DB export credential + isolated DB/Storage recovery still open ([`FR1_LOCAL_REHEARSAL_STATUS.md`](./FR1_LOCAL_REHEARSAL_STATUS.md), [`FR1_BACKUP_RESTORE_REHEARSAL_EXECUTION.md`](./FR1_BACKUP_RESTORE_REHEARSAL_EXECUTION.md)) |
| Production rollout (any after-sales package) | **Not applied** | No production apply of FR-1 or B1–B7 workflow |
| Configurable manufacturer/model routines | **Authoring contract prepared · Spark before runtime** | Proposal [`SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md`](./SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md); contract on `feat/service-routines-authoring` |

### Machine-link distinction (preserve)

| Path | What was proven | What it is **not** |
|------|-----------------|--------------------|
| B7 G-01 main journey | End-to-end journey on **deliberate legacy free-text serial** selection (`machine_id` NULL on that ticket) | Canonical UUID identity on that create gesture |
| Separate canonical verify | `register_machine_identity` → selected UUID → `link_ticket_machine` → persist/reload + cross-customer deny | A rewrite of the G-01 journey create path |

### B3 evidence attribution (preserve; do not rewrite)

Original B3 acceptance remains: Spark/Cursor evidence on a **staging-backed local browser**, with **hosted Vercel protected preview unresolved** for that run. Later **deployed** B7 (and B4/B5/B6 preview) coverage may **supplement** release-readiness discussion of hosted delivery, but **must not** be rewritten into the original B3 acceptance record as if that B3 run had passed hosted preview.

---

## Old → new correction table

| Topic | Stale scorecard claim | Corrected claim |
|-------|----------------------|-----------------|
| B5 | “awaits verified UI completion”; manager/customer UI “await acceptance” | **Accepted** at `2a4042ad`: returned-report resubmission + owner issued-report access passed in deployed browser |
| B6 | “Customer acknowledgment and ticket closure — not yet verified” | **Accepted** at `da2132b6`: acknowledgment, refusal disposition, unavailable-contact evidence, closure, idempotent re-close; closeout evidence retained |
| B7 | “final B7 journey remains” | Staging verification + operational closeout **complete**; final retirement evidence `32750762` |
| Canonical machine UUID | (folded into / confused with journey) | Separately verified; G-01 used **legacy free-text** by design |
| Next steps | “Finish B5 → B6 → B7” | **Two tracks:** (1) release preparation / FR-1 gates; (2) product expansion (routines authoring package) |
| Headline % | `~40–45%` / `~75–80%` ecosystem / core without published denominator | Replaced by **milestone statuses** only; optional overall percentages removed |
| FR-1 vs workflow | Implied core-loop finish unlocks production | FR-1 is Slice0 + share/privacy hardening **without** B1–B7 workflow; **does not** deploy the full staging journey |
| Production | “0%” / backup gate blocking | Still **unapplied**; recovery rehearsal incomplete — separate from staging acceptance |

---

## Next steps — two separate tracks

### Track 1 — Release preparation (FR-1)

1. Recover a **verified** database export credential (read-only dump session).
2. Complete **isolated** database + Storage recovery on the local rehearsal stack.
3. Rehearse the **exact FR-1 migration chain** (A→E + F-B7-04 → F-B7-03 / FR-1 stamped equivalents) on that restored copy.
4. Only then request a **separate** production decision (packet remains non-authorization until that decision).

FR-1 freeze `e17858a5` already has independent content acceptance (`d3ef35d4`) and follow-up acceptance (`a86c6ab0`) with green CI on that tip. That is **RC verification**, not production apply.

**Explicit:** FR-1 does **not** ship B1–B7 job/visit/report/ack workflow. Shipping those surfaces is a later coordinated package (see readiness packet FR-2 / workflow release framing).

### Track 2 — Product expansion (routines authoring)

- Bounded **routine-authoring** package (Lane A): see workflow-lineage branch `feat/service-routines-authoring` and `SERVICE_ROUTINES_AUTHORING_IMPLEMENTATION_CONTRACT.md` (Spark review before runtime).
- Still excluded here: contract activation, recurrence, squads, stock, technician result capture, production deploy.
- Outstanding deferred scope remains in the area table below (contracts, squads, spares, passport expand, fault library, commercial/onboarding, analytics).

---

## Area status (latest verified)

| Area | Status |
|------|--------|
| Security, permissions, governed ticket actions | ✅ Staging verified; later B7 share/privacy corrections verified (and packaged into FR-1 RC) |
| Machine identity, registration, ticket linking | ✅ Staging verified; canonical UUID link proven separately from G-01 legacy free-text journey |
| Jobs, assignment, technician decline | ✅ Staging-backed browser verified (incl. accepted B2-BR-MULTI visit-state rule) |
| Visits, safety acknowledgment, attendance history | ✅ Live checks + staging-backed **local** browser verified; **hosted-preview qualification for original B3 run retained as unresolved** |
| Technician report submission | ✅ Deployed staging browser verified (B4), including evidence upload and retry |
| Manager review, issue, customer report access | ✅ Staging accepted at `2a4042ad` (returned resubmit + owner issued-report UI in deployed browser) |
| Customer acknowledgment and ticket closure | ✅ Staging accepted at `da2132b6` (accept / refuse / unavailable attempts / close / idempotent re-close) |
| Complete workflow regression and role validation | ✅ B7 staging verification + operational closeout complete (`32750762`); production not implied |
| Configurable manufacturer/model service routines | 📝 Authoring **implementation contract** prepared on workflow lineage; Spark review before runtime; Lane B/C still out of scope |
| Contracts, coverage, tiers, recurring maintenance | ⏳ Major work remains (deferred; original plan + later roadmap) |
| Squads, dispatch, workload and manager dashboard | ⏳ Basic individual assignment exists; squad operations remain |
| Spare parts, compatibility, quotes, stock and fulfillment | ⏳ Major work remains |
| Full passport, QR, transfers and reconciliation | 🟡 Identity foundation verified; expanded workflows remain |
| Manual-machine fault library and guided checks | 📝 Structure planned; reviewed content and guided workflows remain |
| Notifications and daily workspaces | 📝 Planned; delivery not established |
| Commercial approval and billing handoff | 📝 **Later roadmap addition** (not in original plan core); implementation not established |
| White-label packaging, onboarding and integrations | 📝 **Later roadmap addition**; production-ready delivery not established |
| Operational analytics | 📝 Planned; reliable event foundation is developing |

**Legend:** ✅ staging-verified / accepted · 🟡 partial / foundation only · ⏳ major work / not verified · 📝 planned / proposal / addendum only

### Preserved limitations (non-exhaustive; evidence docs govern)

- No merge of #155 / #156 / #158 implied by staging closeout or this scorecard.
- Live **service-role** branches often disposable-only / NOT TESTED by design (B3/B5/B6 matrices).
- B6 live NOT TESTED: multi-session race on staging (disposable concurrency only).
- B5 live NOT TESTED (retained): service-role live branch; author-after-role-change live; signed-URL revocation lifetime; sales-role-owner UI view (UI customer-role-only).
- B7 G-01 = legacy serial-only create; access JWT not claimed immediately killed on logout (refresh revoked; JWT valid until exp) — see retirement record.
- FR-1: backup/PITR unavailable on free plan; logical dump recovery not yet proven; production **blocked** on recovery proof.
- Orphan storage and other tracked non-B6 artifacts remain as disclosed in B6 closeout (do not delete unidentified data).

---

## Mapping to original plan vs later roadmap

| Item | Origin | Scorecard position |
|------|--------|--------------------|
| Slice 0 security / share / attachments / mutation / staging RLS | **Original plan** | ✅ Staging + FR-1 RC packaging of share/privacy hardening |
| Machine identity / twin / passport foundation | **Original plan** | ✅ / 🟡 foundation verified; expanded passport workflows remain |
| Jobs + reports (+ B2–B6 visits/reports/ack) | **Original plan** | ✅ Staging accepted through B6; B7 hardening closed operationally |
| Full permission/audit journey (B7) | **Original plan (validation)** | ✅ Staging closed; not production |
| Squad authorization before squad UX | **Original plan** | ⏳ |
| Contract coverage before recurrence | **Original plan** | ⏳ |
| Recurrence / SLA-tier unification | **Original plan** | ⏳ |
| Spare parts E2E | **Original plan** | ⏳ |
| Manual fault taxonomy | **Original plan** | 📝 |
| Service routines (versioned / configurable) | **Post-plan addendum** | 📝 authoring contract (Lane A); Spark before runtime |
| Commercial / white-label / onboarding / integrations | **Later roadmap addition** | 📝 not established |
| Notifications / analytics | **Original plan / evolving** | 📝 |

### Explicit outstanding scope (not done)

Contracts/coverage/tiers/recurrence · squads/dispatch · spare-parts E2E · expanded passport/QR/transfers · fault-library content · notifications/workspaces · commercial/onboarding/integrations · operational analytics · routines Lane B (pin/results) and Lane C · FR-1 recovery/production apply.

---

## Related artifacts

- Original Cursor plan: `~/.cursor/plans/service_ecosystem_plan_a70ef088.plan.md`
- Staging program closeout: [`CORE_SERVICE_PROGRAM_STAGING_CLOSED.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/CORE_SERVICE_PROGRAM_STAGING_CLOSED.md) (tip `65d6ff86`)
- Release-readiness framing: [`B7_RELEASE_READINESS_PACKET.md`](https://github.com/almona02/almona-portfolio-forge/blob/65d6ff86/docs/operations/service-workflow/B7_RELEASE_READINESS_PACKET.md)
- Routines first-slice proposal: [`SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md`](./SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md)
- FR-1 production packet (not authorization): [`FR1_PRODUCTION_APPROVAL_PACKET.md`](./FR1_PRODUCTION_APPROVAL_PACKET.md)
- FR-1 follow-up evidence: `a86c6ab0` · [`SPARK_FR1_FOLLOWUP_DEPS_FALLBACK.md`](./SPARK_FR1_FOLLOWUP_DEPS_FALLBACK.md)
)
