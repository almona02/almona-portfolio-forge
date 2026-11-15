#!/usr/bin/env python3
"""Spark independent B5 verification harness (disposable PG; no staging).

Applies frozen migration chain through B5 @ f8fb9358 blob, runs:
  - Cursor disposable_b5_battery (access-holder baseline, recorded separately)
  - Spark independent probes
  - Concurrent race probes
  - B4 disposable regression under B5
Writes SHA-bound JSON under .artifacts and spark-probes/.
"""
from __future__ import annotations

import getpass
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FREEZE = "f8fb9358e976050089cd199579a99bc0a098e0c2"
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
B4FIX = ROOT / "supabase/migrations/20261113013000_service_workflow_b4_attachment_insert_definer.sql"
B5 = ROOT / "supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql"
B5_BATTERY = ROOT / "scripts/service-workflow/disposable_b5_battery.sql"
B4_BATTERY = ROOT / "scripts/service-workflow/disposable_b4_battery.sql"
SPARK = ROOT / "docs/operations/service-workflow/spark-probes/B5_SPARK_INDEPENDENT_PROBES.sql"
RACES = ROOT / "scripts/service-workflow/spark_b5_concurrent_races.py"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
SPARK_OUT = ROOT / "docs/operations/service-workflow/spark-probes/B5_SPARK_INDEPENDENT_RESULTS_f8fb9358.json"
CURSOR_OUT = OUT_DIR / "CURSOR_B5_ACCESS_HOLDER_f8fb9358.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_spark_b5_cluster"
PORT = "55446"
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


def parse_counts(sql_out: str) -> dict[str, int]:
    for ln in sql_out.splitlines():
        ln = ln.strip()
        if "|" in ln and not ln.startswith("-") and "pass" not in ln.lower():
            parts = [p.strip() for p in ln.split("|")]
            if parts and parts[0].isdigit():
                return {
                    "pass": int(parts[0]),
                    "fail": int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else -1,
                    "skip": int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0,
                    "defer": int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0,
                }
    return {"pass": -1, "fail": -1, "skip": -1, "defer": -1}


def extract_freeze_b5() -> Path:
    """Materialize exact freeze blob (LF) so apply ignores working-tree CRLF."""
    r = subprocess.run(
        ["git", "show", f"{FREEZE}:supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql"],
        capture_output=True, cwd=str(ROOT),
    )
    if r.returncode != 0:
        raise SystemExit("freeze migration missing from git object")
    dest = OUT_DIR / "_b5_freeze_f8fb9358.sql"
    dest.write_bytes(r.stdout)
    # Soft check: working tree may only differ by CRLF after core.autocrlf
    live_norm = B5.read_bytes().replace(b"\r\n", b"\n")
    if live_norm != r.stdout.replace(b"\r\n", b"\n"):
        raise SystemExit("WORKING TREE B5 migration content differs from freeze — runtime not frozen")
    return dest


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    b5_freeze = extract_freeze_b5()
    if DATADIR.exists():
        shutil.rmtree(DATADIR)
    r = subprocess.run([str(PGBIN / "initdb"), "-D", str(DATADIR), "-E", "UTF8"],
                       text=True, capture_output=True)
    if r.returncode != 0:
        raise SystemExit(f"initdb failed: {r.stderr}")
    r = subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR),
         "-o", f"-p {PORT} -c listen_addresses=127.0.0.1",
         "-l", str(OUT_DIR / "spark_b5_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        raise SystemExit("pg start failed")
    try:
        return run_all(b5_freeze)
    finally:
        subprocess.run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
                       capture_output=True)
        shutil.rmtree(DATADIR, ignore_errors=True)


