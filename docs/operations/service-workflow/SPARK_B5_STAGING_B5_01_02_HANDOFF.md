# Spark — STAGING-B5-01/02 UI correction handoff

**Freeze SHA:** `2a4042ad44d9234739f514720c3d413ea0ca42e8`  
**Base B5 correction:** `d2743078`  
**Preview:** `dpl_4GLQNsZsucF9CmQbnXhQvPauFerU` → `https://almona-portfolio-forge-2uwgpj0g5.vercel.app`  
**Working access:** `C:\projects\_almona_handoff\slice0-b5-staging-verification`  
**Gates:** #155 frozen · #156 draft · no merge · no production · no B6

## DB note (why policy, not RPC)

Live review/submit/getter RPCs unchanged. Author/attending `service_report_reviews` SELECT was required so return comments are readable for revise UI; customers still only see `approved_issued`. Stamp: `service_workflow_b5_staging_b5_01_review_select`.

## Prior Spark cleanup

`B5STG-SPK-%` tickets **0** · listed storage objects **0** · real tickets **24**. Old fixture password rotated; fresh sessions in handoff. Retire again after this rerun.

## Focus

1. Returned revision → attending tech sees comments → new revision id retained on fail/remount → successful resubmit shows new revision.  
2. Owner ticket route shows issued report + evidence download; staff gate untouched; unrelated/unissued denied; pending correction keeps last issued.
