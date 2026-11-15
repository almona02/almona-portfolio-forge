# Spark handoff — B2 (post-reconciliation)

**Freeze under test (DB + opt-in):** `8f2acc4e806e70e12e87a24dcbebaef78e63e085`  
**Branch:** `origin/feat/service-workflow-b1-planning` (draft #156)

## Already accepted (retain)

- Database + opt-in evidence at freeze — see reconciliation doc.
- Do not re-litigate S4 scheduled-visit policy, author-column mapping, or S13/S20 harness fixes unless the freeze itself changes.

## After Cursor’s UI correction commit

Independently verify the **added** multi-job UI:

1. All jobs on a ticket with independent assignees/states  
2. Admin/support create additional jobs + assign/reassign  
3. Technician decline own eligible jobs (mandatory reason)  
4. Clear errors for active-visit restrictions and auth failures  
5. Ticket case-contact assignment independent of job assignment  
6. Repeated submissions safe; UI refreshes after success  

Report **database**, **component/UI (Vitest)**, and **browser** separately.  
No staging/production apply, merge, or B3. #155 frozen; #156 draft.