def run_all(b5_apply: Path) -> int:
    db = "spark_b5"
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(r.stderr)

    apply(db, BASE, "base")
    apply(db, BOUNDARY, "boundary")
    lines = TKT.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    tkt = OUT_DIR / "_spark_b5_tkt.sql"
    tkt.write_text("".join(lines[start:]), encoding="utf-8")
    apply(db, tkt, "ticket-number")
    b1f = OUT_DIR / "_spark_b5_b1.sql"; git_show(B1_SHA, B1_PATH, b1f); apply(db, b1f, "B1")
    b2f = OUT_DIR / "_spark_b5_b2.sql"; git_show(B2_SHA, B2_PATH, b2f); apply(db, b2f, "B2")
    for path, label in [
        (SEC, "security"), (B3, "B3"), (B3FIX, "B3fix"), (B3SAFE, "B3safe"),
        (B3ACK, "B3ack"), (B3LOCK, "B3lock"), (B4, "B4"), (B4FIX, "B4fix"),
        (b5_apply, "B5@f8fb9358"),
    ]:
        apply(db, path, label)

    # Access-holder battery (recorded separately; not Spark verdict)
    apply(db, B5_BATTERY, "cursor B5 battery")
    b5_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS'), COUNT(*) FILTER (WHERE status='FAIL'), 0, 0 FROM public.b5_eval;",
    )
    b5_rows = psql(db, "SELECT check_id, status, detail FROM public.b5_eval ORDER BY 1;")
    cursor_payload = {
        "role": "cursor_access_holder",
        "bound_sha": FREEZE,
        "counts": parse_counts(b5_counts.stdout),
        "rows": b5_rows.stdout,
    }
    CURSOR_OUT.write_text(json.dumps(cursor_payload, indent=2), encoding="utf-8")

    # Spark probes (need b5_* helpers from battery)
    apply(db, SPARK, "spark probes")
    # Concurrent races append to spark_b5_eval
    rr = subprocess.run(
        [sys.executable, str(RACES), "--port", PORT, "--db", db, "--user", USER],
        text=True, capture_output=True, check=False,
    )
    if rr.returncode != 0:
        print(rr.stderr[-2000:], file=sys.stderr)
        raise SystemExit("concurrent races failed to execute")

    spark_rows = psql(db, "SELECT check_id, status, detail FROM public.spark_b5_eval ORDER BY 1;")
    spark_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS'), COUNT(*) FILTER (WHERE status='FAIL'), "
        "COUNT(*) FILTER (WHERE status='SKIP'), COUNT(*) FILTER (WHERE status='DEFER') "
        "FROM public.spark_b5_eval;",
    )
    spark_fails = psql(db, "SELECT check_id, detail FROM public.spark_b5_eval WHERE status='FAIL' ORDER BY 1;")

    # B4 regression under B5
    apply(db, B4_BATTERY, "B4 regression")
    b4_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS'), COUNT(*) FILTER (WHERE status='FAIL'), "
        "COUNT(*) FILTER (WHERE status='SKIP'), COUNT(*) FILTER (WHERE status='DEFER') "
        "FROM public.b4_eval;",
    )
    b4_fails = psql(db, "SELECT check_id, detail FROM public.b4_eval WHERE status='FAIL' ORDER BY 1;")

    # B6 deferral notes (explicit)
    psql(db, """
      INSERT INTO public.spark_b5_eval(check_id, status, detail) VALUES
        ('SP5-D1_ack_rpc_b6', 'DEFER', 'Acknowledgment RPC intentionally absent until B6'),
        ('SP5-D2_ticket_close_b6', 'DEFER', 'Successful workflow ticket closure intentionally absent until B6')
      ON CONFLICT (check_id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail;
    """)
    spark_rows = psql(db, "SELECT check_id, status, detail FROM public.spark_b5_eval ORDER BY 1;")
    spark_counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS'), COUNT(*) FILTER (WHERE status='FAIL'), "
        "COUNT(*) FILTER (WHERE status='SKIP'), COUNT(*) FILTER (WHERE status='DEFER') "
        "FROM public.spark_b5_eval;",
    )

    c_spark = parse_counts(spark_counts.stdout)
    c_b4 = parse_counts(b4_counts.stdout)
    c_cursor = parse_counts(b5_counts.stdout)
    ok = c_spark["fail"] == 0 and c_b4["fail"] == 0 and c_spark["pass"] > 0

    payload = {
        "ok": ok,
        "bound_sha": FREEZE,
        "handoff_stamp": "1dde50ad6966ace3243696332e1285b88af683db",
        "spark": {"counts": c_spark, "rows": spark_rows.stdout, "fails": spark_fails.stdout},
        "b4_regression_under_b5": {"counts": c_b4, "fails": b4_fails.stdout},
        "cursor_access_holder_ref": str(CURSOR_OUT.relative_to(ROOT)).replace("\\", "/"),
        "cursor_access_holder_counts": c_cursor,
        "migration_order": [
            "disposable_b1_base",
            "20261111010000_service_slice0_security_boundary",
            "20261111200000 ticket_number section",
            "B1@7a830739", "B2@8f2acc4e",
            "20261112150000_security_remediation",
            "B3 chain 180000→201500",
            "20261112210000_b4_report_submission",
            "20261113013000_b4_attachment_insert_definer",
            "20261115120000_b5_manager_review @ f8fb9358",
        ],
        "rpc_signatures": {
            "review_service_report_revision":
                "public.review_service_report_revision(p_revision_id uuid, p_decision text, p_comments text DEFAULT NULL, p_actor_id uuid DEFAULT NULL) RETURNS public.service_report_reviews",
            "get_service_report_for_visit":
                "public.get_service_report_for_visit(p_visit_id uuid) RETURNS jsonb",
        },
        "notes": [
            "No staging apply",
            "B6 acknowledgment/closure deferred",
            "Access-holder battery recorded separately from Spark probes",
        ],
    }
    SPARK_OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("=== Spark B5 independent ===")
    print(spark_rows.stdout)
    print(spark_counts.stdout)
    print("=== B4 under B5 ===")
    print(b4_counts.stdout)
    if b4_fails.stdout.strip() and "0 rows" not in b4_fails.stdout:
        print(b4_fails.stdout)
    print("wrote", SPARK_OUT)
    print("VERDICT", "PASS" if ok else "FAIL", "sha", FREEZE)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
