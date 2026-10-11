# Supabase legacy-key retirement plan — 10 October 2026

**Status:** PREPARED — **do not rotate or disable** working keys without explicit owner authorization.  
**Distinct from:** completed GitHub token and E2E password rotations (do not reopen those without contrary evidence).

## Goal

Retire legacy JWT anon/service keys after publishable/secret pair consumers are verified, then prove rejection of legacy credentials.

## Consumer inventory (names only — no secret values)

| Consumer | Env / secret name (class) | Notes |
|---|---|---|
| Vite frontend (Vercel) | `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable pair already set (2026-09-08) |
| Local / CI frontend | `.env` / CI secrets (gitignored) | Must use publishable after cutover |
| Railway backend | `SUPABASE_SERVICE_KEY` / secret class | **Still outstanding** per SECURITY_ROTATION_2026-09-08 |
| Playwright / E2E | project URL + anon/publishable | After E2E password rotation; key class separate |
| Edge functions / scripts | service role class | Inventory before disable |
| Staging Supabase `apnmoevmvihfzcnttctx` | staging publishable/service | Keep staging cutover independent of prod |

Canonical prior checklist: [SECURITY_ROTATION_2026-09-08.md](./SECURITY_ROTATION_2026-09-08.md).

## Proposed verification sequence (authorization-gated)

1. Confirm Railway (and any other service-role consumers) use the new secret.
2. Sign-in / sign-out / ticket create on staging with publishable only.
3. Repeat on production with disposable users only.
4. **Then** disable legacy JWT in Supabase dashboard (owner action).
5. Rejection certificate: call with old anon JWT must fail API-key validation; record HTTP status only (never paste keys).
6. Keep rollback: re-enable legacy only if owner authorizes emergency.

## Explicit non-actions this turn

- No key creation, rotation, or disable.
- No printing or committing credential values.
- No production Auth user mutation beyond existing disposable fixtures already owner-approved.
