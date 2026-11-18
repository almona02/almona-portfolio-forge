# Proposal — smallest routines journey-close milestone (planning only)

**Status:** Conditions resolved (docs amendment) · **verification-only** authorized under separate handoff · **not** authorized for product changes, migrations, merge, FR-1, or production  
**Base proposal tip:** `71f969a2da5e7c3b3b361f393f9e34c536694795`  
**Published with:** Lane C closeout @ runtime `e27f21a5` ([`LANE_C_STAGING_CLOSEOUT.md`](./LANE_C_STAGING_CLOSEOUT.md))  
**Does not begin:** recurrence · contracts/coverage entitlement · squads · stock · FR-1 · production · remote schema apply · manufactured implementation work

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

1. **Verification-only** gap-hunt on the join (pin + Lane C snapshot → B4 submit → B5 issue → customer issued view / U-03 snapshot check → U-02 refusal→disposition→reissue→acceptance → governed close).
2. **No manufactured implementation.** Report join defects; any fix requires a separately reviewed correction tip (U-01).
3. Owner-visible checklist representation from the **issued immutable snapshot** only (U-03); attempt history stays non-customer.
4. Acceptance scenarios JC-01…JC-08 (U-02/U-03 bindings below) with Spark-independent vs access-holder attribution kept separate.
5. Staging DB/runtime already applied (Lane C @ `e27f21a5` + accepted B5–B7). **No migrations** authorized by this step.

### Out of scope

Recurrence · contracts/coverage · squads · stock/parts · FR-1 / #155 thaw · production · merge · re-authoring B5/B6/B7 · broadening ticket SELECT to force tech page render (Lane B S-UI-02) · reopening B7 deferred parts/further-work linkage as this milestone.

---

## 5. Resolved conditions (docs amendment on `71f969a2`)

| ID | Resolution |
|----|------------|
| **U-01** | **Evidence-only completion is valid** if no integration (join) defect is found. Do **not** manufacture implementation work. Product changes / migrations are **not** authorized by this milestone; if a join defect appears, **report it** and propose a **separately reviewed** correction tip. |
| **U-02** | On the **joined** fixture, require: owner **`refused`** on the first issued revision → existing B6 **disposition / recovery** (`record_acknowledgment_disposition`, e.g. `create_follow_up` where follow-up work is needed) → **`accepted`** on a **later** issued revision reached only via the **existing B5 revision / reissue** path → **governed closure**. B6 forbids converting a refusal into acceptance on the same acknowledgment; if refusal is terminal for that acknowledgment, use revision/reissue—**no** state resets or direct database flips. **`unavailable`** handling **cites** accepted B6 evidence @ `da2132b6` and is labeled **not re-proven** in this journey. |
| **U-03** | **Verify** the **owner-visible checklist representation** from the **issued report’s immutable snapshot** (`service_report_revisions.checklist_results` / B5 customer-visible issued fields), within **existing** customer visibility rules. Do **not** expose Lane C internal attempt history and do **not** add a new customer surface. |
| **U-04** | Browser binding uses a **new** immutable protected preview for journey-close verification (Lane C `dpl_4DtM…` share remains revoked / retired). |
| **U-05** | **Activated** workflow tickets only for prereq/closure on this journey; legacy jobless edge stays B7-documented, not expanded. |

**Closed (reuse, do not re-decide):** B5 issue semantics @ `2a4042ad`; B6 ack/contact/closure @ `da2132b6`; Lane B sole job-pin authority; Lane C no new closure rules; attempt-history reader exclusion of ticket owners; Lanes A–C and B5–B7 acceptance records preserved.

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
| JC-02 | Support/admin issues first revision (B5); author cannot self-issue | Issued visibility; job completion rules honored |
| JC-03 | Owner sees issued report (B5 UI) and **owner-visible checklist representation from the issued immutable snapshot** (U-03); unrelated customer denied; attempt history not customer-readable; **no new customer surface** | Aligns with B5 + Lane C reader |
| JC-04 | Owner **`refused`** on that first issued revision (B6) | Effective ack `refused`; append-only |
| JC-05 | Manager **disposition / recovery** on that refusal (existing B6 RPC); then **revision/reissue** (existing B5 path—no DB flips) to a **new** issued revision; owner **`accepted`** on that later issued revision (U-02). **`unavailable`:** cite B6 @ `da2132b6` — **not re-proven** here | Exact B6 codes; refusal not converted to acceptance on the same acknowledgment |
| JC-06 | `evaluate_ticket_workflow_prerequisites` then governed resolve/close after acceptance on the later issued revision | Named prereqs clear; terminal per B6 |
| JC-07 | Negatives: unissued not ack-eligible; wrong/stale revision ack denied; refusal→acceptance without reissue denied | B6 attachment / no-convert rules |
| JC-08 | Deployed browser on the **new** immutable preview: owner issued-view (U-03) + refusal + staff disposition + post-reissue acceptance + closure | UI without privileged flips |

**Non-scenarios:** manufacturing product work when evidence-only would pass (U-01); re-proving `unavailable` live; recurrence; contracts; squads; stock; production apply; substituting Lane C’s 41 checks for JC-*.

---

## 8. Explicit non-claims

- Does **not** authorize product changes, migrations, merge, FR-1, or production. Verification-only handoff is separate.
- Does **not** claim B5/B6/B7 incomplete relative to their acceptance records.
- Does **not** claim the continuous routines→ack→close path is already proven until Spark records it.
- Does **not** reopen Lane B S-UI-02, Lane C O-STG-1, or B7 preserved limitations as in-scope work.
- Does **not** alter Lane A/B/C or B5–B7 acceptance/closeout text beyond citing them as preserved.
- Does **not** re-prove B6 `unavailable` on this journey (cite only; label not re-proven).
