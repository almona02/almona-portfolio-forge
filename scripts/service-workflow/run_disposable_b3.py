#!/usr/bin/env python3
"""Local disposable B3 visit battery (does NOT touch staging).

Spins a throwaway PG17 on port 55443, applies Slice 0 + frozen B1/B2
migrations + worktree security remediation + B3 visit migration, then runs
disposable_b3_battery.sql. Cluster is removed afterward.
"""
from __future__ import annotations

import getpass
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_b1_base.sql"
BOUNDARY = ROOT / "supabase/migrations/20261111010000_service_slice0_security_boundary.sql"
TKT = ROOT / "supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql"
B1_SHA = "7a8307395b79df677a96f77cd993a77351b5805c"
B1_PATH = "supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql"
B2_SHA = "8f2acc4e806e70e12e87a24dcbebaef78e63e085"
B2_PATH = "supabase/migrations/20261111220000_service_workflow_b2_assignment.sql"
SEC = ROOT / "supabase/migrations/20261112150000_service_workflow_security_remediation.sql"
B3 = ROOT / "supabase/migrations/20261112180000_service_workflow_b3_visit_execution.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_b3_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_b3_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_b3_cluster"
PORT = "55443"
USER = getpass.getuser()


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-f", str(path)],
        text=True, capture_output=True, check=False,
    )


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True, capture_output=True, check=False,
    )


def git_show(sha: str, path: str, dest: Path) -> None:
    r = subprocess.run(["git", "show", f"{sha}:{path}"], capture_output=True, cwd=str(ROOT))
    if r.returncode != 0:
        raise SystemExit(f"cannot extract {path} at {sha}: {r.stderr.decode()}")
    dest.write_bytes(r.stdout)


def apply(db: str, path: Path, label: str) -> None:
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-2000:]}")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if DATADIR.exists():
        shutil.rmtree(DATADIR)
    r = subprocess.run([str(PGBIN / "initdb"), "-D", str(DATADIR), "-E", "UTF8"],
                       text=True, capture_output=True)
    if r.returncode != 0:
        raise SystemExit(f"initdb failed: {r.stderr}")
    r = subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR),
         "-o", f"-p {PORT} -c listen_addresses=127.0.0.1",
         "-l", str(OUT_DIR / "b3_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        raise SystemExit("pg start failed (see b3_cluster.log)")
    try:
        return run_all()
    finally:
        subprocess.run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
                       capture_output=True)
        shutil.rmtree(DATADIR, ignore_errors=True)


def run_all() -> int:
    db = "b3_disposable"
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(f"db setup failed: {r.stderr}")

    apply(db, BASE, "base")
    apply(db, BOUNDARY, "boundary")
    lines = TKT.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    tkt = OUT_DIR / "_b3_tkt_section2.sql"
    tkt.write_text("".join(lines[start:]), encoding="utf-8")
    apply(db, tkt, "ticket-number")

    b1f = OUT_DIR / "_b3_b1_frozen.sql"
    git_show(B1_SHA, B1_PATH, b1f)
    apply(db, b1f, "B1")
    b2f = OUT_DIR / "_b3_b2_frozen.sql"
    git_show(B2_SHA, B2_PATH, b2f)
    apply(db, b2f, "B2")
    apply(db, SEC, "security remediation")
    apply(db, B3, "B3 visit execution")
    apply(db, BATTERY, "B3 battery")

    rows = psql(db, "SELECT check_id, status, detail FROM public.b3_eval ORDER BY 1;")
    verdict = psql(db, "SELECT CASE WHEN count(*) FILTER (WHERE status = 'FAIL') = 0 "
                       "THEN 'B3 BATTERY: PASS' ELSE 'B3 BATTERY: FAIL' END AS verdict, "
                       "count(*) FILTER (WHERE status = 'PASS') AS passes, "
                       "count(*) FILTER (WHERE status = 'FAIL') AS fails FROM public.b3_eval;")
    print(rows.stdout)
    print(verdict.stdout)
    fails = [ln for ln in rows.stdout.splitlines() if "| FAIL" in ln]

    # Regression: B1/B2 disposable battery must stay green under B3 facades.
    b1_battery = ROOT / "scripts/service-workflow/disposable_b1_battery.sql"
    persist = b1_battery.read_text(encoding="utf-8").replace(
        "CREATE TEMP TABLE b1_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);",
        "CREATE TABLE IF NOT EXISTS public.b1_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);\n"
        "TRUNCATE public.b1_eval;",
    )
    # b1_note targets b1_eval; keep name as b1_eval table (temp→public above).
    tmp = OUT_DIR / "_b3_b1_battery_run.sql"
    tmp.write_text(persist, encoding="utf-8")
    r = psql_file(db, tmp)
    if r.returncode != 0:
        print(r.stderr[-2000:], file=sys.stderr)
        print(r.stdout[-2000:])
        raise SystemExit("B1/B2 regression battery failed to execute under B3")
    b1_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
        "COUNT(*) FILTER (WHERE status='FAIL') AS fail, "
        "COUNT(*) FILTER (WHERE status='SKIP') AS skip, "
        "COUNT(*) FILTER (WHERE status='DEFER') AS defer "
        "FROM public.b1_eval;",
    )
    b1_all = psql(db, "SELECT check_id, status, detail FROM public.b1_eval ORDER BY 1;")
    b1_fails = psql(
        db,
        "SELECT check_id, detail FROM public.b1_eval WHERE status='FAIL' ORDER BY 1;",
    )
    print(b1_counts.stdout)
    print(b1_all.stdout)
    if b1_fails.stdout.strip() and "0 rows" not in b1_fails.stdout:
        print(b1_fails.stdout)
    fail_row = psql(db, "SELECT COUNT(*)::int FROM public.b1_eval WHERE status='FAIL';")
    try:
        b1_fail_n = int([ln for ln in fail_row.stdout.splitlines() if ln.strip().isdigit()][0])
    except Exception:
        b1_fail_n = -1
    print(f"B1/B2 under B3: fail_count={b1_fail_n}")

    payload = {
        "ok": len(fails) == 0 and b1_fail_n == 0,
        "verdict": verdict.stdout.strip(),
        "rows": rows.stdout,
        "b1_b2_regression_fail_count": b1_fail_n,
        "b1_b2_counts": b1_counts.stdout.strip(),
        "b1_b2_rows": b1_all.stdout,
        "implementation_sha": "9882a256edb376de9ea726a510c96e40af69f845",
        "b1_sha": B1_SHA,
        "b2_sha": B2_SHA,
        "b3_migration": str(B3.relative_to(ROOT)),
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("wrote", OUT)
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
