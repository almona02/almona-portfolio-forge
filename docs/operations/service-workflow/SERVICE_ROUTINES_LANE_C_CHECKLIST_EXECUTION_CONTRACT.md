# Service routines — Lane C technician checklist-execution contract (planning only)

**Status:** Planning contract for Spark review · **no implementation · no remote apply · no merge · no production · no FR-1** until Spark PASS on this tip  
**Depends on:** Lane A authoring **COMPLETE**; Lane B job pins **`STAGING_PASS_BOUNDED`** + operational closeout **COMPLETE** ([`LANE_B_STAGING_CLOSEOUT.md`](./LANE_B_STAGING_CLOSEOUT.md)) — closeout text unchanged by this contract tip  
**Does not authorize:** recurrence · contracts/coverage entitlement · squads · stock · FR-1 · ticket-RLS chain correction (tracked separately)  
**Naming note:** “Lane C” here means **technician checklist execution**. Earlier proposal text that used “Lane C” for contracts/recurrence/squads is **superseded for naming only**; those packages remain out of scope.

---

## 1. Intent (smallest package)

Let the **attending technician** execute the checklist defined by the job’s **exact active pinned published version**, record **visit-bound results** (answers, measurements, evidence, failed / not-applicable), preserve **authorship and history** across reassignment / retries / corrections, and wire those results into the **existing** B3 visit completion and B4 report-submit paths **without inventing new visit/job/ticket closure rules**.

- Checklist **content** is read-only from Lane A immutable published payload for the pinned `service_routine_versions.id`.
- Pin **identity** is Lane B job-only (`service_job_routine_pins` active row). This package does not re-open pin mutate rules.
- B3 minimum **safety attestation** for visit start remains mandatory and is **not** replaced by routine `safety_gate` items.
- Routine `safety_gate` items are **non-waivable** at execution; manufacturer measurement limits are **source-backed** only (no invented tolerances).

---

## 2. In scope / out of scope

| In scope | Out of scope (explicit) |
|----------|-------------------------|
| Resolve checklist from job’s **active** pin → exact version payload | Pin / replace / unpin (Lane B) |
| Visit-bound result capture + validation | Recurrence / scheduling generators |
| Technician authority for execute / correct | Contracts / paid coverage / entitlement |
| Required / optional / safety_gate answer rules | Squads / multi-tech simultaneous edit |
| Measurements + units + source-backed limits | Stock / parts consumption |
| Evidence requirements for items that demand them | Editing published routine content |
| Failed and not-applicable outcomes | Customer-facing routine authoring |
| Authorship, retries, corrections, history | Broadening ticket SELECT “to make the page render” |
| Relation to **existing** visit complete + report submit | New ticket/job closure or resolve semantics |
| Acceptance scenarios + deny codes | FR-1 / production / merge |

---

## 3. Closed policy decisions

### 3.1 Content source (closed)

| Topic | Decision |
|-------|----------|
| Authoritative pin | Job’s single **active** `service_job_routine_pins` row (`status = active`) |
| Checklist body | Exact immutable `service_routine_versions` payload for that pin’s `routine_version_id` |
| Missing active pin | No Lane C checklist execution UI/RPC; B4 path remains “no pin → `checklist_results` must be NULL” |
| Later publish N+1 | Never mutates in-flight results; content stays on the pinned version id |
| Visit dual-authority pin | **Forbidden.** Job pin remains sole pin authority (Lane B) |

### 3.2 B4 pin-id resolution + snapshot timing (closed — single authority)

B4 `validate_checklist_for_pin` today compares `checklist_results.routine_version_id` to **`service_job_visits.pinned_routine_version_id`**. Lane B does not write that column. Job pin remains sole authority.

| Topic | Decision |
|-------|----------|
| Authority | Validators and UI **resolve the job’s active pin** `routine_version_id` (Lane B table). Content and skew checks use that id. |
| Snapshot **event** | Exactly **one** server write: first successful Lane C `record`/`begin` RPC for that visit when (`visit.state = in_progress` ∧ caller is attending tech ∧ job has active pin). Not on visit start alone; not on read/preview. |
| Once-only guard | `UPDATE … SET pinned_routine_version_id = <job_active> WHERE id = visit AND pinned_routine_version_id IS NULL` (or equivalent). Second attempt leaves the column unchanged; if already set to a different id → deny `routine_checklist_version_skew`. |
| Semantics | Denormalized snapshot for B4 shape — **not** an independent pin/replace/unpin surface |
| No active pin | Visit pin column stays NULL; no checklist capture; B4 “no pin → `checklist_results` NULL” unchanged |
| Forbidden | Independent visit pin mutate UI/RPC; dual-write races that diverge from the job pin |

### 3.3 Results store (closed)

