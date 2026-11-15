#!/usr/bin/env python3
"""Local disposable B6 acknowledgment/closure battery (does NOT touch staging)."""
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
B4FIX = ROOT / "supabase/migrations/20261113013000_service_workflow_b4_attachment_insert_definer.sql"
B5 = ROOT / "supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql"
B5FIX = ROOT / "supabase/migrations/20261115140000_service_workflow_b5_f_b5_01_02_correction.sql"
B5SEL = ROOT / "supabase/migrations/20261115150000_service_workflow_b5_staging_b5_01_review_select.sql"
B6 = ROOT / "supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql"
B6FIX = ROOT / "supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_b6_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_b6_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_b6_cluster"
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


def impl_sha() -> str:
    r = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=str(ROOT))
    return r.stdout.strip()


def parse_counts(sql_out: str) -> dict[str, int]:
    lines = [ln.strip() for ln in sql_out.splitlines() if ln.strip()]
    for ln in lines:
        if "|" in ln and not ln.startswith("-") and "pass" not in ln.lower() and "count" not in ln.lower():
            parts = [p.strip() for p in ln.split("|")]
            if all(p.isdigit() for p in parts[:2]):
                return {
                    "pass": int(parts[0]),
                    "fail": int(parts[1]),
                    "skip": int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0,
                    "defer": int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0,
                }
    return {"pass": -1, "fail": -1, "skip": -1, "defer": -1}


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
         "-l", str(OUT_DIR / "b6_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        raise SystemExit("pg start failed (see b6_cluster.log)")
    try:
        return run_all()
    finally:
        subprocess.run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
                       capture_output=True)
        shutil.rmtree(DATADIR, ignore_errors=True)


def run_all() -> int:
    db = "b6_disposable"
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(f"db setup failed: {r.stderr}")

    apply(db, BASE, "base")
    apply(db, BOUNDARY, "boundary")
    lines = TKT.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    tkt = OUT_DIR / "_b6_tkt_section2.sql"
    tkt.write_text("".join(lines[start:]), encoding="utf-8")
    apply(db, tkt, "ticket-number")

    b1f = OUT_DIR / "_b6_b1_frozen.sql"
    git_show(B1_SHA, B1_PATH, b1f)
    apply(db, b1f, "B1")
    b2f = OUT_DIR / "_b6_b2_frozen.sql"
    git_show(B2_SHA, B2_PATH, b2f)
    apply(db, b2f, "B2")
    apply(db, SEC, "security remediation")
    apply(db, B3, "B3")
    apply(db, B3FIX, "B3 corrections")
    apply(db, B3SAFE, "B3 safety")
    apply(db, B3ACK, "B3 ack binding")
    apply(db, B3LOCK, "B3 lock order")
    apply(db, B4, "B4 report submission")
    apply(db, B4FIX, "B4 attachment DEFINER")
    apply(db, B5, "B5 manager review")
    apply(db, B5FIX, "B5 F-B5-01/02 correction")
    apply(db, B5SEL, "B5 review SELECT")
    apply(db, B6, "B6 acknowledgment/closure")
    apply(db, B6FIX, "B6 F-B6-03/04/05 correction")
    apply(db, BATTERY, "B6 battery")

    rows = psql(db, "SELECT check_id, status, detail FROM public.b6_eval ORDER BY 1;")
    counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
        "COUNT(*) FILTER (WHERE status='FAIL') AS fail, "
        "0 AS skip, 0 AS defer FROM public.b6_eval;",
    )
    fails = psql(db, "SELECT check_id, detail FROM public.b6_eval WHERE status='FAIL' ORDER BY 1;")
    print("=== B6 battery ===")
    print(rows.stdout)
    print(counts.stdout)
    if fails.stdout.strip() and "0 rows" not in fails.stdout:
        print(fails.stdout)

    sha = impl_sha()
    c = parse_counts(counts.stdout)
    ok = c["fail"] == 0 and c["pass"] > 0
    payload = {
        "ok": ok,
        "implementation_sha": sha,
        "b6": {"counts": c, "rows": rows.stdout, "fails": fails.stdout},
        "notes": [
            "Local disposable only — no staging apply",
            "UI Vitest is separate",
            "No calendar hardcode for unavailable; attributable evidence only",
        ],
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("wrote", OUT)
    print("VERDICT", "PASS" if ok else "FAIL", "sha", sha)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
