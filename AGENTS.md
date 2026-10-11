# AGENTS.md

## Development environment instructions

### Overview

ALMONA Portfolio Forge is an industrial computing platform for aluminum & UPVC fabrication. It consists of:

- **Frontend**: React 18 + TypeScript + Vite (port 3000) — the main web application
- **Backend**: Python FastAPI (port 8000) — YDT Prestige Agent API for CNC machine assistance

### Running services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Frontend dev server | `npm run dev` (from repo root) | 3000 | Vite HMR; proxies `/api` to backend on 8000 |
| Backend dev server | `python3 -m uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000` (from `python_backend/`) | 8000 | Requires `PATH` to include `/home/ubuntu/.local/bin` for pip-installed binaries |

### Lint / Test / Build

Standard commands are in `package.json` scripts. Key ones:

- **Lint**: `npm run lint` — runs ESLint on `src/`. Measured 2026-10-11: exit 0 with 0 errors and 15792 warnings; keep errors at 0.
- **Tests (frontend)**: `npm run test` — Vitest; ~126 test files, ~995 tests.
- **Tests (backend)**: `cd python_backend && python3 -m pytest tests/test_api.py -v` — the health check test fails in cloud VMs because remote Redis/PostgreSQL are not reachable (expected).
- **Build**: `npm run build` — Vite production build.
- **Type check**: `npm run type-check` — **not** a type-clean gate. It runs `tsx scripts/ci-typecheck-baseline-delta.ts`: `tsconfig.node.json` must be clean, while `tsconfig.app.json` is diffed against `docs/ci/typecheck-app-baseline.json` and fails only on regression (baseline: 1791 errors, generated 2026-10-08). Passing means "no new errors", not "no errors". For a true type-clean check run `npm run type-check:strict`.

### Non-obvious caveats

- Python packages install to `/home/ubuntu/.local/bin`. Add it to `PATH` before running `uvicorn`, `pytest`, etc.: `export PATH="/home/ubuntu/.local/bin:$PATH"`.
- The backend health check (`/health`) reports "unhealthy" in cloud VMs because Redis and PostgreSQL are remote Railway-hosted services. This is normal and does not block local API testing.
- The `.env` file in the repo root holds Supabase and Redis credentials (needed for full functionality). The `python_backend/.env` holds backend-specific config. **Neither is tracked in Git** - `.gitignore` excludes `.env`, `python_backend/.env`, `pg.env` and `secrets/`, and no commit across all refs has ever touched `.env`. Never commit them, never echo their values, and rotate anything suspected of exposure.
- The frontend Vite config proxies `/api` requests to `http://localhost:8000`, so the backend must run on port 8000 for API integration to work.
- `npm run lint` exits 0 (measured 2026-10-11): 0 errors, 15792 warnings. The older note that it exits 1 on one pre-existing error is stale.

### Shared agent context

See `docs/agent-context/` - `INDEX.md` (architecture, entry points, commands, gate semantics), `STATUS.md` (verified risks, release-candidate status, next actions), `HANDOFF.md` (contract-bearing files, worktree inventory, integration state). Verified against commit `b98b222f`, re-spot-checked at `0ebe9d53` on branch `main`, on 2026-10-11. It is short by design: link to source rather than duplicating it. Corrected here: the two statements above about `.env` being checked in and about `type-check` being `tsc --noEmit` were both false.
