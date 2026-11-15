# STAGING-B5-01 / STAGING-B5-02 — UI correction freeze

**Freeze tip:** `2a4042ad44d9234739f514720c3d413ea0ca42e8`  
**Depends on:** B5 staging apply @ `d2743078` (+ review SELECT companion below)  
**Preview:** `dpl_4GLQNsZsucF9CmQbnXhQvPauFerU`  
**Gates:** #155 frozen · #156 draft · no merge · no production · no B6  
**RPCs:** `submit_service_report_revision` / `review_service_report_revision` / `get_service_report_for_visit` **unchanged** (live API accepted)

## Why a narrow DB policy was required

Live RLS on `service_report_reviews` allowed only `admin`/`support`, plus ticket owners for `approved_issued`. Historical attending technicians **could not SELECT returned reviews/comments**, so a pure UI fix could not meet STAGING-B5-01.  

Additive policy only (no RPC body changes): author or attending technician may SELECT reviews on their revisions. Customers still see `approved_issued` only — returned comments stay staff/author-side.

Migration: `supabase/migrations/20261115150000_service_workflow_b5_staging_b5_01_review_select.sql`  
`lf_sha256`: `18d75014c8ad118b59b1f002004b8bde5198b38240f5ef9ce3cece4600b4d12b`

## UI fixes

IDs use Spark’s **original** definitions (`SPARK_B5_LIVE_STATUS.json`). Evidence files were not rewritten.

| ID | Original definition | Change |
|----|---------------------|--------|
| STAGING-B5-01 | Customer issued-report view unreachable | `TicketDetailPage`: owner-only `CustomerIssuedReportsSection` mounts issued views via authorized getter — **does not** open `canManageJobs` / staff controls |
| STAGING-B5-02 | Technician cannot resubmit after return | `ServiceReportPanel`: show return outcome/comments; attending tech gets a new revision form; new `client_submission_id` retained across fail/remount; successful resubmit shows the new revision |
| History | — | `CustomerIssuedReportView` lists every issued revision; unissued/returned omitted by getter |

## Tests

- `ServiceReportPanel.b5.test.tsx` — return → form → resubmit; retry identity; remount identity  
- `TicketDetailPage.b5.route.test.tsx` — owner mount/download; pending omits unissued; empty; unrelated denied; staff gate intact  

## Explicit non-actions

No production · no merge · no B6 · no full audit restart.
