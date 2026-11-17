# Service routines — Lane C technician checklist-execution contract (planning only)

**Status:** Draft for Spark review · **no implementation · no remote apply · no merge · no production · no FR-1** until Spark PASS on this tip  
**Depends on:** Lane A authoring **COMPLETE**; Lane B job pins **`STAGING_PASS_BOUNDED`** + operational closeout **COMPLETE** ([`LANE_B_STAGING_CLOSEOUT.md`](./LANE_B_STAGING_CLOSEOUT.md))  
**Does not authorize:** recurrence · contracts/coverage entitlement · squads · stock · FR-1 · ticket-RLS chain correction (tracked separately)

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

### 3.2 Visit snapshot for B4 compatibility (closed)

B4 `validate_checklist_for_pin` today compares `checklist_results.routine_version_id` to **`service_job_visits.pinned_routine_version_id`**. Lane B does not write that column.

| Topic | Decision |
|-------|----------|
| Snapshot | When a visit first becomes eligible for checklist capture (attending tech, visit `in_progress`, job has active pin), server **copies** the job active pin’s `routine_version_id` onto `service_job_visits.pinned_routine_version_id` **once** |
| Semantics | Denormalized **read-through snapshot** for B4 shape compatibility — **not** an independent pin, replace, or unpin surface |
| After job pin freeze | Lane B already freezes pin mutate after work start; snapshot must equal the frozen active pin; mismatch → deny |
| No active pin | Leave visit pin column NULL; no checklist capture |

Implementation may instead teach B4 validators to resolve the job active pin directly; if so, visit column write is unnecessary, but **content authority remains the job pin**. Either approach is acceptable; inventing a second mutable visit pin is not.

### 3.3 Results store (closed)

| Topic | Decision |
|-------|----------|
| Working / in-visit results | Visit-bound structured store (extend or formalize `service_job_visits.checklist_results` **and/or** a dedicated visit-results table). Must be queryable for the attending tech and workflow-readable staff |
| Submitted snapshot | B4 `service_report_revisions.checklist_results` remains the **immutable submit-time** snapshot (existing B4 rule) |
| Shape at submit | Existing B4 object minimum: `{ "routine_version_id": "<uuid>", "items": [ { "id": "<item_id>", "result": … } ] }` — Lane C **tightens** `result` semantics (below); does not remove B4 keys |

### 3.4 Technician authority (closed)

Reuse existing helpers; do **not** invent a parallel auth stack.

| Action | Who |
|--------|-----|
| Read checklist content for an authorized visit/job | Admin, support, **attending or currently assigned** technician with `can_read_ticket_workflow` (Lane A published/retired preview rules for payload) |
| Capture / update in-progress results | **`service_job_visits.attending_technician_id`** with role `technician` (same attendee model as B4 R4-05) |
| Submit report including checklist snapshot | Attending technician only (B4 unchanged) |
| Customer / anon | **No** internal checklist content; **no** result writes |
| Job reassignment after attendance recorded | New assignee does **not** inherit authorship of prior answers; historical attendee retains history; new attendee starts a **new attempt lineage** only if product allows a new visit — do not forge prior attendee identity |

Unauthorized → SQLSTATE **`42501`**, DETAIL **`routine_checklist_authz_denied`** (illustrative); business unchanged; optional deny audit.

### 3.5 Item outcomes and validation (closed)

Item types and requirement classes are Lane A:  
`safety_gate` | `inspection` | `measurement` | `photo_evidence` | `task` | `note`  
with classes `safety_gate` (non-waivable) | `required` | `optional`.

| Outcome | Meaning | Allowed when |
|---------|---------|--------------|
| `passed` | Requirement satisfied | Any type when criteria met |
| `failed` | Requirement not met | Any type; **does not** waive safety |
| `not_applicable` | Item does not apply in this visit context | **Only** if the published item explicitly allows N/A (`allow_not_applicable: true` or equivalent Lane A field). Default **false**. **Never** on `safety_gate` |
| `skipped` / omit | Missing answer | **Denied** for `required` and `safety_gate` at submit; optional items may omit only if class is `optional` |

**Measurements**

- Record numeric value + **unit** exactly as published on the item.
- If the published item has a limit, enforce only using the **source-backed** limit on that version; missing source on a configured limit is a Lane A publish error — runtime must **not** invent a tolerance.
- Out-of-limit → item outcome `failed` (unless N/A explicitly allowed and selected).

**Evidence**

- When the published item requires evidence, submit/capture requires ≥1 allowed evidence reference (ticket-attachments path rules already used by B4).
- Evidence is attributable to the answering actor and attempt.

**Safety gates (execution)**

- Non-waivable: no admin/support/tech override flag; no “force pass”.
- Failed safety_gate **blocks report submit** while that attempt is current.
- Failed safety_gate does **not** invent a new visit-abort rule; use existing B3 abort/no-access/complete transitions as already defined. Lane C may **deny complete→submit path** when required checklist state is incomplete/failed-safety, but must **not** add new ticket resolve/close semantics.

### 3.6 Authorship, retries, corrections (closed)

| Topic | Decision |
|-------|----------|
| Authorship | Every answer/correction stores `actor_id`, `actor_role`, timestamp, visit_id, item_id, attempt/ordinal |
| Retry | Same attending tech may replace an in-progress answer before submit; prior value retained in append-only history |
| Correction after submit | **No** silent edit of submitted revision (B4 immutability). Further correction = new report revision only if B4/B5 already allow — Lane C does not invent post-submit checklist rewrite |
| Reassignment | History rows keep original `actor_id`; reassignment never rewrites authorship |
| Concurrent writers | Serialize on visit (existing lock-order discipline: ticket → job → visit); stale writers get explicit conflict, no silent merge |

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

1. If the job has an **active** pin, report submit is **denied** until every `safety_gate` and `required` item on that version has a recorded outcome satisfying §3.5 (and evidence where required).
2. Lane C does **not** require checklist completion merely to call `complete_service_job_visit` unless an **already-accepted** B3 rule says so (it does not today). Operators may complete a visit and still be blocked at **submit** until checklist is satisfied when a pin is active.
3. No new ticket status, job terminal state, or acknowledgment rule.

### 3.8 Audit (closed)

Append-only `service_workflow_audit` (program ledger). Illustrative pinned action strings (freeze names in implementation):

- `routine_checklist_item_recorded`
- `routine_checklist_item_corrected`
- `routine_checklist_submit_validated`
- `routine_checklist_authz_denied`
- `routine_checklist_validation_denied`

Success write + success audit atomic. Denies leave business state unchanged.

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
| LC-07 | Measurement with source-backed limit, value out of limit | Item `failed`; submit denied if class required/safety |
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
| LC-18 | Concurrent corrections | One winner; loser explicit conflict; no silent merge |

---

## 6. Explicit non-goals / non-claims

- Does not close S-UI-02 / ticket RLS gap (see [`TICKET_RLS_TECHNICIAN_ROUTE_ACCESS_GAP.md`](./TICKET_RLS_TECHNICIAN_ROUTE_ACCESS_GAP.md)).
- Does not re-litigate Lane B pin freeze, applicability, or customer exclusion.
- Does not authorize staging/production apply or FR-1.
- Does not implement contracts, recurrence, squads, or stock.

---

## 7. Spark review ask

PASS / FAIL this planning contract on: content source = job pin; visit-bound results; authority; outcomes; safety/limits; history; **no new closure rules**; exclusions.  
Implementation and remote apply remain **blocked** until PASS on this tip.
