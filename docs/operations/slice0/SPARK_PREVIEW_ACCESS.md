# Spark — protected Preview access (Slice 0)

Protection stays **ON**. Do not disable Vercel Authentication.

Read this file and `RAILWAY_DEPLOY_402552ea.json` in this directory **before** reporting access unavailable.

## Authoritative backend revision

| Field | Value |
|---|---|
| Railway deployment id | `402552ea-bf42-411b-99cd-b844c413787b` |
| Status | **SUCCESS** |
| Source commit | `a897776d539930ba31c2313d43e6e52f2c9a9614` |
| Service | `slice0-api` |
| API base | `https://slice0-api-staging.up.railway.app` |
| Full record | `docs/operations/slice0/RAILWAY_DEPLOY_402552ea.json` |

## Protected Vercel Preview (frontend)

| Field | Value |
|---|---|
| Deployment id | `dpl_CyhaMa3pzkVHSZzoJHYaLyp9nQtP` |
| Ready state | READY (API) |
| Frontend revision (git SHA) | `a897776d539930ba31c2313d43e6e52f2c9a9614` |
| Working protected hostname | `https://almona-portfolio-f-git-0e12a2-mohamed-hassans-projects-0ca04921.vercel.app` |
| Deployment URL (broken at edge) | `https://almona-portfolio-forge-bofmzlsf.vercel.app` → **HTTP 404 `DEPLOYMENT_NOT_FOUND`** (do not use) |
| Inspector | `https://vercel.com/mohamed-hassans-projects-0ca04921/almona-portfolio-forge/CyhaMa3pzkVHSZzoJHYaLyp9nQtP` |

### Share bypass

Temporary `_vercel_share` for the working branch alias was issued for verification and **revoked** afterward. Re-issue via Vercel `get_access_to_vercel_url` / protection-bypass on the working hostname if Spark needs another pass. Protection remains ON.

## Secure credentials / sessions (no passwords in chat)

| Mechanism | Location | Purpose |
|---|---|---|
| Fixture password file | Agent store `…/files/slice0/staging_fixture_auth.txt` (`password=` key) | Login to Preview + API |
| Role sessions (JWTs) | Agent store `…/files/slice0/sessions/{owner,admin,support,tech,unrelated}.json` | Optional; prefer fresh login |
| This access note (mirror) | Same agent-store folder + this tracked docs path | Spark workspace readable |

Agent store root for this thread:

`C:\Users\bobbi\AppData\Local\Cursor\AgentStores\cursor_agent_stores\a3c77309-ac82-45fa-9384-b5f9d919206f\files\slice0\`

Personal store mirror (handoff docs only):

`C:\Users\bobbi\AppData\Local\Cursor\AgentStores\cursor_agent_stores\u294861541\files\slice0\`

If any path above is missing, report the **exact** missing file/path — do not claim generic “access unavailable.”

## Fixture emails (staging Supabase only)

| Role | Email |
|---|---|
| customer/owner | `staging.s53.owner@almona.test` |
| admin | `staging.s53.admin@almona.test` |
| support | `slice0-support@staging.local` |
| technician | `slice0-tech@staging.local` |
| unrelated (restored) | `slice0-unrelated@staging.local` — role restored to `customer` after denial checks |

## Required checks

1. Confirm backend revision from `RAILWAY_DEPLOY_402552ea.json` (commit `a897776d`, status SUCCESS).
2. API: admin/support assign success; customer/technician/sales_rep assign denial with unchanged records.
3. API: Python `/api/v2/auth/token` → `/api/v2/auth/refresh` → protected ticket action; UUID + role present.
4. Preview: login, session refresh, assignment controls where exposed, attachment render/download on `SLICE0-LIVE-UP1`.
