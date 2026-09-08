# FP-013 / Gate 1 — Secret Exposure & Rotation Checklist
**Date:** 2026-09-08  
**Updated:** 2026-09-08 (operator confirmation)

## Decisive distinction

Removing files from git ≠ revoking the old credential.  
Closure path: **exposed → revoked/rotated → replacement stored securely → app verified**.  
**Never** paste actual key values into this file, chat, or commits.

## Operator confirmation (no secret values)

| Field | Value |
|-------|--------|
| Confirmed by | Repo owner (chat confirmation) |
| Date (UTC) | 2026-09-08 |
| Systems rotated (names only) | All previously exposed classes **except Supabase** |
| Supabase | **Not rotated** — residual risk **explicitly accepted** by owner |
| App verified with replacements | yes (owner) |
| History / stash cleanup | Local stash ref purged; `main` history has no `.env` |
| Notes | Extra remote branches may still need deletion on GitHub |

## Accept criteria

- [x] `git ls-files` has no `.env` / `python_backend/.env`
- [x] Reachable history has no `.env` (after stash prune)
- [x] `.env.example` placeholders only
- [x] PaymentService has no client Stripe secret path (re-applied on `main`)
- [x] Non-Supabase rotation confirmed by owner
- [x] Supabase residual risk accepted by owner (documented)
