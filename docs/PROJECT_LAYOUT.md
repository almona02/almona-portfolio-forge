# Project layout and root-folder policy

The repository root holds project entry points and configuration that build, hosting and developer tools discover by name. Day-to-day source code and utilities belong in the folders below.

| Location | Purpose |
| --- | --- |
| `src/`, `public/`, `locales/` | Main web application, public resources and translations |
| `python_backend/`, `api/` | Backend services and API entry points |
| `realityos_core/`, `sdk/`, vertical directories | Shared domain/ledger infrastructure and integration code |
| `scripts/` | Repository tooling; deployment/security/CI commands retain their existing paths |
| `scripts/diagnostics/redis/` | Retained environment, connection and cache diagnostic helpers |
| `scripts/documentation/` | Diagram/documentation generation tools |
| `scripts/setup/` | Optional development-machine installers; not application runtime code |
| `docs/architecture/diagrams/` | The three SVG architecture illustrations |
| `docs/archive/commit-messages/` | Historical commit-message drafts |
| `docs/archive/root-reports/` | Historical report exports still referenced by documentation, plus the old plan inventory |
| `docs/audits/` | Dated evidence, decisions and cleanup manifests |
| `tests/`, `qa/` | Test and verification resources |
| `supabase/`, `migrations/` | Database history and operational contracts; not deduplicated by filename |
| `config/`, `k8s/`, `pilot-deployment/` | Environment/deployment support |
| `.artifacts/` (ignored) | Local build/test/lint logs and temporary analysis output |

Platform-specific client folders and existing deployment scripts remain in place; this map is not a certification of every module's production readiness.

## Commands after reorganization

Use the README-recommended Node 22.22.2 (package engines require `>=22.19 <23`). Older Node 22 minors may not support the native TypeScript imports used by catalogue build scripts.

Run diagnostics from the repository root so dotenv continues to use the same local environment:

```sh
npx tsx scripts/diagnostics/redis/env-check.ts
npx tsx scripts/diagnostics/redis/check-redis-env.ts
```

The existing `scripts/diagnostics/redis/test-cache-performance.ts` is a **mutating** benchmark: it writes and deletes keys under `aftersales:ticket:*`. Use a disposable Redis instance. This cleanup validates its syntax/import resolution without executing Redis operations.

Generate the illustrations with:

```sh
python scripts/documentation/generate_diagrams.py
```

Output always goes to `docs/architecture/diagrams/`, independent of the caller's working directory. Existing illustrations and their wording are preserved. These are documentation drawings, not manufacturing authority data.

The optional installer formerly named `download.ps1` is now `scripts/setup/install-blackbox-cli.ps1`. It was moved without changing its behavior; no installer was executed during this cleanup.

For local logs in PowerShell:

```powershell
New-Item -ItemType Directory -Force .artifacts | Out-Null
npm run test:batch1 *> .artifacts/workflow-tests.log
```

## What stays at root

Keep `README.md`, `AGENTS.md`, package/lockfiles, `index.html`, Vite/Vitest/TypeScript/ESLint/Tailwind/PostCSS/Playwright configuration and hosting/deployment descriptors at their established locations. Environment templates and private environment files remain where their consumers expect them. Root SQL snapshots, Docker variants and deployment scripts require a consumer/deployment review before moving or deletion.

Do not copy downloaded production bundles, desktop shortcuts, console exports or commit drafts back to the root. Exact ignore rules cover the retired generated files; genuine fixtures and all text files elsewhere are not blanket-ignored. Git history retains the removed content; no history rewrite is required.
