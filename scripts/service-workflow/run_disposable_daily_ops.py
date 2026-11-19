#!/usr/bin/env python3
"""Cursor evidence: DO-1 staff daily ops disposable battery. Local only — no staging/production."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_routines_base.sql"
DEPS_B = ROOT / "scripts/service-workflow/disposable_lane_b_deps.sql"
DEPS_CR = ROOT / "scripts/service-workflow/disposable_coverage_deps.sql"
DEPS_DO1 = ROOT / "scripts/service-workflow/disposable_daily_ops_deps.sql"
MIG_A = ROOT / "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
MIG_STG01 = ROOT / "supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql"
MIG_B = ROOT / "supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql"
MIG_CR = ROOT / "supabase/migrations/20261118210000_service_coverage_recurrence.sql"
MIG_CAP = ROOT / "supabase/migrations/20261118220000_service_coverage_f_cov_cap_1.sql"
MIG_DO1 = ROOT / "supabase/migrations/20261118230000_service_daily_ops_do1_staff_workspace.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_daily_ops_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_daily_ops_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_do1_cluster"
LOG = OUT_DIR / "_do1_pg.log"
PORT = "55461"
PGUSER = "postgres"
PROPOSAL_TIP = "4c8285117b3a304b7f113885d14b260259128e70"


def _psql_bin() -> str:
    exe = PGBIN / "psql.exe"
    return str(exe if exe.exists() else PGBIN / "psql")


def _psql_env() -> dict[str, str]:
    env = dict(os.environ)
    env["PGCONNECT_TIMEOUT"] = "5"
    env["PGPASSWORD"] = env.get("PGPASSWORD", "")
    return env


def psql_file(db: str, path: Path, timeout: int = 300) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            _psql_bin(),
            "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER, "-d", db,
            "-v", "ON_ERROR_STOP=1", "-f", str(path),
        ],
        text=True, capture_output=True, check=False, timeout=timeout, env=_psql_env(),
    )


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            [
                _psql_bin(),
                "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER, "-d", db,
                "-v", "ON_ERROR_STOP=1", "-c", sql,
            ],
            text=True, capture_output=True, check=False, timeout=30, env=_psql_env(),
        )
    except subprocess.TimeoutExpired as exc:
        return subprocess.CompletedProcess(list(exc.cmd) if exc.cmd else [], 1, "", "psql timeout")


def apply(db: str, path: Path, label: str, timeout: int = 300) -> None:
    r = psql_file(db, path, timeout=timeout)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-8000:]}")


def parse_rows(stdout: str, prefix: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for ln in stdout.splitlines():
        parts = [p.strip() for p in ln.split("|")]
        if len(parts) == 3 and parts[0].startswith(prefix):
            rows.append({"check_id": parts[0], "status": parts[1], "detail": parts[2]})
    return rows


def wait_ready(retries: int = 60) -> None:
    time.sleep(1.0)
    isready = PGBIN / ("pg_isready.exe" if (PGBIN / "pg_isready.exe").exists() else "pg_isready")
    for _ in range(retries):
        ready = subprocess.run(
            [str(isready), "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER],
            capture_output=True, text=True, check=False, timeout=10,
        )
        if ready.returncode == 0:
            return
        time.sleep(0.5)
    raise SystemExit(f"postgres did not become ready; see {LOG}")


def impl_sha() -> str:
    r = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=str(ROOT))
    return r.stdout.strip()


def file_sha256(path: Path) -> str:
    data = path.read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def stop_cluster() -> None:
    subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "immediate"],
        capture_output=True, check=False,
    )


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stop_cluster()
    if DATADIR.exists():
        shutil.rmtree(DATADIR, ignore_errors=True)
    DATADIR.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [str(PGBIN / "initdb"), "-D", str(DATADIR), "-U", PGUSER, "--auth=trust"],
        check=True, capture_output=True,
    )
    if LOG.exists():
        LOG.unlink()
    print(f"starting disposable postgres on {PORT}…", flush=True)
    subprocess.run(
        [
            str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "-l", str(LOG),
            "-o", f"-p {PORT} -c listen_addresses=127.0.0.1", "start",
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    wait_ready()
    db = "routines_daily_ops"
    print("recreating database…", flush=True)
    psql("postgres", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db}' AND pid <> pg_backend_pid();")
    psql("postgres", f"DROP DATABASE IF EXISTS {db};")
    psql("postgres", f"CREATE DATABASE {db};")
    try:
        for path, label in [
            (BASE, "base"),
            (DEPS_B, "lane-b deps"),
            (MIG_A, "lane-a"),
            (MIG_STG01, "stg-01"),
            (MIG_B, "lane-b"),
            (DEPS_CR, "coverage deps"),
            (MIG_CR, "coverage recurrence"),
            (MIG_CAP, "F-COV-CAP-1"),
            (DEPS_DO1, "do1 deps"),
            (MIG_DO1, "do1 staff workspace"),
        ]:
            print(f"applying {label}…", flush=True)
            apply(db, path, label)
        print("running DO-01…DO-10 + DO-G* battery…", flush=True)
        r = psql_file(db, BATTERY, timeout=300)
        if r.returncode != 0:
            raise SystemExit(f"battery failed:\n{r.stderr}\n{r.stdout[-12000:]}")
        rows = parse_rows(r.stdout, "DO-")
        pass_n = sum(1 for x in rows if x["status"] == "PASS")
        fail_n = sum(1 for x in rows if x["status"] == "FAIL")
        payload = {
            "label": "Cursor disposable DO-1 staff daily ops",
            "not_spark": True,
            "not_staging_apply": True,
            "proposal_tip": PROPOSAL_TIP,
            "implementation_sha": impl_sha(),
            "migrations": {
                "do1": str(MIG_DO1.relative_to(ROOT)),
                "do1_sha256": file_sha256(MIG_DO1),
            },
            "pass": pass_n,
            "fail": fail_n,
            "total": len(rows),
            "rows": rows,
            "stdout_tail": r.stdout[-3000:],
        }
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps({
            "pass": pass_n, "fail": fail_n, "total": len(rows), "out": str(OUT),
        }), flush=True)
        return 0 if fail_n == 0 and pass_n > 0 else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    raise SystemExit(main())
