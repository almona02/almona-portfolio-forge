# ALMONA Portfolio Forge

ALMONA is a web platform for aluminium and UPVC workshops in Egypt and the Middle East. It combines Almona Co.'s machinery catalogue, spare-parts and service workflows with Fabricator Pro, a workspace for measuring openings, designing positions, generating bills of materials, optimizing stock, preparing quotes, and producing workshop documents.

- Website: [www.almona02.com](https://www.almona02.com/)
- Repository: [github.com/almona02/almona-portfolio-forge](https://github.com/almona02/almona-portfolio-forge)
- Backend health: [Railway health endpoint](https://almona-portfolio-forge-production.up.railway.app/health)

## Current state

The public website and backend are deployed. The main CI, production, constitutional, hardening, and shipability workflows pass on the current release branch.

Fabricator Pro has a working position-based flow:

`Measure → Design → Drafting/BOM → Optimization → Commercial → Production`

The codebase includes authoritative position hydration, identity-scoped workflow state, deterministic manufacturing calculations, cutting-plan conservation checks, server-enforced QC approval, quote generation, production documents, Arabic/English interfaces, and digital machine/service features.

**Latest workshop UX (2026-10-05):** Measuring after Egyptian project create is hardened for daily use — active-project header syncs on save/delete, empty `grid: {}` no longer crashes pose load, system/pattern pickers are scroll-safe on phone and desktop, cut preview matches the dark amber shell, pose cards support right-click edit/duplicate/delete, and the guided Size flow starts with a compact step strip. Active plan: [FP-028 Fabricator Design Studio Apex Accuracy](docs/plans/FP-028_FABRICATOR_DESIGN_STUDIO_APEX_ACCURACY.md).

This is still an actively hardened industrial product. Passing CI means the software builds and its automated gates pass; it does not replace workshop validation. Production output must be checked by an authorized operator before material is cut or released.

## Product areas

- **Machinery and spare parts** — product catalogue, machine comparison, requests, and after-sales support.
- **Service operations** — tickets, SLA plans, technician workflows, and digital machine passports.
- **Fabricator Pro** — project and position management, measurement, SmartDraw and drafting, BOM, stock optimization, quoting, QC, and production documents.
- **Advisory tools** — AI-assisted support and analysis kept separate from manufacturing authority.

## Manufacturing boundaries

Manufacturing-critical paths are designed to be deterministic and auditable. Identical validated inputs should produce identical protected-path outputs. Advisory search or AI output must not silently become manufacturing truth.

The platform does not claim structural engineering authority. Profile-system rules, tolerances, formulas, and workshop output require approved source data and human sign-off. Accuracy percentages are not published as guarantees until they are supported by representative, independently reviewed production evidence.

See [Institutional Overview](docs/INSTITUTIONAL_OVERVIEW.md) and [Fabricator V2 Constitutional Migration Runbook](docs/FABRICATOR_V2_CONSTITUTIONAL_MIGRATION_RUNBOOK.md).

## Architecture

| Area | Main technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Data and auth | Supabase PostgreSQL, Row Level Security |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Cache and jobs | Redis, Celery where required |
| Hosting | Vercel for the frontend, Railway for the backend |
| Tests | Vitest, React Testing Library, Playwright, pytest |

The frontend runs on port `3000` during development and proxies `/api` to the backend on port `8000`.

## Local development

### Prerequisites

- Node.js `20.19` or newer, below Node 23
- npm
- Python 3.11

### Frontend

```bash
git clone https://github.com/almona02/almona-portfolio-forge.git
cd almona-portfolio-forge
npm install
cp .env.example .env
npm run dev
```

### Backend

```bash
cd python_backend
python -m venv .venv
# Activate .venv using your shell, then:
pip install -r requirements-dev.txt
cp .env.example .env
python -m uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port 8000
```

Environment files contain credentials and must stay outside commits. Use separate development credentials; never reuse production service keys locally.

## Verification

```bash
npm run security:gate1
npm run type-check
npm run lint
npm run test
npm run build

cd python_backend
python -m pytest tests/test_api.py -v
```

Remote PostgreSQL and Redis may be unavailable in an isolated local environment. In that case, dependency health checks can report degraded while API tests that do not require those services still run. Production readiness requires the hosted dependencies to pass.

Useful focused gates:

```bash
npm run validate:constitutional
npm run verify:shipability
npm run test:e2e
```

## Repository map

```text
src/
  components/             React UI and Fabricator workspaces
  lib/fabricator/         Manufacturing models, BOM, validation, optimization
  pages/                  Application routes and workflow screens
  store/                  Identity-aware workflow state
  tests/                  Frontend integration and regression tests
python_backend/
  api/                    FastAPI endpoints
  tests/                  Backend tests
supabase/
  migrations/             Database schema, functions, and policies
docs/
  audits/                 Evidence and parity audits
  launch/                 Launch and database repair records
```

## Remaining release work

The highest-priority work is tracked openly:

1. Complete authenticated live acceptance of the full Fabricator flow, including hard reloads and a second-account isolation run.
2. Reconcile the backend health response so optional or legacy dependency checks do not contradict authoritative database and Redis checks.
3. Apply and record every production Supabase migration, then finish the RLS and privileged-function cross-customer audit.
4. Close open dependency alerts, beginning with critical and high severity findings.
5. Rotate legacy production credentials through a controlled deployment and verify every consumer afterward.
6. Validate profile-system formulas, tolerances, piece reconciliation, and production documents against representative workshop jobs before making accuracy claims.

Product improvements that follow the release gates include continuous plausibility checks, thermal/U-value reporting, route and dashboard consolidation, shop-floor scanning/MES, live supplier data, BIM exchange, and ERP integration. See [Deferred Work](docs/DEFERRED_WORK.md) and the dated evidence under [docs/audits](docs/audits/).

## Contributing

Keep changes small and scoped. New TypeScript must remain strict and manufacturing changes need boundary, unit-conversion, and deterministic replay tests. Database changes require additive migrations and policy tests. Pull requests must pass the relevant CI, security, constitutional, and shipability gates.

Do not commit `.env` files, service-role keys, customer data, or production exports. Report security issues privately to the repository owner rather than opening a public issue.

## License

No public license has been declared. All rights are reserved unless the repository owner states otherwise.
