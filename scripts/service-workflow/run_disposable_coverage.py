#!/usr/bin/env python3
"""Cursor evidence: coverage/recurrence disposable battery. Does NOT touch staging/production."""
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
MIG_A = ROOT / "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
MIG_STG01 = ROOT / "supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql"
MIG_B = ROOT / "supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql"
MIG_CR = ROOT / "supabase/migrations/20261118210000_service_coverage_recurrence.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_coverage_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_coverage_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_cr_cluster"
LOG = OUT_DIR / "_cr_pg.log"
PORT = "55459"
PGUSER = "postgres"
PROPOSAL_TIP = "42862fdd27636d2682ce81fc287ed3777f8005fb"


def _psql_bin() -> str:
    exe = PGBIN / "psql.exe"
    return str(exe if exe.exists() else PGBIN / "psql")


def _psql_env() -> dict[str, str]:
    env = dict(os.environ)
    env["PGCONNECT_TIMEOUT"] = "5"
    env["PGPASSWORD"] = env.get("PGPASSWORD", "")
    return env


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            _psql_bin(),
            "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER, "-d", db,
            "-v", "ON_ERROR_STOP=1", "-f", str(path),
        ],
        text=True, capture_output=True, check=False, timeout=300, env=_psql_env(),
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


def apply(db: str, path: Path, label: str) -> None:
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-8000:]}")


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
    db = "routines_coverage"
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
        ]:
            print(f"applying {label}…", flush=True)
            apply(db, path, label)
        print("running battery…", flush=True)
        r = psql_file(db, BATTERY)
        if r.returncode != 0:
            raise SystemExit(f"battery failed:\n{r.stderr}\n{r.stdout[-12000:]}")
        rows = []
        for ln in r.stdout.splitlines():
            parts = [p.strip() for p in ln.split("|")]
            if len(parts) == 3 and parts[0].startswith("CR-"):
                rows.append({"check_id": parts[0], "status": parts[1], "detail": parts[2]})
        pass_n = sum(1 for x in rows if x["status"] == "PASS")
        fail_n = sum(1 for x in rows if x["status"] == "FAIL")

        print("running concurrent generation…", flush=True)
        conc = subprocess.run(
            [sys.executable, str(ROOT / "scripts/service-workflow/disposable_coverage_concurrent.py")],
            text=True, capture_output=True, check=False, cwd=str(ROOT),
        )
        conc_payload = {}
        try:
            conc_payload = json.loads(conc.stdout.strip().splitlines()[-1])
        except Exception:
            conc_payload = {
                "pass": False,
                "stdout": conc.stdout[-2000:],
                "stderr": conc.stderr[-2000:],
                "rc": conc.returncode,
            }

        payload = {
            "label": "Cursor disposable coverage/recurrence",
            "not_spark": True,
            "not_staging_apply": True,
            "proposal_tip": PROPOSAL_TIP,
            "implementation_sha": impl_sha(),
            "migrations": {
                "coverage": str(MIG_CR.relative_to(ROOT)),
                "coverage_sha256": file_sha256(MIG_CR),
                "lane_b": str(MIG_B.relative_to(ROOT)),
                "lane_b_sha256": file_sha256(MIG_B),
            },
            "pass": pass_n,
            "fail": fail_n,
            "total": len(rows),
            "rows": rows,
            "concurrency": conc_payload,
            "stdout_tail": r.stdout[-4000:],
        }
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps({
            "pass": pass_n, "fail": fail_n, "total": len(rows),
            "concurrency_pass": bool(conc_payload.get("pass")),
            "out": str(OUT),
        }), flush=True)
        return 0 if fail_n == 0 and pass_n > 0 and conc_payload.get("pass") else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    raise SystemExit(main())
