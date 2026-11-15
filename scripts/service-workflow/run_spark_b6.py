#!/usr/bin/env python3
"""Spark independent B6 correction battery runner (disposable only).

Applies B1–B6 + F-B6-03/05 + integrity migrations, runs spark_b6_battery.sql
and Cursor disposable_b6_battery.sql. Never touches staging/production.
"""
from __future__ import annotations

import getpass
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "spark_b6_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_spark_b6_cluster"
PORT = "55448"
USER = getpass.getuser()

BASE = ROOT / "scripts/service-workflow/disposable_b1_base.sql"
BOUNDARY = ROOT / "supabase/migrations/20261111010000_service_slice0_security_boundary.sql"
TKT = ROOT / "supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql"
B1_SHA = "7a8307395b79df677a96f77cd993a77351b5805c"
B1_PATH = "supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql"
B2_SHA = "8f2acc4e806e70e12e87a24dcbebaef78e63e085"
B2_PATH = "supabase/migrations/20261111220000_service_workflow_b2_assignment.sql"
CHAIN = [
    ROOT / "supabase/migrations/20261112150000_service_workflow_security_remediation.sql",
    ROOT / "supabase/migrations/20261112170000_service_tickets_staff_select_via_caller_role.sql",
    ROOT / "supabase/migrations/20261112171000_profiles_select_own_for_role_routing.sql",
    ROOT / "supabase/migrations/20261112171100_profiles_select_staff_directory_for_assignment.sql",
    ROOT / "supabase/migrations/20261112180000_service_workflow_b3_visit_execution.sql",
    ROOT / "supabase/migrations/20261112190000_service_workflow_b3_visit_corrections.sql",
    ROOT / "supabase/migrations/20261112194500_service_workflow_b3_safety_path_final.sql",
    ROOT / "supabase/migrations/20261112200000_service_workflow_b3_f_b3_02_ack_binding.sql",
    ROOT / "supabase/migrations/20261112201500_service_workflow_b3_f_b3_03_lock_order.sql",
    ROOT / "supabase/migrations/20261112210000_service_workflow_b4_report_submission.sql",
    ROOT / "supabase/migrations/20261113013000_service_workflow_b4_attachment_insert_definer.sql",
    ROOT / "supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql",
    ROOT / "supabase/migrations/20261115140000_service_workflow_b5_f_b5_01_02_correction.sql",
    ROOT / "supabase/migrations/20261115150000_service_workflow_b5_staging_b5_01_review_select.sql",
    ROOT / "supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql",
    ROOT / "supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql",
    ROOT / "supabase/migrations/20261115171000_service_workflow_b6_integrity_targeting.sql",
]
SPARK_BATT = ROOT / "scripts/service-workflow/spark_b6_battery.sql"
CURSOR_BATT = ROOT / "scripts/service-workflow/disposable_b6_battery.sql"


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


def counts(table: str) -> dict[str, int]:
    r = psql(
        "spark_b6",
        f"SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
        f"COUNT(*) FILTER (WHERE status='FAIL') AS fail FROM public.{table};",
    )
    for ln in r.stdout.splitlines():
        if "|" in ln and not ln.startswith("-") and "pass" not in ln.lower():
            parts = [p.strip() for p in ln.split("|")]
            if len(parts) >= 2 and parts[0].isdigit():
                return {"pass": int(parts[0]), "fail": int(parts[1])}
    return {"pass": -1, "fail": -1}


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
         "-l", str(OUT_DIR / "spark_b6_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        raise SystemExit("pg start failed")
    try:
        return run_all()
    finally:
        subprocess.run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
                       capture_output=True)
        shutil.rmtree(DATADIR, ignore_errors=True)


def run_all() -> int:
    db = "spark_b6"
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(r.stderr)

    apply(db, BASE, "base")
    apply(db, BOUNDARY, "boundary")
    lines = TKT.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    tkt = OUT_DIR / "_spk6_tkt_section2.sql"
    tkt.write_text("".join(lines[start:]), encoding="utf-8")
    apply(db, tkt, "ticket-number")
    b1f = OUT_DIR / "_spk6_b1.sql"
    git_show(B1_SHA, B1_PATH, b1f)
    apply(db, b1f, "B1")
    b2f = OUT_DIR / "_spk6_b2.sql"
    git_show(B2_SHA, B2_PATH, b2f)
    apply(db, b2f, "B2")
    for path in CHAIN:
        apply(db, path, path.name)

    apply(db, SPARK_BATT, "spark B6 battery")
    spark_rows = psql(db, "SELECT check_id || '|' || status || '|' || detail FROM public.spk6_eval ORDER BY 1;")
    spark_c = counts("spk6_eval")

    apply(db, CURSOR_BATT, "cursor B6 battery")
    cursor_rows = psql(db, "SELECT check_id || '|' || status || '|' || detail FROM public.b6_eval ORDER BY 1;")
    cursor_c = counts("b6_eval")

    sha = impl_sha()
    ok = spark_c["fail"] == 0 and spark_c["pass"] > 0 and cursor_c["fail"] == 0
    payload = {
        "ok": ok,
        "correction_sha": sha,
        "blocked_baseline": "ec00b692af10629ed5ee506bbb35762ea5ea00a8",
        "spark_b6": {"counts": spark_c, "rows": spark_rows.stdout},
        "cursor_b6": {"counts": cursor_c, "rows": cursor_rows.stdout},
        "notes": [
            "Disposable only — no staging apply",
            "Harness committed under scripts/service-workflow/",
            "Matrix: docs/operations/service-workflow/b6_ack_matrix.md",
        ],
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("=== Spark B6 ===")
    print(spark_rows.stdout)
    print(spark_c)
    print("=== Cursor B6 ===")
    print(cursor_c)
    print("wrote", OUT)
    print("VERDICT", "PASS" if ok else "FAIL", "sha", sha)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