| Topic | Decision |
|-------|----------|
| Working answers | **Visit-bound** append-only answer history (illustrative table name `service_visit_checklist_answer_history`) plus a current projection readable for the visit (may live on `service_job_visits.checklist_results` as working JSON **or** a current-row view). History is required for retries/corrections authorship |
| Submitted snapshot | B4 `service_report_revisions.checklist_results` remains the **immutable submit-time** snapshot (existing B4 rule) |
| Submit envelope | Keep B4 keys: `{ "routine_version_id": "<uuid>", "items": [ … ] }` |
| Per-item `result` object (pinned) | `{ "outcome": "passed"\|"failed"\|"not_applicable", "value": <number\|null>, "unit": <string\|null>, "evidence_paths": <string[]>, "note": <string\|null>, "answered_at": <timestamptz>, "attempt": <int> }` — `value`/`unit` required for `measurement` when outcome is `passed` or `failed`; `evidence_paths` required when the published item requires evidence |

### 3.4 Technician authority (closed)

Reuse existing helpers; do **not** invent a parallel auth stack.

| Action | Who |
|--------|-----|
| Read checklist content for an authorized visit/job | Admin, support, **attending or currently assigned** technician with `can_read_ticket_workflow` (Lane A published/retired preview rules for payload) |
| Capture / update in-progress results | **Only** `service_job_visits.attending_technician_id` with role `technician` (B4 R4-05) |
| Submit report including checklist snapshot | Attending technician only (B4 unchanged) |
| Customer / anon | **No** internal checklist content; **no** result writes |
| **Current** job assignee (not attending) | May **read** checklist content if `can_read_ticket_workflow`; **no** answer writes |
| **Former** job assignee (reassigned away; never attending / no longer attending) | **No** checklist read/write via assignee path once assignment ends, unless still workflow-readable via **historical attendance** on a visit of that ticket |
| Historical attending tech | Retains **read** of that visit’s answer history + B4 submit rights for that visit; **cannot** write new answers if no longer `attending_technician_id` |
| Job reassignment | Never rewrites authorship; new assignee does not inherit prior answers |

### 3.4.1 Frozen deny / conflict codes (closed)

| Situation | SQLSTATE | DETAIL (exact) | API |
|-----------|----------|----------------|-----|
| Authz deny | `42501` | `routine_checklist_authz_denied` | 403 |
| Validation / unknown type / missing unit / completeness | `22023` | `routine_checklist_validation_denied` | 400 |
| Version skew (snapshot ≠ job pin / envelope mismatch) | `22023` | `routine_checklist_version_skew` | 400 |
| Stale optimistic edit | `PT409` | `routine_checklist_stale_revision` | 409 |

### 3.5 Item vocabulary, classification, fields, outcomes (closed)

**Supported item `type` values (execution vocabulary — closed):**  
`safety_gate` | `inspection` | `measurement` | `photo_evidence` | `task` | `note`  
Any other / missing `type` → deny `routine_checklist_validation_denied` (unknown item type).

**Authoritative safety / requirement classification:** published item field **`requirement_class`** ∈ {`safety_gate`, `required`, `optional`}.  
- Execution completeness and waiver rules key off **`requirement_class`**, not display labels.  
- If `type = safety_gate`, published `requirement_class` **must** be `safety_gate` (Lane A publish rule); if a published row violates that, execution treats it as `safety_gate` and still non-waivable.  
- `waivable` on published items is ignored for `requirement_class = safety_gate` (always non-waivable).

| Outcome | Meaning | Allowed when |
|---------|---------|--------------|
| `passed` | Requirement satisfied | Any type when criteria met |
| `failed` | Requirement not met | Any non-safety item; **does not** waive safety |
| `not_applicable` | Item does not apply in this visit context | **Only** if the **published** item explicitly allows N/A. If Lane A payload has no allow-N/A flag, treat as **disallowed** (forward-compatible). **Never** on `safety_gate` |
| omit / missing | No recorded outcome | **Denied** at submit for `required` and `safety_gate`; allowed for `optional` |

**Submit completeness (closed)**

| Class | Submit allowed when |
|-------|---------------------|
| `safety_gate` | Current outcome is **`passed`** (and evidence if required). `failed` or missing → **submit denied** |
| `required` | Current outcome ∈ {`passed`, `failed`} or allowed `not_applicable`. Missing → denied. **`failed` does not by itself block submit** (report findings carry the failure) |
| `optional` | Outcome present or omitted |

**Published field sources and absent-field defaults (closed)**

