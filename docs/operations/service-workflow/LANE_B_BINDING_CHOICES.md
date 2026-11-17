# Lane B binding choices (non-policy)

**Contract tip:** `da4bcb4a331175bce674291b6a3a802fdc7d8f84`  
**Contract SHA-256:** `806f90bd8e5cb59071153f414c1c2d917a2c9e2d9592c326dc465b6d4db9e2ed`  

These choices resolve contract §13 “remaining before coding” items without changing approved policy.

| Topic | Binding |
|-------|---------|
| Pin table | `public.service_job_routine_pins` |
| Boundary column | `public.service_jobs.work_started_boundary_at` (job-level; survives unpin / never-had-pin) |
| Freeze signal | Trigger `trg_visit_in_progress_pin_freeze` on `service_job_visits` when `state` becomes `in_progress` (covers B3 `start_service_job_visit` and equivalents) |
| Mutate assert | `admin_private.assert_can_mutate_job_routine_pin(p_job_id)` = admin/support **and** `can_read_ticket_workflow(job.ticket_id)` |
| RPC signatures | `pin_service_job_routine(job, version, reason, actor?)` · `replace_service_job_routine_pin(...)` · `unpin_service_job_routine(job, reason, actor?)` · `get_service_job_routine_pin` · `list_service_job_routine_pin_history` |
| UI route | Ticket detail → `ServiceJobAssignmentPanel` job card → `ServiceJobRoutinePinPanel`; visits show job pin read-only via `ServiceVisitPanel` |
| Machine family token | `machines.model` is the family axis; `machines.brand` = manufacturer; `catalog_model_id` exact match; unlinked = null `ticket.machine_id`; uncatalogued = `catalog_link_status <> 'linked'` or null `catalog_model_id` |
| Visit column | `service_job_visits.pinned_routine_version_id` **not written** |
