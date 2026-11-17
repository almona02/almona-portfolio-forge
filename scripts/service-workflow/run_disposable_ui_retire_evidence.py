#!/usr/bin/env python3
"""Cursor evidence: isolated-backend retirement path. Not staging/production."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_routines_base.sql"
MIG = ROOT / "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
MIG_STG01 = ROOT / "supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_ui_retire_evidence.sql"
PANEL_TEST = (
    ROOT / "src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx"
)
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_ui_retire_evidence_results.json"
EVIDENCE_MD = (
    ROOT / "docs/operations/service-workflow/CURSOR_EVIDENCE_UI_RETIREMENT_LOCAL.md"
)
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_ra_retire_cluster"
PORT = "55457"
PGUSER = "postgres"
DB = "ra_retire_ev"


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            str(PGBIN / "psql"),
            f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={db} connect_timeout=5",
            "-v",
            "ON_ERROR_STOP=1",
            "-f",
            str(path),
        ],
        text=True,
        capture_output=True,
        check=False,
    )


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            str(PGBIN / "psql"),
            f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={db} connect_timeout=5",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            sql,
        ],
        text=True,
        capture_output=True,
        check=False,
    )


def apply(db: str, path: Path, label: str) -> None:
    print(f"applying {label}…", flush=True)
    result = psql_file(db, path)
    if result.returncode != 0:
        raise SystemExit(f"{label} failed:\n{result.stderr}\n{result.stdout[-4000:]}")


def wait_ready(retries: int = 60) -> None:
    for _ in range(retries):
        if psql("postgres", "SELECT 1").returncode == 0:
            return
        time.sleep(0.5)
    raise SystemExit("postgres did not become ready")


def git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=str(ROOT)
    )
    return result.stdout.strip()


def file_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stop_cluster() -> None:
    subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "immediate"],
        capture_output=True,
        check=False,
    )


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stop_cluster()
    if DATADIR.exists():
        shutil.rmtree(DATADIR, ignore_errors=True)
    DATADIR.mkdir(parents=True, exist_ok=True)
    print("initdb…", flush=True)
    init = subprocess.run(
        [str(PGBIN / "initdb"), "-D", str(DATADIR), "-U", PGUSER, "--auth=trust"],
        capture_output=True,
        text=True,
        check=False,
    )
    if init.returncode != 0:
        raise SystemExit(f"initdb failed:\n{init.stderr}")

    log = OUT_DIR / "_ra_retire_pg.log"
    print(f"starting disposable postgres on {PORT}…", flush=True)
    # Never use pg_ctl -w on Windows (known hang); poll readiness instead.
    subprocess.run(
        [
            str(PGBIN / "pg_ctl"),
            "-D",
            str(DATADIR),
            "-l",
            str(log),
            "-o",
            f"-p {PORT} -c listen_addresses=127.0.0.1",
            "start",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    wait_ready()
    psql("postgres", f"DROP DATABASE IF EXISTS {DB};")
    psql("postgres", f"CREATE DATABASE {DB};")
    try:
        apply(DB, BASE, "base")
        apply(DB, MIG, "lane_a")
        apply(DB, MIG_STG01, "stg01")
        print("running retire evidence battery…", flush=True)
        bat = psql_file(DB, BATTERY)
        if bat.returncode != 0:
            raise SystemExit(f"battery failed:\n{bat.stderr}\n{bat.stdout[-6000:]}")

        summary = psql(
            DB,
            "SELECT count(*) FILTER (WHERE ok)::text || '|' || "
            "count(*) FILTER (WHERE NOT ok)::text || '|' || count(*)::text "
            "FROM public.ra_retire_ev;",
        )
        if summary.returncode != 0:
            raise SystemExit(f"summary failed:\n{summary.stderr}\n{summary.stdout}")
        passed = failed = total = 0
        for line in summary.stdout.splitlines():
            line = line.strip()
            if line.count("|") == 2 and line[0].isdigit():
                passed, failed, total = map(int, line.split("|"))
                break

        steps = psql(
            DB,
            "SELECT step || '|' || ok::text || '|' || left(detail,160) "
            "FROM public.ra_retire_ev ORDER BY step;",
        )
        if steps.returncode != 0:
            raise SystemExit(f"steps failed:\n{steps.stderr}\n{steps.stdout}")
        step_rows = []
        for line in steps.stdout.splitlines():
            parts = line.strip().split("|", 2)
            if len(parts) == 3 and parts[1] in {"t", "f", "true", "false"}:
                step_rows.append(
                    {
                        "step": parts[0],
                        "ok": parts[1] in {"t", "true"},
                        "detail": parts[2],
                    }
                )

        head = git_sha()
        battery_sha = file_sha(BATTERY)
        panel_sha = file_sha(PANEL_TEST)
        mig_sha = file_sha(MIG)
        stg01_sha = file_sha(MIG_STG01)
        contract_sha = file_sha(
            ROOT / "docs/operations/service-workflow/SERVICE_ROUTINES_LANE_B_PIN_CONTRACT.md"
        )

        payload = {
            "label": "disposable_ui_retire_evidence",
            "not_spark": True,
            "environment": "local_pg17_isolated",
            "port": PORT,
            "git_head": head,
            "paths": {
                "battery_sql": str(BATTERY.relative_to(ROOT)).replace("\\", "/"),
                "runner": "scripts/service-workflow/run_disposable_ui_retire_evidence.py",
                "panel_test": str(PANEL_TEST.relative_to(ROOT)).replace("\\", "/"),
                "evidence_md": str(EVIDENCE_MD.relative_to(ROOT)).replace("\\", "/"),
                "results_json": str(OUT.relative_to(ROOT)).replace("\\", "/"),
                "lane_b_contract": (
                    "docs/operations/service-workflow/SERVICE_ROUTINES_LANE_B_PIN_CONTRACT.md"
                ),
            },
            "sha256": {
                "battery_sql": battery_sha,
                "panel_test": panel_sha,
                "lane_a_migration": mig_sha,
                "stg01_migration": stg01_sha,
                "lane_b_contract": contract_sha,
            },
            "passed": passed,
            "failed": failed,
            "total": total,
            "ok": failed == 0 and total > 0,
            "steps": step_rows,
            "stdout_tail": bat.stdout[-4000:],
            "historical_lane_a_ui_retire_assertions": "2 void — not rewritten",
            "note": (
                "Isolated DB proves author→review→publish→retire with denied control "
                "and persisted version/parent status. Vitest covers exact toast titles; "
                "mocked component success alone is not browser/DB acceptance."
            ),
        }
        OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

        evidence = f"""# Cursor evidence — local UI-retirement (isolated backend)

