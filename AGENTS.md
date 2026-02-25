# AGENTS.md

## Cursor Cloud specific instructions

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

- **Lint**: `npm run lint` — runs ESLint on `src/`. Expect ~19k warnings (existing state); 0 errors is the goal.
- **Tests (frontend)**: `npm run test` — Vitest; ~126 test files, ~995 tests.
- **Tests (backend)**: `cd python_backend && python3 -m pytest tests/test_api.py -v` — the health check test fails in cloud VMs because remote Redis/PostgreSQL are not reachable (expected).
- **Build**: `npm run build` — Vite production build.
- **Type check**: `npm run type-check` — TypeScript `tsc --noEmit`.

### Non-obvious caveats

- Python packages install to `/home/ubuntu/.local/bin`. Add it to `PATH` before running `uvicorn`, `pytest`, etc.: `export PATH="/home/ubuntu/.local/bin:$PATH"`.
- The backend health check (`/health`) reports "unhealthy" in cloud VMs because Redis and PostgreSQL are remote Railway-hosted services. This is normal and does not block local API testing.
- The `.env` file in the repo root holds Supabase and Redis credentials (needed for full functionality). The `python_backend/.env` holds backend-specific config. Both are already checked in with values.
- The frontend Vite config proxies `/api` requests to `http://localhost:8000`, so the backend must run on port 8000 for API integration to work.
- `npm run lint` exits with code 1 due to one pre-existing error; this is the current state of the repo.
