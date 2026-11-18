# Lane C + ticket-header local implementation manifest

**Policy accepted tip:** `c7addbb19be8a1391687e2b0d831c6dde9d59702`  
**Label correction tip (preserved):** `f0da6f017a7c0464fa88af206d52051f312d5518`  
**Scope:** local-only · no staging apply · no merge · no production · no FR-1 · no next-lane

## Prior evidence (preserved)

| Item | Value |
|------|--------|
| Frozen implementation SHA | `b5865120a182350c448eec595dd7c45262f9f68f` |
| Stamp commit | `d108bd38a72cacbac6236d823986ad71e5c53260` |
| (1) Ticket header migration SHA-256 | `14f27cda49441bff523679bf718e8881b76d991ad9153b83058bc3861329b717` |
| (2) Lane C execution migration SHA-256 | `34ee32463560dc487acc35b533db69b1fc3808e836cb99511196b6541d6f13c9` |
| Disposable battery at that SHA | **47/47 PASS** (TR 15/15 · LC 32/32) |

Those migration bytes are unchanged by F-LC-VIS-1.

## F-LC-VIS-1 correction

**Frozen correction SHA:** `e27f21a530fe0eb122ab7886eb8a7854f066a896`

| Package | Migration | SHA-256 |
|---------|-----------|---------|
| (1) Ticket RLS ENABLE + narrow tech header | `supabase/migrations/20261118120000_service_tickets_rls_enable_and_tech_header.sql` | `14f27cda49441bff523679bf718e8881b76d991ad9153b83058bc3861329b717` |
| (2) Lane C checklist execution (unchanged) | `supabase/migrations/20261118130000_service_routines_lane_c_checklist_execution.sql` | `34ee32463560dc487acc35b533db69b1fc3808e836cb99511196b6541d6f13c9` |
| (3) Checklist attempt-history reader | `supabase/migrations/20261118140000_service_routines_lane_c_checklist_history_reader.sql` | `ed93cd16831987e9f89f3dad7b8b018dc83464cc6c06427e24fe7837324fdf1d` |

History SELECT uses `admin_private.can_read_checklist_attempt_history` (contract §3.4: admin, support, current job assignee, in-progress attending technician of that visit, historical attendance via `is_ticket_visit_attending_technician`). Ticket `user_id` and `assigned_to` are not readers. Insert/update/delete policies and table DML grants are unchanged. `get_visit_checklist_workspace` uses the same reader. `admin_private.checklist_current_envelope` is not executable by `anon` or `authenticated`.

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
| Disposable DB before F-LC-VIS-1 | **47/47 PASS** (TR 15/15 · LC 32/32) at `b5865120` | prior evidence above |
| Disposable DB after F-LC-VIS-1 | **59/59 PASS** (TR 15/15 · LC 44/44), including LC-12 direct history rows | `.artifacts/slice0/service-workflow/disposable_lane_c_results.json` |
| Concurrency (CAS) after F-LC-VIS-1 | **2/2 PASS** (`LC-18`, `LC-CONC-1`) | same file `concurrency` |
| Component Vitest at `b5865120` (not re-run) | **11/11 PASS** | header API, checklist API/panel, TicketDetailPage tech path, Lane B pin API regression |
| Lane B disposable at `b5865120` (not re-run) | **28/28 PASS** | `.artifacts/slice0/service-workflow/disposable_lane_b_results.json` |
| Browser at `b5865120` | Login smoke only | `CURSOR_LANE_C_TR_BROWSER_RESULTS.md` — not the checklist journey |

Disposable runner JSON under `.artifacts/` stamps the same freeze SHA when re-run against this tip.