| Field | Value |
|-------|-------|
| Status | {'PASS' if payload['ok'] else 'FAIL'} |
| Environment | local disposable PostgreSQL 17 `127.0.0.1:{PORT}` (not staging/production) |
| Git HEAD | `{head}` |
| Battery SQL | `scripts/service-workflow/disposable_ui_retire_evidence.sql` |
| Battery SHA-256 | `{battery_sha}` |
| Panel test | `src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx` |
| Panel test SHA-256 | `{panel_sha}` |
| Results JSON | `.artifacts/slice0/service-workflow/disposable_ui_retire_evidence_results.json` |
| Steps | {passed}/{total} passed · {failed} failed |

## Assertions (backend)

1. Exact retire success (`version.status = retired` after RPC).
2. Denied/error control: non-admin retire → `42501`; version/parent remain `published`.
3. Persisted version status after re-read (reload).
4. Parent routine status checked **separately**.

## Explicit non-claims

- Does **not** rewrite Lane A historical **2 void** UI-retirement assertions.
- Mocked Vitest success is complementary only — not a real browser/Auth DB acceptance by itself.
- No staging access used.

## Reproduce

```bash
python scripts/service-workflow/run_disposable_ui_retire_evidence.py
npx vitest run src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx
```
"""
        EVIDENCE_MD.write_text(evidence, encoding="utf-8")
        print(json.dumps({"ok": payload["ok"], "passed": passed, "failed": failed, "git_head": head, "battery_sha256": battery_sha}, indent=2), flush=True)
        return 0 if payload["ok"] else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    sys.exit(main())
