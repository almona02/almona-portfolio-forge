#!/usr/bin/env python3
"""Local disposable FR-1 battery (Slice0+MI+RLS+share/privacy). No B1–B7. No remote apply."""
from __future__ import annotations

import getpass
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_fr1_base.sql"
BOUNDARY = ROOT / "supabase/migrations/20261111010000_service_slice0_security_boundary.sql"
MI = ROOT / "supabase/migrations/20261111180000_machine_identity_pr1.sql"
MI_PLATE = ROOT / "supabase/migrations/20261111190000_machine_identity_missing_serial_plate_evidence.sql"
TKT = ROOT / "supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql"
RLS = ROOT / "supabase/migrations/20261111201000_service_tickets_rls_enablement.sql"
F704 = ROOT / "supabase/migrations/20261115190000_fr1_f_b7_04_null_auth.sql"
F703 = ROOT / "supabase/migrations/20261115190100_fr1_f_b7_03_share_audit.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_fr1_battery.sql"
OUT_DIR = ROOT / ".artifacts/fr1-rc"
OUT = OUT_DIR / "disposable_fr1_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_fr1_cluster"
PORT = "55447"
USER = getpass.getuser()


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True, capture_output=True, check=False,
    )


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-f", str(path)],
        text=True, capture_output=True, check=False,
    )


def apply(db: str, path: Path, label: str) -> None:
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-4000:]}")


def impl_sha() -> str:
    r = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=str(ROOT))
    return r.stdout.strip()


def parse_counts(sql_out: str) -> dict[str, int]:
    lines = [ln.strip() for ln in sql_out.splitlines() if ln.strip()]
    for ln in lines:
        if "|" in ln and not ln.startswith("-") and "pass" not in ln.lower() and "count" not in ln.lower():
            parts = [p.strip() for p in ln.split("|")]
            if len(parts) >= 2 and all(p.isdigit() for p in parts[:2]):
                return {
                    "pass": int(parts[0]),
                    "fail": int(parts[1]),
                    "total": int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else -1,
                }
    return {"pass": -1, "fail": -1, "total": -1}


def wait_ready(timeout_s: float = 20.0) -> None:
    deadline = time.time() + timeout_s
    last = ""
    while time.time() < deadline:
        r = psql("postgres", "SELECT 1;")
        if r.returncode == 0:
            return
        last = r.stderr
        time.sleep(0.25)
    raise SystemExit(f"postgres not ready on {PORT}: {last}")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if DATADIR.exists():
        shutil.rmtree(DATADIR)
    r = subprocess.run(
        [str(PGBIN / "initdb"), "-D", str(DATADIR), "-E", "UTF8", "-U", USER],
        text=True, capture_output=True,
    )
    if r.returncode != 0:
        raise SystemExit(f"initdb failed: {r.stderr}")
    r = subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR),
         "-o", f"-p {PORT} -c listen_addresses=127.0.0.1",
         "-l", str(OUT_DIR / "fr1_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    if r.returncode != 0:
        raise SystemExit("pg start failed (see .artifacts/fr1-rc/fr1_cluster.log)")
    try:
        return run_all()
    finally:
        subprocess.run(
            [str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
            capture_output=True,
        )
        shutil.rmtree(DATADIR, ignore_errors=True)


def run_all() -> int:
    wait_ready()
    db = "fr1_disposable"
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(f"db setup failed: {r.stderr}")

    stack = [
        (BASE, "base"),
        (BOUNDARY, "Slice0 A"),
        (MI, "MI C"),
        (MI_PLATE, "MI D"),
        (TKT, "MI E"),
        (RLS, "FR-1 RLS"),
        (F704, "F-B7-04"),
        (F703, "F-B7-03"),
        (BATTERY, "FR-1 battery"),
    ]
    for path, label in stack:
        apply(db, path, label)

    rows = psql(db, "SELECT id, ok, detail FROM public.fr1_eval ORDER BY 1;")
    counts = psql(
        db,
        "SELECT count(*) FILTER (WHERE ok) AS pass, "
        "count(*) FILTER (WHERE NOT ok) AS fail, "
        "count(*) AS total FROM public.fr1_eval;",
    )
    fails = psql(db, "SELECT id, detail FROM public.fr1_eval WHERE NOT ok ORDER BY 1;")
    print("=== FR-1 battery ===")
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
        "fr1": {"counts": c, "rows": rows.stdout, "fails": fails.stdout},
        "stack": [label for _, label in stack],
        "notes": [
            "Local disposable only — no staging/production apply",
            "No B1–B7 workflow migrations in apply stack",
            "Backup/PITR remains unresolved production prerequisite",
        ],
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("wrote", OUT)
    print("VERDICT", "PASS" if ok else "FAIL", "sha", sha)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
