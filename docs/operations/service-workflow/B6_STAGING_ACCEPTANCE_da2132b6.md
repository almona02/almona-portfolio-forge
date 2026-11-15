# B6 staging acceptance — `da2132b6`

**Accepted tip:** `da2132b6f2ae6f75eed1187b7fad51ce3dbe97eb`  
**Spark independent evidence:** `c32657e7c95f601eae3da195c8cc1b6e5384f527`  
**Docs publish (apply record / handoff):** `7ada04e29f226d9bf68cf27d3ea60600a073092b`  
**DB:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`)  
**Preview (historical):** `dpl_HS5wBUNzPpL8LQi9PcfUeubBuE6e` → share bypass **revoked** after cleanup  
**Gates closed:** Staging verification complete · fixture cleanup executed · #155 frozen · #156 draft · **no merge / production** · **no B7**

## Spark verdict (retained — layers separate)

| Layer | Tip / evidence | Disposition |
|-------|----------------|------------|
| Disposable concurrency | `da2132b6` / `34940537` | **PASS** (F-B6-09) |
| Live API (staging) | `c32657e7` L-100…L-216b + LIVE1 | **PASS** |
| Deployed browser LIVE2 | `c32657e7` J-UI1…J-UI5 on `B6STG-SPK-UI-mwi0ln0e` | **PASS** |
| Live NOT TESTED (by design) | service-role branches; multi-session race | Disposable evidence only |

## Staging apply (live stamps)

| Order | Version | Name |
|------:|---------|------|
| 1 | `20261115151114` | `service_workflow_b6_acknowledgment_closure` (+ unstamped `01b`–`01e`; truncated `#1` wire **unrecovered**) |
| 2 | `20261115151624` | `service_workflow_b6_f_b6_03_05_correction` |
| 3 | `20261115151655` | `service_workflow_b6_integrity_targeting` |
| 4 | `20261115151750` | `service_workflow_b6_f_b6_08_reclose_auth` |
| 5 | `20261115151814` | `service_workflow_b6_f_b6_09_event_seq_order` |

Disclosed exceptions (docs @ `7ada04e2`): truncated `#1` wire unrecovered; comment-only drift on `record_service_acknowledgment` accepted as functionally equivalent; `04_01` byte-identical to tip.

## Cleanup execution

Per `CLEANUP_AFTER_RUN.md` / `CLEANUP_EXECUTION.json`:

| Step | Result |
|------|--------|
| Storage API DELETE | **9/9** objects under three `B6STG-SPK-*` ticket prefixes |
| Tickets removed | `B6STG-SPK-L1-mwhzo4y0`, `B6STG-SPK-UI-mwhzs1ey`, `B6STG-SPK-UI-mwi0ln0e` |
| Ticket shares | **3** deleted |
| Synthetic audit rows | **99** deleted (see `B6_CLEANUP_AUDIT_ROWS.md`) |
| Temp storage policy `tmp_b6_spk_cleanup_delete` | Dropped |
| Immutable triggers | Re-enabled (5/5) after one-time cascade purge — **do not** disable again for routine cleanup |
| Preview share | Revoked |
| Fixture passwords | Rotated; session secrets shredded (support confirm re-minted separately) |

Post-cleanup access-holder verify: `B6STG-%` = 0 · tickets = 24 · storage prefixes = 0.

## Explicit non-actions

No merge · no production · no B7 · PR #156 remains draft · #155 frozen.
