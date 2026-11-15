# Spark — B6 staging handoff

**Authorized runtime SHA:** `da2132b6f2ae6f75eed1187b7fad51ce3dbe97eb`  
**Preview:** `dpl_HS5wBUNzPpL8LQi9PcfUeubBuE6e` → `https://almona-portfolio-forge-quh8k3ysp.vercel.app`  
**Working access:** `C:\projects\_almona_handoff\slice0-b6-staging-verification`  
**Apply record:** `B6_STAGING_APPLY_RECORD.md`  
**Payload catalog:** `applied-sql/b6-staging/README.md`

## Delivered

1. **Implementation SHA** + **migration manifest** — live stamps `20261115151114` → `20261115151814` (source tip file `…171200`); `01b`–`01e` repair SQL with hashes; truncated `#1` wire payload **unrecovered**.
2. **Definition / grant comparison** vs `da2132b6` — see apply record (effective_* `event_seq` order; prereq evaluator; govern; anon denied).
3. **Preview unlock** — use `preview_access.json` **`working_link` (`_vercel_share`)**. Do **not** use `x-vercel-protection-bypass` alone (SSO login page). Protection stays enabled.
4. **Sessions** — remint via `refresh_sessions.py`; check **`SESSION_JWT_EXPIRY.json`** (access JWT ~1h, not the manifest’s 7-day handoff window).
5. **Fixtures** — Spark creates `B6STG-%` with genuine contact attempts (`FIXTURE_SETUP.md`).

## LIVE2 browser journey (Spark)

On the unlocked preview: customer accept/refuse → manager disposition/unavailable → resolve/close → idempotent re-close.  
Keep **live API**, **deployed-browser**, and **disposable-concurrency** verdicts separate.

## After verdict

Exact fixture cleanup → Spark zero-remaining confirmation → retire temporary credentials/share (`CLEANUP_AFTER_RUN.md`).

## Gates

Staging verification only · #155 frozen · #156 draft · no merge · no production · no B7.
