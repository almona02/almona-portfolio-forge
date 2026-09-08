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
| Supabase | Pair `rotation_2026_09_08` created. Vercel now has `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable). Legacy JWT still enabled. Railway not updated (CLI unauthorized). |
| App verified with replacements | yes (owner) |
| History / stash cleanup | Local stash ref purged; `main` history has no `.env` |
| Notes | Extra remote branches may still need deletion on GitHub |

## Accept criteria

- [x] `git ls-files` has no `.env` / `python_backend/.env`
- [x] Reachable history has no `.env` (after stash prune)
- [x] `.env.example` placeholders only
- [x] PaymentService has no client Stripe secret path (re-applied on `main`)
- [x] Non-Supabase rotation confirmed by owner
- [x] Supabase: consumer inventory complete (no secret values recorded)
- [x] Supabase: new Publishable/Secret pair created (legacy still enabled)
- [x] Supabase: Vercel `VITE_SUPABASE_ANON_KEY` + `VITE_SUPABASE_PUBLISHABLE_KEY` set to publishable (no values in git)
- [ ] Supabase: Railway `SUPABASE_SERVICE_KEY` / secret (CLI login required)
- [ ] Supabase: publishable in password manager; secret in backend secret storage (operator)
- [x] Sign-in path on production accepts publishable key (invalid credentials, not invalid API key)
- [ ] Real user sign-in / sign-out on production (needs operator account)
- [ ] Legacy JWT + anon **not disabled** until Railway secret is cut over and real sign-in/out passes
- [x] Supabase residual risk previously accepted; rotation now in progress (legacy not disabled)
