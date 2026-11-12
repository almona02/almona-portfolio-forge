# B2 browser integration — freeze for Spark

**Status:** Routes verified on protected staging preview; Cursor smoke complete.  
B1/B2 acceptance still requires Spark’s targeted browser pass. No B3 / production / merge.  
**#155** frozen · **#156** draft.

## Source Spark previously inspected

| Layer | Value |
|-------|--------|
| Prior preview app SHA | `849d6d7806100ae718f063b576d9786a53a6f6be` |
| Gaps demonstrated there | Job panel only in admin dialog tests; support had no staff ticket-read path; `/technician` bounced to marketing home |

## Root cause of `/technician` → marketing home (this freeze)

Staging `profiles` SELECT was **admin-only**. AuthContext could not load technician/support `profiles.role`, kept optimistic `customer`, and role-gated routes bounced to `/`.

**Fixes applied on staging (and committed):**

1. `20261112171000_profiles_select_own_for_role_routing` — own-row SELECT  
2. `20261112171100_profiles_select_staff_directory_for_assignment` — admin/support staff directory for assignees  
3. Prior `20261112170000` staff ticket SELECT via `caller_role()` (retained)  
4. App: panel mount, `/support/desk`, `ProtectedRoute` waits for `isProfileResolved`; Login waits for resolved profile before home navigate

## This freeze

| Field | Value |
|-------|--------|
| **App route SHA** | `49c7896963e648d173020d7d25be6fbb3eb8a2d6` (panel + desk + profile-wait) |
| **Tip (profiles SELECT + Login wait)** | see companion preview access after tip READY |
| **Staging project** | `apnmoevmvihfzcnttctx` |
| **Security corrective** | Retained @ `d4cfc8ce` (passed live gate — do not re-litigate) |

## What changed (application)

1. **`ServiceJobAssignmentPanel`** mounts on authenticated `/support/tickets/:ticketId` for admin/support/technician (not share view).  
2. **`/support/desk`** — admin/support staff ticket list via `getAllTickets` + RLS.  
3. **`/technician`** — works once own-profile SELECT exists; `ProtectedRoute` + Login wait for `isProfileResolved`.  
4. **Staging RLS** — ticket staff checks use `caller_role()`; profiles own + staff-directory policies for routing/assignees.

## Cursor smoke (deployed preview `49c78969` + staging DB)

| Check | Result |
|-------|--------|
| Tech hard-nav `/technician` | **Technician Workspace** (not marketing home); reload keeps workspace |
| Tech decline with reason | Toast **Job declined**; job count 2→1 after reload; job state `unassigned` |
| Support `/support/desk` | **Support desk** + **Tickets ( 23 )** including `B2-BR-OPTIN` / `B2-BR-MULTI` |
| Support ticket detail panel | `/support/tickets/8ef54ccf-…` shows **Service jobs** + create/assign UI |
| Support create job | **Job 4: Cursor B2 smoke job 4** visible after create; still present after reload |
| API (earlier, same staging) | support SELECT MULTI 1; tech OPTIN 0; support create/assign; tech decline; owner create/decline 403 |
| Unit | `supportTicketAccess.b2`, `TicketDetailPage.b2.route`, `ProtectedRoute`, `roleRouting` — 17/17 pass |

Sessions: `C:\projects\_almona_handoff\slice0-b2-security-sessions`

## Spark browser targets

1. Protected preview (immutable URL + share in `B2_PREVIEW_ACCESS.md`)  
2. Support → `/support/desk` → ticket → jobs panel create/assign  
3. Tech → `/technician` (not marketing) → decline → reload  
4. Owner/customer rejected from `/support/desk` and `/technician`  
5. No production / merge / B3

## Preview

Filled in companion agent-store `slice0/B2_PREVIEW_ACCESS.md` when tip deployment is READY.
