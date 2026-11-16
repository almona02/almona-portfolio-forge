# Spark — Lane A hold + local setup (docs correction)

| Field | Value |
|-------|-------|
| **Runtime hold tip** | `5e53ee009507b29de707be0f1eebd0252c34c9c9` |
| Contract tip (Spark PASS) | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| Original Cursor evidence | Retained: [`CURSOR_EVIDENCE_LANE_A_RESULTS.md`](./CURSOR_EVIDENCE_LANE_A_RESULTS.md) (24/0 battery + 8 Vitest) |
| This document | Docs-only correction — **no** runtime change |
| Out of band | FR-1 freeze · production recovery · staging apply · merge · production |

Hold **runtime** at `5e53ee00` while Spark verifies. Speculative runtime edits are deferred. Demonstrated findings get a **new** correction SHA; keep original evidence.

---

## Confirmed: Support review UI entry point (at hold tip)

| Path | Status at `5e53ee00` |
|------|----------------------|
| RPC `record_service_routine_review` | Allows **support** and **admin** (author ≠ reviewer) |
| Browser UI “Record review” | Lives only in `ServiceRoutinesAuthoringPanel` under **`/admin?tab=service-routines`** |
| `/admin` access | `ProtectedRoute requireAdmin` + in-page `user.role !== 'admin'` → **Support is redirected away** |
| **Support browser entry** | **None** at this freeze tip |

**Independent review in the local browser at hold tip:** use a **second Admin** session (not the draft author) on `/admin?tab=service-routines` → open routine → **Record review**. That satisfies actor-level author≠reviewer without a Support surface.

Support may still exercise the RPC against a disposable DB (see fixtures below). A Support-facing review route is **not** present; treat that as a known freeze gap for Spark — do not invent UI until a demonstrated finding / correction SHA.

**Technician:** RPC `get_service_routine_preview` allows technician for published/retired. There is **no** Technician dashboard routines-preview entry at this tip; use Admin Preview or RPC.

---

## Env targeting — do not point local app at staging/production

Workspace at hold had **no** committed `.env` (correct). Frontend reads only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`

Rules for Spark local browser:

1. Create **local** `.env` from `.env.example` (never commit).
2. Set `VITE_SUPABASE_URL` / anon key to a **dedicated disposable** Supabase project or `supabase start` local API (`http://127.0.0.1:54321` typical) where Lane A migration may be applied.
3. **Forbidden:** Railway staging, production Supabase URLs, shared staging anon keys, or any project used for B1–B7 staging acceptance.
4. Optional `VITE_API_URL` / Python Prestige backend is **not** required for Lane A routines RPCs (they go to Supabase). Leave unset or local-only; do not point at production API.
5. Before `npm run dev`, confirm: `rg VITE_SUPABASE_URL .env` shows disposable host only.

Lane A migration must **not** be applied to staging/production.

---

## Path A — Cursor evidence battery (no browser, no staging)

Contract RA-A1…A13. Does not use Vite env.

```bash
git checkout 5e53ee009507b29de707be0f1eebd0252c34c9c9
python scripts/service-workflow/run_disposable_routines.py
npx vitest run src/lib/serviceRoutinesApi.test.ts src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx
```

Requires PostgreSQL 17 client/server binaries (runner default: `C:\Program Files\PostgreSQL\17\bin`). Spins disposable cluster on `127.0.0.1:55456`, applies base + migration, runs battery, stops cluster.

### Disposable role fixtures (battery only)

From `scripts/service-workflow/disposable_routines_base.sql` — synthetic UUIDs, **not** login passwords:

| Role | UUID |
|------|------|
| Admin 1 (author) | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` |
| Admin 2 (independent reviewer / publisher) | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2` |
| Support | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1` |
| Technician | `cccccccc-cccc-cccc-cccc-ccccccccccc1` |
| Customer | `dddddddd-dddd-dddd-dddd-ddddddddddd1` |
| Sales | `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1` |

Actor selection in battery: `set_config('app.b1_uid', '<uuid>', true)` via `auth.uid()` stub.

---

## Path B — Local browser against disposable Supabase

Runtime remains `5e53ee00`. Bootstrap:

1. `git checkout 5e53ee009507b29de707be0f1eebd0252c34c9c9`
2. Provision a **new disposable** Supabase project **or** local `supabase start` (repo `supabase/config.toml`). Do not reuse staging/prod.
3. Apply **only** to that disposable DB:
   - Existing workflow helpers required by migration (`admin_private.workflow_resolve_actor`, `workflow_audit`, `service_workflow_audit`, `profiles`, etc.) — disposable battery base is the reference shape for tests; for a full app stack, use your disposable project’s already-present B-series helpers if present, or apply a disposable-only stub equivalent to `disposable_routines_base.sql` **never** on staging/prod.
   - Then: `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql`
4. Create three Auth users in that disposable project; set `public.profiles.role`:

| Fixture | `profiles.role` | Purpose |
|---------|-----------------|--------|
| Admin A | `admin` | Author drafts / submit / publish / retire |
| Admin B | `admin` | Independent **Record review** (browser path at hold tip) |
| Support S | `support` | RPC review / draft preview authz checks (no Admin nav) |
| Technician T | `technician` | Published/retired preview RPC only |

5. Local `.env` → disposable URL + anon key only (see targeting rules).
6. `npm ci` (if needed) && `npm run dev` → http://localhost:3000
7. Browser script:
   - Sign in **Admin A** → `/admin?tab=service-routines` → New draft → Submit for review → sign out
   - Sign in **Admin B** → same tab → Open → Record review → (Admin A or B) Publish → Preview → Retire
   - Optional: as Technician, call `get_service_routine_preview` (no routines UI tab)
   - Confirm Support cannot open `/admin`

No Prestige/`uvicorn` backend is required for this Lane A surface.

---

## Evidence retention

| Artifact | Tip / location |
|----------|----------------|
| Implementation freeze | `5e53ee009507b29de707be0f1eebd0252c34c9c9` |
| Contract | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| Cursor evidence snapshot | `CURSOR_EVIDENCE_LANE_A_RESULTS.md` |
| Freeze signatures / commands | `SERVICE_ROUTINES_LANE_A_IMPLEMENTATION_FREEZE.md` |

Corrections after Spark findings: new SHA; do not rewrite or delete the above evidence.
