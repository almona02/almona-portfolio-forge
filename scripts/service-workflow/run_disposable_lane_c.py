#!/usr/bin/env python3
"""Cursor evidence: TR + Lane C disposable battery. Does NOT touch staging/production."""
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
DEPS = ROOT / "scripts/service-workflow/disposable_lane_c_deps.sql"
MIG_A = ROOT / "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
MIG_STG01 = ROOT / "supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql"
MIG_B = ROOT / "supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql"
MIG_TR = ROOT / "supabase/migrations/20261118120000_service_tickets_rls_enable_and_tech_header.sql"
MIG_LC = ROOT / "supabase/migrations/20261118130000_service_routines_lane_c_checklist_execution.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_lane_c_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_lane_c_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_lc_cluster"
LOG = OUT_DIR / "_lc_pg.log"
PORT = "55461"
PGUSER = "postgres"
POLICY_TIP = "c7addbb19be8a1391687e2b0d831c6dde9d59702"


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
            "-w", "-v", "ON_ERROR_STOP=1", "-f", str(path),
        ],
        text=True, capture_output=True, check=False, timeout=300, env=_psql_env(),
    )


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            [
                _psql_bin(),
                "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER, "-d", db,
                "-w", "-v", "ON_ERROR_STOP=1", "-c", sql,
            ],
            text=True, capture_output=True, check=False, timeout=15, env=_psql_env(),
        )
    except subprocess.TimeoutExpired as exc:
        return subprocess.CompletedProcess(list(exc.cmd) if exc.cmd else [], 1, "", "psql timeout")


def apply(db: str, path: Path, label: str) -> None:
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-8000:]}")


def wait_ready(retries: int = 90) -> None:
    time.sleep(1.0)
    isready = PGBIN / ("pg_isready.exe" if (PGBIN / "pg_isready.exe").exists() else "pg_isready")
    for i in range(retries):
        ready = subprocess.run(
            [str(isready), "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER],
            capture_output=True, text=True, check=False, timeout=10,
        )
        if ready.returncode == 0:
            # Confirm stability — Windows can briefly advertise before listen settles.
            time.sleep(0.75)
            ready2 = subprocess.run(
                [str(isready), "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER],
                capture_output=True, text=True, check=False, timeout=10,
            )
            if ready2.returncode == 0:
                print(f"postgres ready (pg_isready ok, attempt {i + 1})", flush=True)
                return
        time.sleep(0.5)
    raise SystemExit(f"postgres did not become ready; see {LOG}")


def impl_sha() -> str:
    r = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=str(ROOT))
    return r.stdout.strip()


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


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
    # Do not capture_output: on Windows postgres inherits pipes and pg_ctl never returns.
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
    db = "routines_lane_c"
    print("recreating database…", flush=True)
    psql("postgres", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db}' AND pid <> pg_backend_pid();")
    psql("postgres", f"DROP DATABASE IF EXISTS {db};")
    psql("postgres", f"CREATE DATABASE {db};")
    try:
        for path, label in [
            (BASE, "base"),
            (DEPS, "lane-c deps + staging-eq ticket RLS policies"),
            (MIG_A, "lane-a"),
            (MIG_STG01, "stg-01"),
            (MIG_B, "lane-b"),
            (MIG_TR, "ticket-header TR"),
            (MIG_LC, "lane-c"),
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
            if len(parts) == 3 and (
                parts[0].startswith("TR-")
                or parts[0].startswith("LC-")
            ):
                rows.append({"check_id": parts[0], "status": parts[1], "detail": parts[2]})
        pass_n = sum(1 for x in rows if x["status"] == "PASS")
        fail_n = sum(1 for x in rows if x["status"] == "FAIL")
        tr_rows = [x for x in rows if x["check_id"].startswith("TR-")]
        lc_rows = [x for x in rows if x["check_id"].startswith("LC-")]
        conc_rows = [x for x in rows if "CONC" in x["check_id"] or x["check_id"] == "LC-18"]
        payload = {
            "label": "Cursor disposable TR + Lane C",
            "not_spark": True,
            "not_staging_apply": True,
            "policy_accepted_tip": POLICY_TIP,
            "implementation_sha": impl_sha(),
            "migrations": {
                "tr": str(MIG_TR.relative_to(ROOT)),
                "tr_sha256": file_sha256(MIG_TR),
                "lane_c": str(MIG_LC.relative_to(ROOT)),
                "lane_c_sha256": file_sha256(MIG_LC),
            },
            "pass": pass_n,
            "fail": fail_n,
            "total": len(rows),
            "tr": {
                "pass": sum(1 for x in tr_rows if x["status"] == "PASS"),
                "fail": sum(1 for x in tr_rows if x["status"] == "FAIL"),
                "total": len(tr_rows),
            },
            "lane_c": {
                "pass": sum(1 for x in lc_rows if x["status"] == "PASS"),
                "fail": sum(1 for x in lc_rows if x["status"] == "FAIL"),
                "total": len(lc_rows),
            },
            "concurrency": {
                "pass": sum(1 for x in conc_rows if x["status"] == "PASS"),
                "fail": sum(1 for x in conc_rows if x["status"] == "FAIL"),
                "total": len(conc_rows),
                "rows": conc_rows,
            },
            "rows": rows,
            "stdout_tail": r.stdout[-3000:],
        }
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps({"pass": pass_n, "fail": fail_n, "total": len(rows), "out": str(OUT)}), flush=True)
        return 0 if fail_n == 0 and pass_n > 0 else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    sys.exit(main())
