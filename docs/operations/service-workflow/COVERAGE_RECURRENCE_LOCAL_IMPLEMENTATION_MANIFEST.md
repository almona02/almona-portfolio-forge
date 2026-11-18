# Coverage & recurrence — local implementation manifest

**Accepted proposal tip:** `42862fdd27636d2682ce81fc287ed3777f8005fb`  
**Binding notes:** [`COVERAGE_RECURRENCE_BINDING_CHOICES.md`](./COVERAGE_RECURRENCE_BINDING_CHOICES.md)  
**Gates:** LOCAL implementation + disposable/component evidence · **no staging apply · no production · no merge · no FR-1**  
**Preserved closed:** Lane A/B/C · journey-close `JC-PASS-BOUNDED` · B1–B7 · O-JC-1/2/3 backlog

## Apply sequence (local / disposable)

| Order | Source | Role |
|------:|--------|------|
| 1 | `scripts/service-workflow/disposable_routines_base.sql` | Auth/profile/audit stubs |
| 2 | `scripts/service-workflow/disposable_lane_b_deps.sql` | Tickets/jobs/machines/`can_read` stubs |
| 3 | `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql` | Lane A prerequisite |
| 4 | `supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql` | Lane A prerequisite |
| 5 | `supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql` | Lane B pin RPCs |
| 6 | `scripts/service-workflow/disposable_coverage_deps.sql` | `create_service_job` / assign stubs |
| 7 | `supabase/migrations/20261118210000_service_coverage_recurrence.sql` | Coverage package |

Runner: `python scripts/service-workflow/run_disposable_coverage.py`

## Authority binding (no new override permission)

- Admin/Support: create / pause / resume / end / adopt / cadence / generate
- Technician + Customer: management denied (`coverage_authz_denied`) — battery `CR-02b-tech`, `CR-02c-cust`
- Applicability: Lane B-equivalent family/catalog hard deny via `assert_machine_routine_applicability`
- Lane A metadata override remains the only soft path; **no coverage assignment override RPC**

## Explicit non-claims

- No staging MCP apply / no production / no merge / no FR-1
- No billing, tiers, contract documents, squads, stock, telemetry
- No cancel-and-reissue of generated occurrences
- Does not reopen Lane A/B/C or journey-close acceptance
