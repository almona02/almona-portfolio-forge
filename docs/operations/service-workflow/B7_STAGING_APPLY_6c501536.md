# B7 staging apply record — tip `6c501536`

**Evidence (Spark approve):** `1dc28279` (21/21 disposable; F-B7-04 verified; F-B7-03 apply approved)  
**Source tip:** `6c501536dbc644a8e77ab2ebfda824bfb1f2a3ee`  
**DB:** `apnmoevmvihfzcnttctx` (staging only)  
**Gates:** #155 frozen · #156 draft · **no production**

## Apply order (as approved)

| Order | Filename / chunk | Live stamp | Name |
|------:|------------------|------------|------|
| 1 | `20261115181000_service_workflow_b7_f_b7_04_null_auth.sql` | `20261115184700` | `service_workflow_b7_f_b7_04_null_auth` |
| 2 | `20261115180000_service_workflow_b7_share_audit.sql` | `20261115185008` | `service_workflow_b7_share_audit` |

## Chunk digests (corrected — institutional `lf_sha256`)

Method (same as B3–B6 / `applied-sql/README.md`): UTF-8 → normalize newlines to LF → SHA-256. Tip migration == `applied-sql/b7-staging/` chunk (parity verified). **No SQL reapplied.**

| File | `lf_sha256` (verified applied tip bytes) | bytes (LF) |
|------|------------------------------------------|-----------:|
| F-B7-04 | `21c7352cbbe09df3c984622662150bf230f71ad4e448cdf0161bfaa0f5768fe1` | 5024 |
| F-B7-03 | `5bd815922d1e841c6d4f5d8adb763c925165c255aab593baa993279c2a9d7a28` | 11777 |

## Hash correction history

| When | Claim | Notes |
|------|-------|-------|
| Apply record `205a37f8` | F-B7-03 `35869b5f…` / F-B7-04 `3bd4b699…` | Raw **CRLF checkout** digests from `sha256sum` on Windows tip files — **wrong method** vs institutional `lf_sha256`. |
| Spark `64be7332` | F-B7-03 should be `8B7F5293…` under “record’s own CRLF method” | **Not reproducible** against tip/chunk @ `6c501536` / HEAD (CRLF = `35869b5f…`, LF = `5bd81592…`). Live A-0..A-9 already proved reviewed behavior. |
| Closeout correction (this revision) | Record switched to **`lf_sha256`** above | Preserves prior rows; does **not** reapply SQL; aligns with B3–B6 apply manifests. |

No other SQL beyond these two migrations’ bodies. No production.

## Post-apply verification (access-holder)

| Check | Result |
|-------|--------|
| `revoke_ticket_share` null-safe + `share_revoked` | true / true |
| `govern_ticket_set_escalated` (3-arg) null-safe | true |
| `ticket_share_access_events` | present |
| `ticket_shares` policy | `ticket_shares_select_scoped` only |
| `create_ticket_share` / `get_shared_ticket` | present |

## Edge

| Function | Version | Change |
|----------|--------:|--------|
| `ticket-share-attachment` | **2** | Fail-closed `record_ticket_share_attachment_access` before sign; `verify_jwt=false` preserved |

## Spark post-apply / journey

- Post-apply A-0..A-9 green: `64be7332` (record-hash discrepancy noted; corrected here).
- G-01/G-04: `6547040b` — see `B7_MACHINE_LINKAGE_CLOSEOUT.md` (G-01 = legacy serial path; canonical UUID path verified separately).