| Concern | Published source field(s) | Absent / null behavior |
|---------|---------------------------|------------------------|
| Unit | `unit` (string) on measurement items | Non-measurement: store `unit=null`. Measurement without `unit`: deny record/submit (`routine_checklist_validation_denied`) — do not invent a unit |
| Limit | `limit` object with numeric `min` and/or `max`, plus source ref (Lane A) | No limit → store value; **no** pass/fail from tolerance. Limit without source is a Lane A publish error; runtime still must not invent tolerance |
| Bound inclusivity | `limit.min_inclusive` / `limit.max_inclusive` (boolean) | **Default `true` (inclusive)** when the corresponding min/max is present and the flag is absent |
| Evidence requirement | `evidence` ∈ {`none`, `required`, …} or boolean `evidence_required` | Absent → treat as **`none`** (evidence not required) |
| N/A allowance | `allow_not_applicable` (boolean) | Absent → **`false`** (N/A denied). Always false for `requirement_class=safety_gate` |
| Item identity | `id` (string) on item | See **stable item key** below |

**Stable item key (immutable for the visit snapshot)**

1. Prefer published `item.id` when non-empty.  
2. Else `item_key = section.id || '/' || zero_based_index` within that section of the pinned version payload.  
3. At snapshot/first-record time, persist `item_key` (+ optional `item_id`) on every answer row; **never renumber** later if payload order is re-read. Answers reference `item_key`, not live array position.

**Measurements**

- Record numeric `value` + published `unit`.
- Compare using flags: if `min` set and `min_inclusive` (default true), fail when `value < min`; if min exclusive, fail when `value <= min`. Symmetric for `max` (`>` vs `>=`).
- Out-of-limit → outcome `failed` (unless allowed N/A selected).

**Evidence**

- When evidence is required, capture/submit needs ≥1 ticket-attachments path (B4 rules).
- Evidence attributable to answering actor + attempt.

**Safety gates (execution)**

- Non-waivable; no force-pass.
- Failed/missing safety_gate **blocks report submit**.
- No new visit-abort/ticket-close rules (B3/B4/B6 unchanged).

### 3.6 Authorship, retries, corrections, optimistic conflict (closed)

| Topic | Decision |
|-------|----------|
| Authorship | Every answer/correction stores `actor_id`, `actor_role`, timestamp, visit_id, `item_key`, attempt/ordinal |
| Retry | Same attending tech may replace in-progress answer before submit; prior value retained in append-only history |
| Correction after submit | No silent edit of submitted revision (B4). Lane C does not invent post-submit rewrite |
| Reassignment | History keeps original `actor_id` |
| Optimistic token | Visit working checklist carries **`checklist_revision`** (monotonic int or content digest). Client **must** send `expected_checklist_revision` on record/correct |
| Conflict | If expected ≠ current → **fail explicitly**: SQLSTATE **`PT409`**, DETAIL **`routine_checklist_stale_revision`**, API **409**. Business unchanged; optional audit `routine_checklist_validation_denied` / dedicated conflict audit. **Advisory locking alone does not satisfy** the loser-conflict requirement — the loser must receive this explicit conflict |
| Serialize | Still acquire ticket → job → visit locks to prevent lost updates; lock without the token check is insufficient |

### 3.7 Relation to visit completion and report submission (closed — no new closure rules)

Cite only existing program rules:

| Existing rule | Source | Lane C relationship |
|---------------|--------|---------------------|
| Visit start requires B3 minimum safety attestation | B3 D-B3-02 | Unchanged; routine safety_gate ≠ B3 start gate |
| Visit complete / abort / no-access via existing RPCs | B3 | Unchanged transition set and auth order |
| Report submit requires visit `completed` | B4 domain rule 6 | Unchanged |
| Submitter = attending technician | B4 R4-05 | Unchanged |
| When visit pin / routine pin present, submit requires `checklist_results` matching version | B4 configurable-routines section | Lane C supplies validated results; when job has active pin, treat as pin-present for submit |
| When no pin, `checklist_results` must be NULL | B4 | Unchanged |
| Submit may move job `in_progress → awaiting_review`; must not complete job or close ticket | B4 domain rule 12 | Unchanged |
| Acknowledgment/closure do not clear safety or imply return-to-service | B6 | Out of Lane C; do not contradict |

**Lane C additions (checklist only):**

1. If the job has an **active** pin, report submit is **denied** until §3.5 submit-completeness holds (every `safety_gate` **passed**; every `required` answered; evidence where required; `routine_version_id` matches job active pin).
2. Lane C does **not** require checklist completion merely to call `complete_service_job_visit` unless an **already-accepted** B3 rule says so (it does not today). Operators may complete a visit and still be blocked at **submit** until checklist is satisfied when a pin is active.
3. No new ticket status, job terminal state, or acknowledgment rule.

### 3.8 Audit (closed)

Append-only `public.service_workflow_audit` (program ledger). **Pinned** `action` strings (do not invent synonyms):

