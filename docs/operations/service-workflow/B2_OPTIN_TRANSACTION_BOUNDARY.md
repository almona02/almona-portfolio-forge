# B2 opt-in transaction boundary — two-RPC vs atomic Job 1

**Freeze:** `8f2acc4e` (UI dialog) + B2 migration `7aa2c305` / included at freeze.

## Layers

| Layer | Boundary | Atomicity |
|-------|----------|-----------|
| **A. Ticket case assign** | Client → `govern_ticket_assign` / `assignTicket` | Own DB transaction. Sets `service_tickets.assigned_to` only. Does **not** create jobs or activate workflow. |
| **B. Opt-in Job 1** | Client → `ensure_default_service_job` | Own DB transaction. Idempotent under ticket `FOR UPDATE`: at most one `job_sequence=1`; optional assign + history + audit + activation commit together **or** roll back with no residue (S17). |
| **C. UI composition** | `TicketAssignmentDialog` when checkbox checked | **Two sequential RPCs:** A then B. **Not** one distributed transaction. |

## What persists if each step fails

| Step outcome | Ticket assignee | Job 1 / activation / history | UI recovery |
|--------------|-----------------|------------------------------|-------------|
| A fails (auth, validation) | unchanged | none | Dialog stays open; Job 1 never called (U3). |
| A succeeds, B fails (terminal ticket, auth, etc.) | **persists** (A committed) | **none** if B rolls back tracelessly; if B never started, none | Dialog stays open; retry runs A again (idempotent ticket assign) then B; B retry cannot create a second Job 1 (S18, K7, U4/U5). |
| A succeeds, B succeeds | persists | Job 1 exists; assign/history/audit/activation consistent inside B | Dialog closes; lists refresh. |
| Checkbox unchecked | A only | no Job 1 | Legacy path (U1). |

## Reconciliation statement

- **“Atomic opt-in”** means: inside `ensure_default_service_job`, Job 1 create + optional technician assign + assignment history + workflow audit + activation are one database transaction; failures leave no partial Job 1 (S17/S19). Concurrent ensures collapse to one Job 1 (K7).
- **“Two-RPC recoverable partial”** means: the **UI** may leave ticket assignment committed without Job 1 if B fails after A. That partial is **truthful and recoverable** by retrying; it is not a second default job and does not orphan activation. Ticket case contact remains independent of job technicians (S12).

Staff who need Job 1 after a partial can re-open the dialog (or the job panel) and retry ensure/assign without duplicating Job 1.
