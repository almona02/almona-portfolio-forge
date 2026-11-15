# B4 staging acceptance — `f63c9145`

**Accepted tip:** `f63c91454df69a0146404200d10c4058465b38fc`  
**Preview (historical):** `dpl_CTBcHefqYngHhdSmhMrgtp9rihjE` → `https://almona-portfolio-forge-h70i4otva.vercel.app`  
**DB:** `apnmoevmvihfzcnttctx`  
**Gates closed:** Staging verification complete · preview bypass revoked · sessions shredded · #155 frozen · #156 draft · **no merge / production**

## Spark verdict (retained)

Targeted review **PASS** on STAGING-B4-01 / STAGING-B4-02. Live round-3 browser journey + privacy matrix confirmed. Upload DEFINER policy and report mount accepted.

## Cleanup execution

Per `SPARK_CLEANUP_REQUEST.sql` / `.md` (access-holder):

| Step | Result |
|------|--------|
| Storage API DELETE of 7 Spark objects | **13/13 OK** (7 Spark + 6 Cursor probe leftovers) — bytes removed via Storage API, not SQL metadata-only |
| `DELETE … ticket_number LIKE 'B4STG-%'` | All matching synthetics removed (includes `B4STG-SPK-%`) |
| Verification | `spk_tickets=0`, `all_b4stg=0`, Spark object prefixes `0`, any `/b4/` objects `0` |
| Audit | **188** `service_workflow_audit` rows retained (`ON DELETE SET NULL`) |
| Temp DELETE policy | Removed after Storage API deletes |
| Support REST zero-check | `spk_tickets=0`, prefix list empty — then session + preview bypass **revoked** |

Evidence: `C:\projects\_almona_handoff\slice0-b4-staging-verification\CLEANUP_EXECUTION.json`

### Limitations (accurate)

- **Service-role:** Staging `SUPABASE_SERVICE_ROLE_KEY` was not available in local env / Railway OAuth (sealed). Cleanup used an admin JWT plus a temporary prefix-scoped DELETE policy so the **Storage API** could remove object bytes, then dropped that policy.
- **Concurrency:** No concurrent Spark writers (sessions already revoked before cleanup). Serial access-holder execution only.

## Follow-on

**B5** manager review/issue authorized for implementation + disposable/local testing only. No B5 staging apply until Spark PASS on a separate B5 freeze.