| `action` | When |
|----------|------|
| `routine_checklist_item_recorded` | First successful answer for (visit, item, attempt lineage) |
| `routine_checklist_item_corrected` | In-progress replacement before submit |
| `routine_checklist_submit_validated` | Checklist validated inside report-submit transaction |
| `routine_checklist_authz_denied` | Unauthorized read/write attempt (optional separate txn) |
| `routine_checklist_validation_denied` | Shape/completeness/skew/safety deny (optional separate txn) |

`entity_type` for answer rows: `service_job_visit` (or dedicated checklist entity if introduced). Success write + success audit atomic. Denies leave business state unchanged.

---

## 4. Permission matrix (summary)

| Action | Admin | Support | Attending tech | Assigned tech (not attending) | Customer | Anon |
|--------|-------|---------|----------------|-------------------------------|----------|------|
| Read pinned checklist content | R | R | R | R (preview/read if workflow-readable) | — | — |
| Record / correct in-progress results | — | — | R | — | — | — |
| Submit revision w/ checklist snapshot | — | — | R (B4) | — | — | — |
| Waive safety_gate | — | — | — | — | — | — |

---

## 5. Acceptance scenarios (contract battery — planning)

Scenarios are **specification**, not an implementation commit.

| ID | Scenario | Expected |
|----|----------|----------|
| LC-01 | Job active pin V; tech opens visit checklist | Renders exact V sections/items; safety section first; units + source refs visible; no edit of published text |
| LC-02 | No active pin | No checklist capture; submit with `checklist_results` non-null denied (B4) |
| LC-03 | Required item omitted at submit | Denied `routine_checklist_validation_denied` (or B4 validation); revision not created |
| LC-04 | Safety_gate failed | Submit denied; no waiver path |
| LC-05 | Safety_gate N/A attempted | Denied always |
| LC-06 | Optional item omitted | Allowed |
| LC-07 | Measurement with source-backed limit, value out of limit | Item `failed`; if `safety_gate` → submit denied; if `required` → submit allowed once answered; if `optional` → submit allowed |
| LC-08 | Measurement with no published limit | Store value+unit; **no** invented pass/fail tolerance |
| LC-09 | Evidence-required item without evidence | Denied |
| LC-10 | `routine_version_id` ≠ job active pin / visit snapshot | Denied (skew) |
| LC-11 | Non-attending tech writes results | `42501` / `routine_checklist_authz_denied` |
| LC-12 | Customer reads internal checklist / results | Denied / empty of internal content |
| LC-13 | Retry/correct before submit | History retains prior answer; authorship = same attending tech |
| LC-14 | Job reassigned after answers recorded | Prior answers keep original actor; new assignee cannot claim authorship |
| LC-15 | Visit complete without checklist (pin active) | Allowed under B3; **submit** then denied until checklist satisfied (§3.7) |
| LC-16 | Visit complete + valid checklist + B4 payload | Submit PASS; revision stores immutable `checklist_results`; job may → `awaiting_review` only |
| LC-17 | OOS ticket/job | Denied isolation (no read/write) |
| LC-18 | Concurrent corrections with expected revision | One winner; loser **`PT409` / `routine_checklist_stale_revision`** |
| LC-19 | Unknown item `type` | `routine_checklist_validation_denied` |
| LC-20 | Measurement missing published `unit` | Denied; no invented unit |
| LC-21 | Limit min exclusive boundary | Value equal to min → `failed` when `min_inclusive=false` |
| LC-22 | Item without `id` | Answers use frozen `section.id/index` `item_key`; stable across reread |
| LC-23 | Snapshot second write | Once-only; no overwrite; skew if diverges |
| LC-24 | Former assignee (not attending) after reassignment | Checklist read/write denied |
| LC-25 | Historical attending after reassignment | Read history + B4 submit OK; new answer writes denied |

---

## 6. Explicit non-goals / non-claims

- Ticket header privacy / S-UI-02 route access is specified in [`TICKET_RLS_TECHNICIAN_ROUTE_ACCESS_GAP.md`](./TICKET_RLS_TECHNICIAN_ROUTE_ACCESS_GAP.md) (narrow header RPC — not full-row SELECT).
- Does not re-litigate Lane B pin freeze, applicability, or customer exclusion.
- Does not authorize staging/production apply or FR-1.
- Does not implement contracts, recurrence, squads, or stock.

---

## 7. Spark review ask

PASS / FAIL this tip on G-C1…G-C6 (G-C6 = **limit equality + ID-less `item_key`**, not attendance) plus prior passing findings. Attendance/former-assignee is §3.4 / ticket T-G2.  
Implementation and remote apply remain **blocked** until PASS on this tip.
