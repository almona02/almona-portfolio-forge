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
MIG_CAP = ROOT / "supabase/migrations/20261118220000_service_coverage_f_cov_cap_1.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_coverage_battery.sql"
CAP_BATTERY = ROOT / "scripts/service-workflow/disposable_coverage_cap_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_coverage_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_cr_cluster"
LOG = OUT_DIR / "_cr_pg.log"
PORT = "55459"
PGUSER = "postgres"
PROPOSAL_TIP = "42862fdd27636d2682ce81fc287ed3777f8005fb"
BASELINE_IMPL = "e2a2f525cba0feb7238bfd6d89d866e0cd13560f"


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
            (MIG_CAP, "F-COV-CAP-1"),
        ]:
            print(f"applying {label}…", flush=True)
            apply(db, path, label)
        print("running CR-01…CR-16 battery…", flush=True)
        r = psql_file(db, BATTERY, timeout=300)
        if r.returncode != 0:
            raise SystemExit(f"battery failed:\n{r.stderr}\n{r.stdout[-12000:]}")
        rows = parse_rows(r.stdout, "CR-")
        # Exclude CAP rows if any leak into CR prefix parsing (CAP uses CR-CAP-)
        base_rows = [x for x in rows if not x["check_id"].startswith("CR-CAP-")]
        pass_n = sum(1 for x in base_rows if x["status"] == "PASS")
        fail_n = sum(1 for x in base_rows if x["status"] == "FAIL")

        print("running concurrent generation (8-worker race)…", flush=True)
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

        print("running F-COV-CAP-1 battery…", flush=True)
        r_cap = psql_file(db, CAP_BATTERY, timeout=1200)
        if r_cap.returncode != 0:
            raise SystemExit(f"CAP battery failed:\n{r_cap.stderr}\n{r_cap.stdout[-12000:]}")
        cap_rows = parse_rows(r_cap.stdout, "CR-CAP-")
        cap_pass = sum(1 for x in cap_rows if x["status"] == "PASS")
        cap_fail = sum(1 for x in cap_rows if x["status"] == "FAIL")

        payload = {
            "label": "Cursor disposable coverage/recurrence + F-COV-CAP-1",
            "not_spark": True,
            "not_staging_apply": True,
            "proposal_tip": PROPOSAL_TIP,
            "baseline_implementation_sha": BASELINE_IMPL,
            "implementation_sha": impl_sha(),
            "migrations": {
                "coverage": str(MIG_CR.relative_to(ROOT)),
                "coverage_sha256": file_sha256(MIG_CR),
                "f_cov_cap_1": str(MIG_CAP.relative_to(ROOT)),
                "f_cov_cap_1_sha256": file_sha256(MIG_CAP),
                "lane_b": str(MIG_B.relative_to(ROOT)),
                "lane_b_sha256": file_sha256(MIG_B),
            },
            "pass": pass_n,
            "fail": fail_n,
            "total": len(base_rows),
            "rows": base_rows,
            "concurrency": conc_payload,
            "f_cov_cap_1": {
                "pass": cap_pass,
                "fail": cap_fail,
                "total": len(cap_rows),
                "rows": cap_rows,
            },
            "stdout_tail": r.stdout[-2000:],
            "cap_stdout_tail": r_cap.stdout[-2000:],
        }
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps({
            "pass": pass_n, "fail": fail_n, "total": len(base_rows),
            "concurrency_pass": bool(conc_payload.get("pass")),
            "cap_pass": cap_pass, "cap_fail": cap_fail, "cap_total": len(cap_rows),
            "out": str(OUT),
        }), flush=True)
        ok = (
            fail_n == 0 and pass_n > 0
            and conc_payload.get("pass")
            and cap_fail == 0 and cap_pass > 0
        )
        return 0 if ok else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    raise SystemExit(main())
