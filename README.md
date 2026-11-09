# ALMONA Portfolio Forge

Industrial software for aluminium and UPVC fabrication: workshop planning, profile calibration, bills of materials, cutting optimization, production review, and equipment service.

React 18, TypeScript and Vite power the web application. Python/FastAPI provides technical services. Arabic and English workflows support regional workshop operations.

## Architecture and authority

- **Workshop application:** `src/`, `public/`, `locales/`.
- **Engineering:** profile rules, deterministic calculations, validation and machine exports in `src/`.
- **Services:** `python_backend/`, `api/`, and `ai_agents/`.
- **Domain infrastructure:** `realityos_core/`, `sdk/`, and vertical integrations.
- **Verification and delivery:** `tests/`, `scripts/`, `.github/workflows/`, and deployment descriptors.

[AICS-001](docs/AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md) defines the project's engineering authority and validation boundaries. AI guidance must remain separate from approved manufacturing rules and deterministic calculations. These are project requirements; production acceptance requires evidence for the deployed revision and target equipment.

[Engineering overview](docs/INSTITUTIONAL_OVERVIEW.md) · [Repository policy](docs/PROJECT_LAYOUT.md) · [Security](docs/security/SECURITY.md)

## Development

Use Node.js 22.22.2 and Python 3.11. From the repository root:

```sh
npm ci
cp .env.example .env
npm run dev
```

Configure local development credentials in `.env`. Never commit credentials. The frontend serves port `3000` and proxies `/api` to port `8000`.

For the technical-assistance API:

```sh
cd python_backend
python -m venv .venv
# Activate .venv using your shell's activation command.
pip install -r requirements-dev.txt
cp .env.example .env
python -m uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000
```

The deployment entry point is descriptor-specific; `python_backend/railway.json` uses `apis.main:app`. External database and cache configuration is required for integration checks.

## Verification

| Command | Purpose |
| --- | --- |
| `npm run lint` | Frontend lint checks |
| `npm run type-check` | Node type check and application baseline regression gate |
| `npm run type-check:strict` | Full type check without baseline allowances |
| `npm run test` | Frontend unit and integration tests |
| `npm run test:api` | Backend API tests |
| `npm run build` | Production frontend build and catalogue assets |
| `npm run security:gate1` | Repository secret scan |

A passing baseline gate does **not** mean the application is type-clean. See [CI gate semantics](docs/ci/README.md). Report actual command results and integration limitations; do not infer certification, manufacturing accuracy or release readiness from documentation labels.

## Repository discipline

Keep source, required assets, dependency locks, configuration, migrations, tests, specifications and maintained operating guidance. Use Git history for retired plans and completion narratives. Put generated reports and scratch work in ignored `.artifacts/`. Retain audit evidence when it supports an active contract or release decision.

## License

No public license is declared. All rights reserved unless the repository owner states otherwise.
