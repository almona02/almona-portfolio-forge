#!/usr/bin/env python3
"""Local disposable B4 report battery (does NOT touch staging).

Applies Slice0 + frozen B1/B2 + security remediation + B3 chain + B4 migration,
runs disposable_b4_battery.sql, then B3 + B1/B2 regression batteries.
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
B3FIX = ROOT / "supabase/migrations/20261112190000_service_workflow_b3_visit_corrections.sql"
B3SAFE = ROOT / "supabase/migrations/20261112194500_service_workflow_b3_safety_path_final.sql"
B3ACK = ROOT / "supabase/migrations/20261112200000_service_workflow_b3_f_b3_02_ack_binding.sql"
B3LOCK = ROOT / "supabase/migrations/20261112201500_service_workflow_b3_f_b3_03_lock_order.sql"
B4 = ROOT / "supabase/migrations/20261112210000_service_workflow_b4_report_submission.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_b4_battery.sql"
B3_BATTERY = ROOT / "scripts/service-workflow/disposable_b3_battery.sql"
B1_BATTERY = ROOT / "scripts/service-workflow/disposable_b1_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_b4_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_b4_cluster"
PORT = "55444"
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
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-3000:]}")


def impl_sha() -> str:
    r = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=str(ROOT))
    return r.stdout.strip()


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
         "-l", str(OUT_DIR / "b4_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        raise SystemExit("pg start failed (see b4_cluster.log)")
    try:
        return run_all()
    finally:
        subprocess.run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
                       capture_output=True)
        shutil.rmtree(DATADIR, ignore_errors=True)


def parse_counts(sql_out: str) -> dict[str, int]:
    # Expect a single data row of integers from FILTER counts query
    lines = [ln.strip() for ln in sql_out.splitlines() if ln.strip()]
    # Find line after header separators with pipe-separated ints
    for ln in lines:
        if "|" in ln and not ln.startswith("-") and "pass" not in ln.lower() and "count" not in ln.lower():
            parts = [p.strip() for p in ln.split("|")]
            if all(p.isdigit() for p in parts[:4]):
                return {
                    "pass": int(parts[0]),
                    "fail": int(parts[1]),
                    "skip": int(parts[2]) if len(parts) > 2 else 0,
                    "defer": int(parts[3]) if len(parts) > 3 else 0,
                }
    return {"pass": -1, "fail": -1, "skip": -1, "defer": -1}


def run_all() -> int:
    db = "b4_disposable"
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(f"db setup failed: {r.stderr}")

    apply(db, BASE, "base")
    apply(db, BOUNDARY, "boundary")
    lines = TKT.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    tkt = OUT_DIR / "_b4_tkt_section2.sql"
    tkt.write_text("".join(lines[start:]), encoding="utf-8")
    apply(db, tkt, "ticket-number")

    b1f = OUT_DIR / "_b4_b1_frozen.sql"
    git_show(B1_SHA, B1_PATH, b1f)
    apply(db, b1f, "B1")
    b2f = OUT_DIR / "_b4_b2_frozen.sql"
    git_show(B2_SHA, B2_PATH, b2f)
    apply(db, b2f, "B2")
    apply(db, SEC, "security remediation")
    apply(db, B3, "B3")
    apply(db, B3FIX, "B3 corrections")
    apply(db, B3SAFE, "B3 safety")
    apply(db, B3ACK, "B3 ack binding")
    apply(db, B3LOCK, "B3 lock order")
    # F-B4-00: apply committed migration bytes only — no harness SQL rewrite.
    apply(db, B4, "B4 report submission (untouched migration)")
    apply(db, BATTERY, "B4 battery")

    b4_rows = psql(db, "SELECT check_id, status, detail FROM public.b4_eval ORDER BY 1;")
    b4_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
        "COUNT(*) FILTER (WHERE status='FAIL') AS fail, "
        "COUNT(*) FILTER (WHERE status='SKIP') AS skip, "
        "COUNT(*) FILTER (WHERE status='DEFER') AS defer "
        "FROM public.b4_eval;",
    )
    print("=== B4 battery ===")
    print(b4_rows.stdout)
    print(b4_counts.stdout)

    # B3 regression under B4
    apply(db, B3_BATTERY, "B3 regression battery")
    b3_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
        "COUNT(*) FILTER (WHERE status='FAIL') AS fail, "
        "COUNT(*) FILTER (WHERE status='SKIP') AS skip, "
        "COUNT(*) FILTER (WHERE status='DEFER') AS defer "
        "FROM public.b3_eval;",
    )
    b3_fails = psql(db, "SELECT check_id, detail FROM public.b3_eval WHERE status='FAIL' ORDER BY 1;")
    print("=== B3 under B4 ===")
    print(b3_counts.stdout)
    if b3_fails.stdout.strip() and "0 rows" not in b3_fails.stdout:
        print(b3_fails.stdout)

    # B1/B2 regression under B4
    persist = B1_BATTERY.read_text(encoding="utf-8").replace(
        "CREATE TEMP TABLE b1_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);",
        "CREATE TABLE IF NOT EXISTS public.b1_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);\n"
        "TRUNCATE public.b1_eval;",
    )
    tmp = OUT_DIR / "_b4_b1_battery_run.sql"
    tmp.write_text(persist, encoding="utf-8")
    r = psql_file(db, tmp)
    if r.returncode != 0:
        print(r.stderr[-3000:], file=sys.stderr)
        print(r.stdout[-3000:])
        raise SystemExit("B1/B2 regression failed to execute under B4")
    b1_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
        "COUNT(*) FILTER (WHERE status='FAIL') AS fail, "
        "COUNT(*) FILTER (WHERE status='SKIP') AS skip, "
        "COUNT(*) FILTER (WHERE status='DEFER') AS defer "
        "FROM public.b1_eval;",
    )
    b1_fails = psql(db, "SELECT check_id, detail FROM public.b1_eval WHERE status='FAIL' ORDER BY 1;")
    print("=== B1/B2 under B4 ===")
    print(b1_counts.stdout)
    if b1_fails.stdout.strip() and "0 rows" not in b1_fails.stdout:
        print(b1_fails.stdout)

    sha = impl_sha()
    c4 = parse_counts(b4_counts.stdout)
    c3 = parse_counts(b3_counts.stdout)
    c1 = parse_counts(b1_counts.stdout)
    ok = c4["fail"] == 0 and c3["fail"] == 0 and c1["fail"] == 0
    payload = {
        "ok": ok,
        "implementation_sha": sha,
        "b4": {"counts": c4, "rows": b4_rows.stdout},
        "b3_regression": {"counts": c3, "fails": b3_fails.stdout},
        "b1_b2_regression": {"counts": c1, "fails": b1_fails.stdout},
        "notes": [
            "UI Vitest is separate and does not establish DB correctness",
            "B5/B6 checks are DEFER only",
            "No staging apply",
        ],
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("wrote", OUT)
    print("VERDICT", "PASS" if ok else "FAIL", "sha", sha)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
