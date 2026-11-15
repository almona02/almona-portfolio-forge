# B5 staging acceptance — `2a4042ad`

**Accepted tip:** `2a4042ad44d9234739f514720c3d413ea0ca42e8`  
**DB base:** `d2743078fdb7a648e09cfed7aeac554cef43570d` (stamps `20261115120412` / `20443`) + review-SELECT companion `20261115150000`  
**Preview (historical):** `dpl_4GLQNsZsucF9CmQbnXhQvPauFerU` → share bypass **revoked** after closeout  
**DB:** `apnmoevmvihfzcnttctx`  
**Gates closed:** Staging verification complete · round-2 cleanup executed · fixture passwords rotated · sessions shredded (one support retained for Spark zero-confirm) · preview bypass revoked · #155 frozen · #156 draft · **no merge / production**

## Spark verdict (retained)

Targeted correction review **PASS** at `2a4042ad`. Browser chain C-UI1…C-UI8 PASS. The two previously missing UI actions (technician resubmit form; customer issued download) were executed in-browser.

### Finding IDs (original definitions — evidence unchanged)

Per `SPARK_B5_LIVE_STATUS.json` (round-1 evidence, not rewritten):

| ID | Original definition | Resolution at `2a4042ad` |
|----|---------------------|--------------------------|
| **STAGING-B5-01** | Customer issued-report view unreachable — no owner route mounts issued report UI | `CustomerIssuedReportsSection` owner-only mount on `TicketDetailPage` |
| **STAGING-B5-02** | Technician cannot resubmit after return — stale submitted view, no form | `ServiceReportPanel` return outcome + new revision form; remount-stable `client_submission_id` |

Interim Cursor summary tables briefly swapped those labels; **this acceptance restores the original ID→definition mapping**. Evidence JSON/files were not altered.

## Cleanup execution (round-2)

Per `SPARK_B5C_CLEANUP_REQUEST.sql` / `.md` (access-holder):

| Step | Result |
|------|--------|
| Storage API DELETE of 3 Spark C2 objects | **3/3 OK** — bytes removed via Storage API, not SQL metadata-only |
| `DELETE … ticket_number LIKE 'B5STG-SPK-C2-%'` | Matching synthetic removed |
| Verification | `c2_tickets=0`, `all_b5stg=0`, C2 object prefix `0`, any `/b5/` objects `0`, real tickets **24** |
| Audit | **272** `service_workflow_audit` rows retained |
| Temp DELETE policy | Removed after Storage API deletes |
| Credentials | Fixture passwords rotated; non-support sessions shredded; preview share revoked; **one** fresh `support.json` retained for Spark independent zero-confirm |

Evidence: `C:\projects\_almona_handoff\slice0-b5-staging-verification\CLEANUP_C2_EXECUTION.json`

### Limitations (accurate — preserved)

- **Service-role:** Staging `SUPABASE_SERVICE_ROLE_KEY` was not available in local env. Cleanup used an admin JWT plus a temporary prefix-scoped DELETE policy so the Storage API could remove object bytes, then dropped that policy.
- **Live-test limitations (Spark `not_tested`):** service-role live branch; author-after-role-change live; signed-URL revocation lifetime; sales-role-owner UI view (API allows owner via `can_read_ticket_workflow` / `revision_is_customer_visible`; UI is **customer-role-only** and fail-closed for other owner roles).
- **API-assisted second-visit completion:** Fixture create/complete and v2 submit+issue were API-assisted; the previously missing UI actions (resubmit form, customer download) were still executed in-browser and are not substituted as UI proof.

## Follow-on

**B6** acknowledgment and closure gate authorized for implementation + disposable/local verification only. No B6 staging apply until Spark PASS on a separate B6 freeze.
