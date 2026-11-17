#!/usr/bin/env python3
"""Cursor evidence: Lane B disposable battery. Does NOT touch staging/production."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_routines_base.sql"
DEPS = ROOT / "scripts/service-workflow/disposable_lane_b_deps.sql"
MIG_A = ROOT / "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
MIG_STG01 = ROOT / "supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql"
MIG_B = ROOT / "supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_lane_b_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_lane_b_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_lb_cluster"
LOG = OUT_DIR / "_lb_pg.log"
PORT = "55458"
PGUSER = "postgres"
CONTRACT_TIP = "da4bcb4a331175bce674291b6a3a802fdc7d8f84"
CONTRACT_HASH = "806f90bd8e5cb59071153f414c1c2d917a2c9e2d9592c326dc465b6d4db9e2ed"


def _psql_bin() -> str:
    exe = PGBIN / "psql.exe"
    return str(exe if exe.exists() else PGBIN / "psql")


def _psql_env() -> dict[str, str]:
    env = dict(os.environ)
    env["PGCONNECT_TIMEOUT"] = "5"
    return env


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            _psql_bin(),
            "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER, "-d", db,
            "-v", "ON_ERROR_STOP=1", "-f", str(path),
        ],
        text=True, capture_output=True, check=False, timeout=180, env=_psql_env(),
    )


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            [
                _psql_bin(),
                "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER, "-d", db,
                "-v", "ON_ERROR_STOP=1", "-c", sql,
            ],
            text=True, capture_output=True, check=False, timeout=15, env=_psql_env(),
        )
    except subprocess.TimeoutExpired as exc:
        return subprocess.CompletedProcess(list(exc.cmd) if exc.cmd else [], 1, "", "psql timeout")


def apply(db: str, path: Path, label: str) -> None:
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-6000:]}")


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
    # Avoid Windows pg_ctl -w hangs; also avoid capture_output (pipe inherit hang).
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
    db = "routines_lane_b"
    print("recreating database…", flush=True)
    psql("postgres", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db}' AND pid <> pg_backend_pid();")
    psql("postgres", f"DROP DATABASE IF EXISTS {db};")
    psql("postgres", f"CREATE DATABASE {db};")
    try:
        for path, label in [
            (BASE, "base"),
            (DEPS, "lane-b deps"),
            (MIG_A, "lane-a"),
            (MIG_STG01, "stg-01"),
            (MIG_B, "lane-b"),
        ]:
            print(f"applying {label}…", flush=True)
            apply(db, path, label)
        print("running battery…", flush=True)
        r = psql_file(db, BATTERY)
        if r.returncode != 0:
            raise SystemExit(f"battery failed:\n{r.stderr}\n{r.stdout[-8000:]}")
        rows = []
        for ln in r.stdout.splitlines():
            parts = [p.strip() for p in ln.split("|")]
            if len(parts) == 3 and (parts[0].startswith("RB-") or parts[0].startswith("LB-")):
                rows.append({"check_id": parts[0], "status": parts[1], "detail": parts[2]})
        pass_n = sum(1 for x in rows if x["status"] == "PASS")
        fail_n = sum(1 for x in rows if x["status"] == "FAIL")
        payload = {
            "label": "Cursor disposable Lane B",
            "not_spark": True,
            "not_browser": True,
            "contract_tip": CONTRACT_TIP,
            "contract_sha256": CONTRACT_HASH,
            "implementation_sha": impl_sha(),
            "migration": str(MIG_B.relative_to(ROOT)),
            "pass": pass_n,
            "fail": fail_n,
            "total": len(rows),
            "rows": rows,
            "stdout_tail": r.stdout[-2000:],
        }
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps({"pass": pass_n, "fail": fail_n, "total": len(rows), "out": str(OUT)}), flush=True)
        return 0 if fail_n == 0 and pass_n > 0 else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    sys.exit(main())
