# B7 retirement — executed

**Replaces:** `B7_RETIREMENT_PENDING.md`  
**Executed (UTC):** 2026-11-15T20:17Z (approx; see step timestamps below)  
**Trigger:** Spark zero-confirm + B7 staging acceptance (no further wait)  
**DB:** `apnmoevmvihfzcnttctx` · **Gates:** #155 frozen · #156 draft · **no merge / production**  
**Handoff (sanitized):** `C:\projects\_almona_handoff\slice0-b7-permission-audit\`

## Results (no secrets)

| Step | Result | Timestamp / detail |
|------|--------|--------------------|
| Support logout (`POST /auth/v1/logout` `scope=global`) | **HTTP 204** | Before password rotate |
| Refresh after logout | **HTTP 400** `refresh_token_not_found` | Refresh capability revoked |
| Access JWT after logout | **Still accepted by REST (HTTP 200)** until exp | See JWT note below |
| Other role logouts (admin/owner/tech×2/unrelated) | **HTTP 204** each | Best-effort session revoke |
| Fixture password rotate (6 emails) | **6 rows** updated; new secret **discarded** | SQL `crypt` + `gen_random_bytes` |
| Old fixture password login | **HTTP 400** `invalid_credentials` | Confirms rotate |
| Preview share revoke | **OK** — `protectionBypass` cleared; `regenerate=false` | `dpl_46faneJn7bnf6oE9rzxZm6Cfa6dn` |
| Post-revoke unlock probe | SSO/auth shell HTML; **no** app `#root` / Almona markup | Share does not restore app |
| Secret file shred | Session JSON, `_fixture_pw.txt`, keys, preview unlock, `refresh_sessions.py` removed | Overwrite + unlink |
| Sanitized evidence retained | Manifests + apply/backend records + `CREDENTIALS_RETIRED.md` / `CLEANUP_EXECUTION.json` | Handoff dir |

## Access JWT vs logout / refresh (accurate)

| Field | Value |
|-------|-------|
| Support access JWT `exp` (UTC) | **2026-11-15T20:55:02Z** |
| Minted (UTC) | 2026-11-15T19:55:01Z |
| After global logout | Refresh **dead**; access JWT **not** immediately killed |
| Claim allowed | Logout + refresh revocation **verified** |
| Claim **not** made | “Already-issued access JWT stopped working immediately” — **false** until expiry or other server-side invalidation |

Password rotate further prevents new password grants and typically invalidates outstanding refresh tokens for those users; it does **not** by itself prove instantaneous access-JWT rejection.

## Spark final check (coordinate)

Spark: spot-check only (read-only) that retirement matches this record:

1. Handoff has **no** `*.json` session files / `_fixture_pw.txt` / `anon_key.txt` / `preview_access.json` / `refresh_sessions.py`.
2. Preview `dpl_46faneJn…` share unlock does not serve the app shell.
3. Fixture emails cannot authenticate with the retired B7 handoff password (expect invalid credentials).
4. Staging still shows B7 synthetics **0** / real tickets **24** (from cleanup; not re-seeded).

No new sessions or preview shares for B7.

## Explicit non-actions

No merge · no production apply · no production deployment-settings changes · no SQL reapply of F-B7-03/04.
