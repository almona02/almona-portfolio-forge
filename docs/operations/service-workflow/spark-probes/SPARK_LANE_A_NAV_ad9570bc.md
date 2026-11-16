# Spark — Lane A navigation evidence on `ad9570bc`

| Field | Value |
|-------|-------|
| **Author** | Spark QA &lt;sparksubagent@almona.invalid&gt; |
| **Frontend under test** | `ad9570bc22b30d649b9223a3b74fe2f836adb143` |
| **Database baseline** | `e1345a0aef857e857fe5af50176c1fcb633aae70` (unchanged) |
| **Browser checks** | **9/9 PASS** |
| **Auth-routing Vitest** | **26/26 PASS** |
| **Runner (repo)** | [`scripts/service-workflow/coldload_navcheck_ad9570bc.py`](../../../../scripts/service-workflow/coldload_navcheck_ad9570bc.py) |
| **Results JSON** | [`SPARK_LANE_A_NAV_RESULTS_ad9570bc.json`](./SPARK_LANE_A_NAV_RESULTS_ad9570bc.json) |

Sanitized runner preserved in-repo so the only reproducible copy is **not** left in `%TEMP%`. Password strings were removed from the published runner (require `LANE_A_FIXTURE_PASS_*`). No staging/production credentials.

## Re-run (isolated local only)

```bash
# After Lane A local bootstrap; export fixture passwords from FIXTURES_ACCESS.txt
export LANE_A_FIXTURE_PASS_ADMIN=...
export LANE_A_FIXTURE_PASS_SUPPORT=...
export LANE_A_FIXTURE_PASS_TECH=...
python scripts/service-workflow/coldload_navcheck_ad9570bc.py
```
