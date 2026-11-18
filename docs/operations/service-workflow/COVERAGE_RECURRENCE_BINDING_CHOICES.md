# Coverage & recurrence binding choices (non-policy)

**Accepted proposal tip:** `42862fdd27636d2682ce81fc287ed3777f8005fb`  
**Scope:** local implementation bindings only · no staging apply · no production · no merge · no FR-1  
**Preserved:** Lane A/B/C closeouts · journey-close `JC-PASS-BOUNDED` · B1–B7 · O-JC-1/2/3 backlog

These choices resolve implementation shape without changing accepted proposal decisions in `SERVICE_COVERAGE_RECURRENCE_PROPOSAL.md`.

| Topic | Binding |
|-------|---------|
| Coverage table | `public.service_machine_coverages` |
| Occurrence table | `public.service_maintenance_occurrences` |
| Occurrence identity | `UNIQUE (coverage_id, sequence)` — `planned_due_date` is a stored attribute |
| Status enum | `active` · `paused` · `ended` (`ended` terminal; no resume) |
| Cadence units | `days` · `weeks` · `months` only |
| Cairo `as_of` | `(timezone('Africa/Cairo', now()))::date` |
| Horizon | Inclusive window `[start_date, least(as_of+90d, end_date)]` |
| Monthly clamp | Anchor day = day-of-month of `first_planned_due_date`; clamp to month-end |
| Applicability | Reuse Lane B machine/family/catalog rules via `admin_private.assert_machine_routine_applicability` — **no new coverage override permission** |
| Model/manufacturer wording | Lane A metadata override remains the only audited soft path; coverage create/pin follow Lane B hard applicability (family/catalog match). No assignment-time override RPC. |
| Ticket+job create | `admin_private.create_coverage_preventive_ticket` (admin/support, audited) → existing `public.create_service_job` → existing `public.pin_service_job_routine` |
| Pin reason | `coverage_occurrence_generated` |
| Generator RPC | `public.generate_machine_coverage_occurrences(p_as_of date DEFAULT NULL, p_coverage_id uuid DEFAULT NULL, p_actor_id uuid DEFAULT NULL)` |
| Schedule list | `public.list_machine_coverage_schedule(p_as_of, p_machine_id?, p_coverage_id?, p_actor_id?)` |
| Management RPCs | `create_machine_coverage` · `pause_machine_coverage` · `resume_machine_coverage` · `end_machine_coverage` · `adopt_machine_coverage_routine_version` · `change_machine_coverage_cadence` · `get_machine_coverage` |
| Authz | Admin/Support manage + generate; Technician/Customer denied manage; Customer schedule = own-machine only |
| UI | Admin tab `service-coverage` → `ServiceMachineCoveragePanel` |
| Failure injection (disposable only) | `SET LOCAL app.coverage_force_fail = 'before_pin'|'after_pin'` |

## Explicit non-claims

- No billing / tiers / contract documents / squads / stock / telemetry / FR-1
- No cancel-and-reissue of generated occurrences
- No reopen of Lane A/B/C or journey-close
- No staging/production schema apply from this package
