#!/usr/bin/env python3
"""Cursor evidence: Lane A disposable battery. Does NOT touch staging/production."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_routines_base.sql"
MIG = ROOT / "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_routines_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_routines_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_ra_cluster"
PORT = "55456"
PGUSER = "postgres"


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            str(PGBIN / "psql"),
            f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={db} connect_timeout=5",
            "-v", "ON_ERROR_STOP=1", "-f", str(path),
        ],
        text=True, capture_output=True, check=False,
    )


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            str(PGBIN / "psql"),
            f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={db} connect_timeout=5",
            "-v", "ON_ERROR_STOP=1", "-c", sql,
        ],
        text=True, capture_output=True, check=False,
    )


def apply(db: str, path: Path, label: str) -> None:
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-4000:]}")


def wait_ready(retries: int = 30) -> None:
    for _ in range(retries):
        r = psql("postgres", "SELECT 1")
        if r.returncode == 0:
            return
        time.sleep(0.5)
    raise SystemExit("postgres did not become ready")


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
    log = DATADIR / "pg.log"
    print(f"starting disposable postgres on {PORT}…", flush=True)
    subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "-l", str(log), "-o", f"-p {PORT} -c listen_addresses=127.0.0.1", "start", "-w", "-t", "30"],
        check=True, capture_output=True,
    )
    wait_ready()
    db = "routines_lane_a"
    print("recreating database…", flush=True)
    psql("postgres", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db}' AND pid <> pg_backend_pid();")
    psql("postgres", f"DROP DATABASE IF EXISTS {db};")
    psql("postgres", f"CREATE DATABASE {db};")
    try:
        print("applying base…", flush=True)
        apply(db, BASE, "base")
        print("applying lane-a migration…", flush=True)
        apply(db, MIG, "lane-a migration")
        print("running battery…", flush=True)
        r = psql_file(db, BATTERY)
        if r.returncode != 0:
            raise SystemExit(f"battery failed:\n{r.stderr}\n{r.stdout[-5000:]}")
        rows = []
        for ln in r.stdout.splitlines():
            parts = [p.strip() for p in ln.split("|")]
            if len(parts) == 3 and parts[0].startswith("RA-"):
                rows.append({"check_id": parts[0], "status": parts[1], "detail": parts[2]})
        pass_n = sum(1 for x in rows if x["status"] == "PASS")
        fail_n = sum(1 for x in rows if x["status"] == "FAIL")
        payload = {
            "label": "Cursor evidence",
            "not_spark": True,
            "contract_tip": "1350b749ffd999ef3206c9733f0bcfb47b483ce2",
            "implementation_sha": impl_sha(),
            "migration": str(MIG.relative_to(ROOT)),
            "counts": {"PASS": pass_n, "FAIL": fail_n, "TOTAL": len(rows)},
            "checks": rows,
            "raw_tail": r.stdout[-2500:],
        }
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps(payload["counts"], indent=2))
        print(f"wrote {OUT}")
        return 0 if fail_n == 0 and pass_n > 0 else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    sys.exit(main())
