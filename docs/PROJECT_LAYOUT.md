# Repository structure and retention policy

Keep a file when it is required to build, run, test, deploy, operate, explain or audit the maintained system.

| Location | Purpose |
| --- | --- |
| `src/`, `public/`, `locales/` | Web application, required assets and translations |
| `python_backend/`, `api/`, `ai_agents/` | APIs, technical services and runtime knowledge |
| `realityos_core/`, `sdk/`, vertical directories | Domain infrastructure and integrations |
| `tests/`, `qa/`, test fixtures | Reproducible verification |
| `scripts/` | Build, validation, maintenance and deployment tooling |
| `supabase/`, `migrations/` | Database history and operational contracts |
| `config/`, `k8s/`, `pilot-deployment/` | Deployment support |
| `docs/` | Specifications, architecture, operating guides and necessary evidence |
| `vendor/` | Required vendored dependency and license material |
| `.artifacts/` (ignored) | Local reports, logs, analysis and scratch work |

Platform-specific clients retain their established directories. Root entry points, package manifests and lockfiles, tool configuration, environment templates and deployment descriptors stay at the paths expected by their consumers.

## Retention rules

- Preserve executable code, required data/assets, tests, migrations, licenses and dependency locks.
- Maintain one authoritative description of each contract; link to its implementation and verification.
- Retain audit evidence and acceptance criteria supporting active release decisions.
- Retire superseded plans, completion narratives and duplicate status reports through reviewed changes. Git history preserves tracked originals.
- Check incoming references before deleting documents: some documentation is also consumed by tooling and knowledge generation.
- Do not remove SQL history, Docker variants, deployment scripts or binary assets solely because their names look old or duplicated.
- Keep secrets local. Do not commit private environment files, generated bundles, console exports or personal tool state.
- Keep editor and coding-assistant preferences local. Shared CI workflows in `.github/` and YDT service code in `ai_agents/` are functional project infrastructure and remain versioned.

## Quality claims

State the checked revision, command, result and limitations when reporting verification. Constitutional requirements describe intended controls; claims of compliance or production acceptance require evidence. See [engineering overview](INSTITUTIONAL_OVERVIEW.md) and [CI gate semantics](ci/README.md).
