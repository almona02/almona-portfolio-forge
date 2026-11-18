# Proposal — smallest routines journey-close milestone (planning only)

**Status:** Planning only · **not authorized** for implementation, staging apply, merge, FR-1, or production  
**Published with:** Lane C closeout @ runtime `e27f21a5` ([`LANE_C_STAGING_CLOSEOUT.md`](./LANE_C_STAGING_CLOSEOUT.md))  
**Does not begin:** recurrence · contracts/coverage entitlement · squads · stock · FR-1 · production · remote schema apply

**Rule:** Older blockers are **not** assumed open. Later green suites are **not** assumed to have closed earlier preserved limitations. Cite acceptance records for what they covered; classify the rest as missing **implementation** vs missing **verification**.

---

## 1. Reconciliation — B5 / B6 / B7

### 1.1 B5 — manager return/issue and customer issued-report access

| Field | Value |
|-------|-------|
| Latest acceptance evidence | [`B5_STAGING_ACCEPTANCE_2a4042ad.md`](./B5_STAGING_ACCEPTANCE_2a4042ad.md) · tip `2a4042ad44d9234739f514720c3d413ea0ca42e8` |
| Supporting contract | [`B5_MANAGER_REVIEW_CONTRACT.md`](./B5_MANAGER_REVIEW_CONTRACT.md) |
| Spark sense retained | Targeted correction **PASS** at `2a4042ad`; browser C-UI1…C-UI8 PASS; STAGING-B5-01 (owner issued-report mount) and STAGING-B5-02 (tech resubmit after return) closed at that tip |

| Classification | Content |
|----------------|---------|
| **Accepted functionality** | Admin/support review of an exact submitted revision; return with comments; approve/issue with issuance visibility; author cannot review own work; job completion gated on approved completing revision / no outstanding visits / verification ≠ `further_work_required`; owner-only customer issued-report UI + authorized evidence download; pending correction does not hide last issued |
| **Missing implementation (relative to B5’s own acceptance)** | **None claimed.** Do not treat B5-01/02 as open. |
| **Missing verification (preserved limits — not “unimplemented”)** | Service-role live branch; author-after-role-change live; signed-URL revocation lifetime; sales-role-owner UI (API may allow owner via workflow helpers; UI is customer-role-only, fail-closed). Some fixture create/complete/issue steps were API-assisted; the previously missing UI actions were still executed in-browser. |
| **Missing verification for routines join** | B5 was **not** re-proven on a Lane A→B→C pinned-checklist revision after Lane C closeout. That is a **join-evidence** gap, not a B5 reopen. |

### 1.2 B6 — customer acknowledgment and governed ticket closure

| Field | Value |
|-------|-------|
| Latest acceptance evidence | [`B6_STAGING_ACCEPTANCE_da2132b6.md`](./B6_STAGING_ACCEPTANCE_da2132b6.md) · tip `da2132b6f2ae6f75eed1187b7fad51ce3dbe97eb` |
| Closeout | [`B6_STAGING_CLOSEOUT_da2132b6.md`](./B6_STAGING_CLOSEOUT_da2132b6.md) · Spark live/LIVE2 `c32657e7…` · zero-confirm `ecc9e7c0` |
| Supporting contract / policy | [`B6_ACKNOWLEDGMENT_CLOSURE_CONTRACT.md`](./B6_ACKNOWLEDGMENT_CLOSURE_CONTRACT.md) · [`B6_ACKNOWLEDGMENT_CONTACT_POLICY.md`](./B6_ACKNOWLEDGMENT_CONTACT_POLICY.md) |

| Classification | Content |
|----------------|---------|
| **Accepted functionality** | Customer `accepted` / `refused` on exact issued revision; append-only history; admin/support `unavailable` only with attributable contact-attempt evidence; refusal requires disposition before close; `evaluate_ticket_workflow_prerequisites` named failures; governed resolve/close enforcement on activated tickets; customer acknowledgment UI + manager prerequisite/closure UI; disposable concurrency PASS; live API + LIVE2 browser PASS; operational closeout COMPLETE |
| **Missing implementation (relative to B6’s own acceptance)** | **None claimed.** Do not treat ack/closure RPCs or LIVE2 UI as unbuilt. |
| **Missing verification (preserved limits)** | Service-role branches and multi-session race: disposable evidence only — not re-litigated as live PASS. |
| **Missing verification for routines join** | B6 was **not** re-proven after Lane C on a fixture whose completing issued revision carries a Lane C `checklist_results` snapshot. Join-evidence gap only. |

### 1.3 B7 — complete workflow and role regression

