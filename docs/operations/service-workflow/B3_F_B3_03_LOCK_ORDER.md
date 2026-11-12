# F-B3-03 — Consistent workflow lock order

**Base:** F-B3-02 ack binding `b7a6dace` (prior evidence retained)  
**This correction:** _stamped on freeze_  
**Migration:** `supabase/migrations/20261112201500_service_workflow_b3_f_b3_03_lock_order.sql`  
**Local disposable:** B3 44/0 PASS (incl. B3-F3-0..5; start_wins+reassign_wins, deadlocks=0); B1/B2 under B3 72 PASS / 4 DEFER  
**Gates:** No staging apply until Spark targeted review PASS · no merge · no production · no B4

## Defect

Visit start locked **visit → job → ticket**, while assign/reassign locked **job → ticket → visits**. Concurrent start-versus-reassign could deadlock (`40P01`). First-start also mutates the parent ticket, so ticket must be part of the shared order.

## Canonical lock order

**`service_tickets` → `service_jobs` → `service_job_visits` (visits by `id` ascending)**

| Path | Acquisition |
|------|-------------|
| `start_service_job_visit` / terminals / safety / reschedule | `lock_visit_hierarchy`: peek parents → lock ticket → job → visit → **revalidate** FKs + authorize |
| `assign_service_job` / `decline_service_job` / `schedule_service_job_visit` | `lock_job_hierarchy`: peek ticket_id → lock ticket → job → **revalidate** → visits via `repoint` (`ORDER BY id FOR UPDATE`) |
| `advance_ticket_on_first_visit_start` | Assumes caller already holds the ticket lock (same transaction); re-`FOR UPDATE` is a no-op upgrade |

Parent IDs read before locking are **hints only**. After locks, relationship and authorization are revalidated so stale peeks cannot authorize.

**Not used as the primary fix:** automatic deadlock retry loops.

## Preserved behavior

- F-B3-02 attending-technician + assignment-generation acknowledgment binding  
- Active-visit reassignment denial  
- Atomic ticket/job/visit transitions and audit  
- Safe idempotent retries and existing permissions  

## Spark verify

1. Barrier-synchronized start-versus-reassign in both acquisition/scheduling orders — no `40P01`, no hangs  
2. Valid serial outcomes only: start wins ⇒ reassignment denied; or reassignment wins ⇒ former technician start denied  
3. Concurrent first starts on different jobs of the same ticket; assign/decline; safety recording sharing these locks  
4. No partial audit, stale authorization, or changed acknowledgment policy  
5. Prior B3 evidence + targeted regressions remain green  

Harness: `scripts/service-workflow/disposable_b3_concurrent_lock_order.py` (invoked by `run_disposable_b3.py`).
