# Service Routines Lane A — Implementation Freeze

| Field | Value |
|-------|-------|
| Contract tip (Spark PASS) | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| Scope | Authoring → independent review → immutable publication → retirement + applicability metadata + read-only preview |
| Out of scope | Assignment overrides, coverage pinning, recurrence, technician results, FR-1 runtime, staging apply, merge, production |
| Evidence label | **Cursor evidence** (not Spark) |

Implementation SHA is this freeze commit tip (fill after push): see `git rev-parse HEAD` on `feat/service-routines-authoring`.

---

## Schema

### Tables

- `public.service_routines` — library row; `code` UNIQUE forever (including retired); status `draft|in_review|published|retired`; manufacturer allow/deny lists.
- `public.service_routine_versions` — versioned payload + `draft_revision` digest; at most one in-flight `draft|in_review` per routine; `version_ordinal` assigned on publish.
- `public.service_routine_reviews` — review bound to exact `draft_revision`; soft-invalidated on edit (`invalidated_at`); history preserved.
- `public.service_routine_applicability` — metadata links `family|manufacturer|catalog_model` with optional Admin override fields.

Writes are RPC-only. Authenticated SELECT policies: Admin/Support see drafts; Technician sees published/retired only.

### Pinned audit actions (`service_workflow_audit.action`)

`routine_draft_created`, `routine_draft_updated`, `routine_review_submitted`, `routine_review_recorded`, `routine_review_invalidated`, `routine_published`, `routine_retired`, `routine_applicability_set`, `routine_applicability_override`, `routine_authz_denied`, `routine_validation_denied`, `routine_draft_edit_conflict`.

Success mutation + audit is atomic. Deny-class audits are optional and do not persist when the same transaction RAISES (business left unchanged).

---

## Exact RPC signatures

```text
create_service_routine_draft(p_code text, p_name_en text, p_name_ar text DEFAULT '', p_description text DEFAULT '', p_payload jsonb DEFAULT '{"sections":[]}', p_families text[] DEFAULT '{}', p_actor_id uuid DEFAULT NULL) → jsonb

update_service_routine_draft(p_version_id uuid, p_expected_draft_revision text, p_payload jsonb, p_name_en text DEFAULT NULL, p_name_ar text DEFAULT NULL, p_description text DEFAULT NULL, p_actor_id uuid DEFAULT NULL) → jsonb

submit_service_routine_for_review(p_version_id uuid, p_actor_id uuid DEFAULT NULL) → jsonb

record_service_routine_review(p_version_id uuid, p_rationale text DEFAULT '', p_actor_id uuid DEFAULT NULL) → jsonb

publish_service_routine_version(p_version_id uuid, p_actor_id uuid DEFAULT NULL) → jsonb

retire_service_routine_version(p_version_id uuid, p_actor_id uuid DEFAULT NULL) → jsonb

set_service_routine_applicability(p_routine_id uuid, p_kind text, p_value text, p_value_family text DEFAULT NULL, p_override_reason text DEFAULT NULL, p_actor_id uuid DEFAULT NULL) → jsonb

get_service_routine_preview(p_version_id uuid, p_actor_id uuid DEFAULT NULL) → jsonb

create_next_service_routine_draft(p_routine_id uuid, p_payload jsonb DEFAULT NULL, p_actor_id uuid DEFAULT NULL) → jsonb

set_service_routine_manufacturer_restrictions(p_routine_id uuid, p_allow_list text[] DEFAULT NULL, p_deny_list text[] DEFAULT NULL, p_actor_id uuid DEFAULT NULL) → jsonb
```

Migration: `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql`

---

## Runnable commands (Cursor evidence)

### Disposable Postgres battery (RA-A1…A13)

Requires local PostgreSQL 17 binaries at `C:\Program Files\PostgreSQL\17\bin` (adjust `PGBIN` in the runner if needed). Does **not** touch staging/production.

```bash
python scripts/service-workflow/run_disposable_routines.py
```

Writes `.artifacts/slice0/service-workflow/disposable_routines_results.json` (gitignored). A committed snapshot of the last green run is in [`CURSOR_EVIDENCE_LANE_A_RESULTS.md`](./CURSOR_EVIDENCE_LANE_A_RESULTS.md).

### Vitest (API + Admin panel)

```bash
npx vitest run src/lib/serviceRoutinesApi.test.ts src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx
```

---

## Local browser setup for Spark

1. Ensure this branch tip is checked out (implementation freeze SHA).
2. Do **not** apply the Lane A migration to staging/production. For UI against a linked Supabase project, apply the migration only to a **dedicated disposable** database (or use the SQL battery for contract checks).
3. From repo root: `npm run dev` → http://localhost:3000
4. Sign in as an **Admin** user.
5. Open **Admin → Service Routines** (`/admin?tab=service-routines`).
6. Exercise: create draft → edit (revision advances) → submit → have a **different** Support/Admin session record review → publish → open **Preview** (read-only) → retire. Confirm code reuse is denied.
7. Confirm UI has **no** assignment override, coverage pin, recurrence, or technician result capture controls.

FR-1 Slice0 share/privacy runtime remains frozen; this package does not change it.
