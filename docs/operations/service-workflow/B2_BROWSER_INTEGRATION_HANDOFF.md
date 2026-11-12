# B2 browser integration — freeze for Spark

**Status:** App routes wired; staging staff ticket SELECT fixed; preview deploying.  
B1/B2 acceptance still requires Spark’s targeted browser pass. No B3 / production / merge.  
**#155** frozen · **#156** draft.

## Source Spark previously inspected

| Layer | Value |
|-------|--------|
| Prior preview app SHA | `849d6d7806100ae718f063b576d9786a53a6f6be` |
| Gaps demonstrated there | Job panel only in admin dialog tests; support had no staff ticket-read path; `/technician` bounced to marketing home while optimistic profile role was `customer` |

## This freeze

| Field | Value |
|-------|--------|
| **App + route SHA** | `49c7896963e648d173020d7d25be6fbb3eb8a2d6` |
| **Staff SELECT fix migration** | `supabase/migrations/20261112170000_service_tickets_staff_select_via_caller_role.sql` (applied staging; commit follows on tip) |
| **Staging project** | `apnmoevmvihfzcnttctx` |
| **Security corrective** | Retained @ `d4cfc8ce` (passed live gate — do not re-litigate) |

## What changed (application)

1. **`ServiceJobAssignmentPanel`** mounts on authenticated `/support/tickets/:ticketId` for admin/support/technician (not share view).  
2. **`/support/desk`** — admin/support staff ticket list via `getAllTickets` + panel in detail dialog; support home → desk.  
3. **`/technician`** — `ProtectedRoute` waits for `isProfileResolved` so optimistic `customer` placeholder cannot bounce techs to `/`.  
4. **Staging RLS** — ticket/message staff checks use `admin_private.caller_role()` (SECURITY DEFINER). Prior `EXISTS (profiles…)` failed for support because profiles SELECT is admin-only.

## Cursor API smoke (staging, before browser)

| Check | Result |
|-------|--------|
| support SELECT `B2-BR-MULTI` | 1 row (after caller_role fix; was 0) |
| tech SELECT `B2-BR-MULTI` | 0 (not ticket assignee — intended) |
| tech SELECT `B2-BR-OPTIN` | 0 |
| owner create_service_job | 403 |
| support create_service_job | 200 (persisted sequence 3) |
| support assign → tech | state `planned`, assignee persisted on reload |
| tech decline with reason | 200 → `unassigned` |
| owner decline | 403 |

Sessions + `anon_key.txt`: `C:\projects\_almona_handoff\slice0-b2-security-sessions`

## Spark browser targets

1. Preview (immutable URL + SHA below once READY)  
2. Login support → `/support/desk` → open ticket → jobs panel create/assign  
3. Login tech → `/technician` (not marketing home) → decline own job  
4. Reload persistence  
5. Unauthorized users rejected from desk/technician  

## Preview

Filled when deployment READY — see companion `B2_PREVIEW_ACCESS.md` / agent-store pointer.
