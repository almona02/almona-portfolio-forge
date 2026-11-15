# B6 staging apply + verification record

**Authorized runtime tip:** `da2132b6f2ae6f75eed1187b7fad51ce3dbe97eb`  
**Docs stamp (pre-apply):** `5240e428586d85bba8915223b4da1f2b1e954948`  
**Spark disposable PASS artifacts:** `34940537f3f9749a81fe057f2fd9a026e6290afd`  
**Target DB:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`)  
**Gates:** Staging only · no merge · no production · no B7 · #155 frozen · #156 draft

## Independent verdict layers (keep separate)

| Layer | Disposition |
|-------|-------------|
| Spark disposable concurrency @ `da2132b6` / `34940537` | **PASS** (F-B6-09) — not staging |
| Spark live API (staging) | Accepted as evidence (`SPARK_CONFIRM.json` API track) — not a browser PASS |
| Spark deployed-browser LIVE2 | Pending after working `_vercel_share` unlock |
| Access-holder / Cursor supporting | Cutover + definition/grant comparison only — **not** a Spark staging PASS |

## Pre-apply

| Item | Result |
|------|--------|
| Staging identity | `apnmoevmvihfzcnttctx` ACTIVE_HEALTHY / PG17 |
| B1–B5 | Present — not reapplied |
| Latest pre-B6 stamp | `20261115123124` `service_workflow_b5_staging_b5_01_review_select` |
| Synthetic leftovers | `B6STG-%` = 0 · `B5STG-%` = 0 · tickets = 24 |

## Applied stamps + repair chain

Source filenames through `20261115171200_service_workflow_b6_f_b6_09_event_seq_order.sql` @ `da2132b6`.  
Payload catalog + hashes: `applied-sql/b6-staging/README.md`.

| Order | Live version | Name / channel |
|------:|--------------|----------------|
| 1 | `20261115151114` | `service_workflow_b6_acknowledgment_closure` (`apply_migration`, **truncated** — wire payload **unrecovered**) |
| 1b–1e | *(unstamped)* | `execute_sql` repair chunks `01b`–`01e` (original applied files retained) |
| 2 | `20261115151624` | `service_workflow_b6_f_b6_03_05_correction` + `02_02` remainder |
| 3 | `20261115151655` | `service_workflow_b6_integrity_targeting` + `03_02`/`03_03` |
| 4 | `20261115151750` | `service_workflow_b6_f_b6_08_reclose_auth` |
| 5 | `20261115151814` | `service_workflow_b6_f_b6_09_event_seq_order` |

## Deployed definition / grant comparison vs `da2132b6`

Method: live `md5(prosrc)` + `has_function_privilege` vs tip migration-chain last-writer (leading-newline variants). Spark live API evidence accepted; **no migration replay**.

| Signature | Live `prosrc_md5` | Tip match | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE |
|-----------|-------------------|-----------|--------------|----------------------|----------------------|
| `public.effective_acknowledgment(uuid)` | `ee49343821de49200d408f5a239d0645` | **PASS** (`ORDER BY a.event_seq DESC`) | false | true | true |
| `public.effective_acknowledgment_disposition(uuid)` | `d20373012f1c4edf5c0ca7fb23d96c60` | **PASS** (`ORDER BY d.event_seq DESC`) | false | true | true |
| `public.record_service_acknowledgment(…)` | `ea30a028f6254366eee97cdd32c4a333` | **PASS functional** — comment-only delta vs tip (`prosrc_len` 2148 vs 2318; two tip comments absent). Wire `#1` payload unrecovered. | false | true | false |
| `public.record_service_acknowledgment_unavailable(…)` | `aa2859369491106186cf727059d47485` | **PASS** | false | true | false |
| `public.record_acknowledgment_disposition(…)` | `8b8eecccaa35f27e610b5e7423b89522` | **PASS** | false | true | false |
| `public.evaluate_ticket_workflow_prerequisites(uuid)` | `2567bea37ab922499ab36fea8cf46cc8` | **PASS** (matches applied F-B6-09 chunk; `acknowledgment_outstanding` present) | false | true | true |
| `public.govern_ticket_transition(…, p_actor_id uuid)` | `0fbe14697426868330cd3d53a359bc25` | **PASS** (F-B6-08 re-close auth body) | false | true | true |
| `public.govern_ticket_transition` 4-arg wrapper | `5538ada52ba20bd815129bb4c95b8e29` | **PASS** | false | true | true |
| `admin_private.validate_unavailable_contact_attempts(jsonb)` | `4fdcdfd97073e2088a1a603131863473` | **PASS** (matches applied correction chunk) | n/a (private) | n/a | n/a |
| `admin_private.assert_revision_is_issued` / `ticket_id_for_revision` / `assert_ticket_workflow_allows_resolve_close` / `service_ack_disposition_immutable` | (see live matrix) | **PASS** | n/a | n/a | n/a |

Grant intent from tip (public RPCs): anon denied · authenticated granted · `service_role` revoked on record/unavailable/disposition — **observed**.

## Preview / handoff

| Field | Value |
|-------|-------|
| Deployment | `dpl_HS5wBUNzPpL8LQi9PcfUeubBuE6e` |
| URL | `https://almona-portfolio-forge-quh8k3ysp.vercel.app` |
| Runtime SHA | `da2132b6f2ae6f75eed1187b7fad51ce3dbe97eb` |
| Protection | **SSO remains enabled** |
| Working unlock | `?_vercel_share=…` only (see handoff `preview_access.json`) — `x-vercel-protection-bypass` alone → Vercel login (not app) |
| Cursor clean check | empty cookie jar → final host deployment · Almona app HTML · not `vercel.com/login` |
| Browser check | title `YILMAZ Machinery Egypt & Fabricator Pro \| Almona` · app chrome (not SSO) |
| Sessions | Reminted; **JWT ~3600s** — see `SESSION_JWT_EXPIRY.json` (manifest 7-day window ≠ access JWT lifetime) |
| Handoff | `C:\projects\_almona_handoff\slice0-b6-staging-verification` |

## Fixtures

Spark authorized to create `B6STG-%` synthetics with **genuine** contact-attempt records (no invented historical evidence). Cursor did not pre-seed journey rows.

## Explicit non-actions

No merge · no production · no B7 · no unnecessary migration replay · #155 frozen · #156 draft.  
After Spark LIVE2 verdict: exact fixture cleanup → Spark zero-remaining confirm → retire credentials/share.