| Field | Value |
|-------|-------|
| Latest program evidence | [`CORE_SERVICE_PROGRAM_STAGING_CLOSED.md`](./CORE_SERVICE_PROGRAM_STAGING_CLOSED.md) · [`B7_STAGING_RELEASE_BINDING.md`](./B7_STAGING_RELEASE_BINDING.md) · [`B7_RETIREMENT_EXECUTED.md`](./B7_RETIREMENT_EXECUTED.md) |
| Bindings (staging accepted + retired) | FE `78372312…` · BE `96f1d833` (F-B7-01/02) · DB F-B7-04→F-B7-03 stamps `20261115184700` / `20261115185008` · edge share-attachment v2 |
| Authorization sense | [`B7_PERMISSION_AUDIT_HARDENING_AUTHORIZATION.md`](./B7_PERMISSION_AUDIT_HARDENING_AUTHORIZATION.md) — journey + role boundaries + audit + bypass hunt on **existing** workflow (not routines product) |

| Classification | Content |
|----------------|---------|
| **Accepted functionality** | Staging-accepted permission/audit hardening of machine→ticket→jobs→visits→report→review/issue→acknowledgment→closure; role regressions across admin/support/tech/customer(/sales/anon) per B7 matrix intent; share create/revoke/access audited; Python ticket/message scope corrections; null-safe revoke/escalate; operational retirement COMPLETE |
| **Missing implementation (relative to B7’s closed program)** | **None claimed** for the B1–B7 journey itself. Explicit B7 **deferred** items (parts handover; automatic further-work follow-up linkage) remain deferred — **not** this proposal. |
| **Missing verification / preserved limitations** | Spec Status §A preserved SP-05/SP-05B claims-absent disposable FAIL (bounded; not reopened by later green). G-01 legacy serial create vs canonical `machine_id` documented separately. Spark B7 PASS ≠ CI on a production release tip ([`B7_RELEASE_READINESS_PACKET.md`](./B7_RELEASE_READINESS_PACKET.md)). |
| **Missing verification for routines join** | B7 role/journey regression was **not** re-run on a routines-bearing (Lane C) ticket after Lane C closeout. |

---

## 2. Preserve Lane A / B / C closeouts

| Lane | Latest record | Preserved status | Bound for this proposal |
|------|---------------|------------------|-------------------------|
| **A** | [`LANE_A_STAGING_APPLY_RECORD.md`](./LANE_A_STAGING_APPLY_RECORD.md) / deployment packet @ `e1345a0a` (+ FE nav `ad9570bc`) | Staging authoring applied/accepted lineage | Content authority for published versions |
| **B** | [`LANE_B_STAGING_CLOSEOUT.md`](./LANE_B_STAGING_CLOSEOUT.md) @ `d0c311c9` | **`STAGING_PASS_BOUNDED`** · operational closeout **COMPLETE** | Job pin authority; S-UI-02 bound travels **separately** (not fixed by journey-close) |
| **C** | [`LANE_C_STAGING_CLOSEOUT.md`](./LANE_C_STAGING_CLOSEOUT.md) @ `e27f21a5` | **`STAGING_PASS_BOUNDED`** · operational closeout **COMPLETE** | Checklist → B4 submit / history / header; Spark limitations (O-STG-1, matrix-only RLS listing, etc.) preserved |

Lane C’s 41/41 staging checks stop at **report revision submit** (plus NSFAIL / header / exclusion). They do **not** substitute for B5 issue or B6 ack/close evidence on the same continuous fixture.

---

## 3. Recommendation — smallest outstanding package

**Working name:** Routines journey-close (thin integration / evidence lane).

**Intent:** Prove—and only then correct **demonstrated** join defects—that one **activated** ticket with:

Lane A published routine → Lane B active pin → Lane C checklist execution → existing B4 submit → existing B5 return/issue → existing B6 acknowledgment (accepted / refused+disposition / unavailable) → existing governed resolve/close

completes **without** inventing new visit/job/ticket/ack rules.

This is the smallest package that finishes the **routines** path through customer acknowledgment and governed closure because B5/B6/B7 already accepted the terminal classic journey, and A/B/C already accepted the routines path through B4 submit—the outstanding gap is their **continuous join**.

| Classification | Item |
|----------------|------|
| **Missing verification (primary)** | Continuous staging API + deployed-browser proof of JC scenarios below on one routines-bearing fixture |
| **Missing implementation** | **None assumed.** Gap-hunt may discover join defects; until then do not schedule a B5/B6/B7 rebuild |
| **Accepted — reuse** | B5 @ `2a4042ad`, B6 @ `da2132b6`, B7 staging-closed bindings, Lane A/B/C closeouts through `e27f21a5` |

---

## 4. Scope

### In scope

