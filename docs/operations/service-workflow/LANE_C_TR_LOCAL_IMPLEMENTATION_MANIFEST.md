# Lane C + ticket-header local implementation manifest

**Policy accepted tip:** `c7addbb19be8a1391687e2b0d831c6dde9d59702`  
**Label correction tip (preserved):** `f0da6f017a7c0464fa88af206d52051f312d5518`  
**Scope:** local-only · no staging apply · no merge · no production · no FR-1 · no next-lane

## Separately reviewable packages

| Package | Migration | SHA-256 |
|---------|-----------|---------|
| (1) Ticket RLS ENABLE + narrow tech header | `supabase/migrations/20261118120000_service_tickets_rls_enable_and_tech_header.sql` | `14f27cda49441bff523679bf718e8881b76d991ad9153b83058bc3861329b717` |
| (2) Lane C checklist execution | `supabase/migrations/20261118130000_service_routines_lane_c_checklist_execution.sql` | `34ee32463560dc487acc35b533db69b1fc3808e836cb99511196b6541d6f13c9` |

## Binding notes

| Topic | Binding |
|-------|---------|
| Ticket table SELECT for technicians | **Unchanged deny** under `service_tickets_select_own_or_staff` |
| Tech job/checklist route | `public.get_technician_ticket_header(p_ticket_id)` only — approved columns; `description` may contain user-entered personal information; `contact_*` / `user_id` absent |
| Header authz | Job assignee **or** completed visit attending (`is_ticket_visit_attending_technician`) |
| Checklist content | Exact active `service_job_routine_pins.routine_version_id` payload |
| Visit pin snapshot | Once-only on first successful `record_visit_checklist_answer` |
| Optimistic conflict | Atomic CAS on `checklist_revision`; loser `PT409` / `routine_checklist_stale_revision` |
| LC-07 | Failed measurement blocks submit **only** when effective `safety_gate`; non-safety `required` may submit with `failed` |
| Evidence aliases | Deterministic precedence in `admin_private.checklist_evidence_required` (boolean `evidence_required` → boolean `evidence` → text synonyms → none) |
| Lane A attribution | Type/`requirement_class` mismatch fail-closed at Lane C runtime; does **not** claim Lane A publish always prevented it |
| B4 audit actions | Preserved (`job_transition`, `submit_report_revision`) + `routine_checklist_submit_validated` |

## Evidence (Cursor local)

| Battery | Result | Path |
|---------|--------|------|
| Disposable DB (TR + LC) | **47/47 PASS** (TR 15/15 · LC 32/32) | `.artifacts/slice0/service-workflow/disposable_lane_c_results.json` |
| Concurrency (CAS) | **2/2 PASS** (`LC-18`, `LC-CONC-1`) | same file `concurrency` |
| Component Vitest | **11/11 PASS** | header API, checklist API/panel, TicketDetailPage tech path, Lane B pin API regression |
| Lane B disposable regression | **28/28 PASS** | `.artifacts/slice0/service-workflow/disposable_lane_b_results.json` |
| Actual browser | See `CURSOR_LANE_C_TR_BROWSER_RESULTS.md` | staging-eq RLS established in disposable before smoke |

Frozen implementation SHA is the git commit that publishes this tip (recorded in the closeout / results JSON after commit).