1. Gap-hunt on the join only (pin + Lane C snapshot in submitted revision → issue → customer issued view → ack/disposition → closure prereqs).
2. Minimal corrections solely for defects demonstrated on that join (small reviewable commits).
3. Confirm issued revision stays customer-safe under B5 when `checklist_results` is present; Lane C attempt history remains non-customer.
4. Acceptance scenarios JC-01…JC-08 with Spark-independent vs access-holder attribution kept separate.
5. Staging-only verification after a separate Spark freeze/review **if** any migration is required.

### Out of scope

Recurrence · contracts/coverage · squads · stock/parts · FR-1 / #155 thaw · production · merge · re-authoring B5/B6/B7 · broadening ticket SELECT to force tech page render (Lane B S-UI-02) · reopening B7 deferred parts/further-work linkage as this milestone.

---

## 5. Unresolved decisions (proposal-time)

These are **open for supervisor/Spark** before implementation authorization—not silent defaults:

| ID | Decision | Notes |
|----|----------|-------|
| U-01 | Evidence-only vs correction tip | If gap-hunt is clean, may close as evidence-only PASS with no schema change |
| U-02 | Depth of B6 paths on the join fixture | Minimum: owner `accepted` + governed close. Whether refusal+disposition and unavailable+contact evidence are **required** on the same continuous fixture or covered by citing B6 @ `da2132b6` must be decided before freeze |
| U-03 | Customer visibility of checklist fields inside issued payload | Confirm whether any checklist keys are customer-visible beyond B5 customer-safe revision fields; no new customer attempt-history surface |
| U-04 | Browser binding | One immutable preview after any required freeze; do not treat Lane C `dpl_4DtM…` (share revoked) as live access |
| U-05 | Activated-only vs legacy jobless | Proposal assumes **activated** workflow tickets for prereq/closure; legacy jobless edge stays B7-documented, not expanded here |

**Closed for this proposal (reuse, do not re-decide):** B5 issue semantics @ `2a4042ad`; B6 ack/contact/closure @ `da2132b6`; Lane B sole job-pin authority; Lane C no new closure rules; attempt-history reader exclusion of ticket owners.

---

## 6. Dependencies

| Dependency | State | Role |
|------------|-------|------|
| B4 submit | Accepted `f63c9145` | Immutable revision + checklist envelope |
| B5 return/issue + customer issued UI | Accepted `2a4042ad` | Ack-eligible issued revision + owner view |
| B6 ack + governed closure | Accepted `da2132b6` + closeout | Journey terminal |
| B7 role/journey hardening | Staging-closed + retired | Permission/audit baseline |
| Lane A / B / C | Closeouts preserved through Lane C @ `e27f21a5` | Routines path into B4 |
| Activated workflow ticket | Existing B1+ activation | Prereq evaluator path |

No dependency on recurrence, contracts, squads, stock, or FR-1.

---

## 7. Acceptance scenarios (proposed)

Attribution must stay separate. Staging browser only on an immutable preview after any required freeze.

| ID | Scenario | Pass signal |
|----|----------|-------------|
| JC-01 | Activated ticket + published routine + active pin + Lane C capture (safety_gate passed) + B3 complete + B4 submit | Revision with pin-aligned `checklist_results` |
| JC-02 | Support/admin issues (B5); author cannot self-issue; return/resubmit path available if exercised | Issued visibility; job completion rules honored |
| JC-03 | Owner sees issued report (B5 UI); unrelated customer denied; attempt history not customer-readable | Aligns with B5 + Lane C reader |
| JC-04 | Owner `accepted` on exact issued revision (B6) | Effective ack; append-only audit |
| JC-05 | (Per U-02) `refused`+disposition and/or `unavailable`+contact evidence | Exact B6 deny/pass codes |
| JC-06 | `evaluate_ticket_workflow_prerequisites` then governed resolve/close | Named prereqs clear; terminal per B6 |
| JC-07 | Negatives: unissued not ack-eligible; wrong/stale revision ack denied | B6 attachment rules |
| JC-08 | Deployed browser: owner ack + staff closure on same fixture after issue | UI without privileged flips |

**Non-scenarios:** recurrence; contracts; squads; stock; production apply; substituting Lane C’s 41 checks for JC-*.

---

## 8. Explicit non-claims

- Does **not** authorize implementation or remote apply.
- Does **not** claim B5/B6/B7 incomplete relative to their acceptance records.
- Does **not** claim the continuous routines→ack→close path is already proven on staging.
- Does **not** reopen Lane B S-UI-02, Lane C O-STG-1, or B7 preserved limitations as in-scope work.
- Does **not** alter Lane A/B/C closeout text beyond citing them as preserved.
