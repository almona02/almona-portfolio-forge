#!/usr/bin/env python3
"""Concurrent generation race for coverage occurrences. Local disposable only."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_coverage_concurrent_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
PORT = "55459"
PGUSER = "postgres"
DB = "routines_coverage"


def psql(sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            str(PGBIN / "psql.exe" if (PGBIN / "psql.exe").exists() else PGBIN / "psql"),
            "-h", "127.0.0.1", "-p", PORT, "-U", PGUSER, "-d", DB,
            "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql,
        ],
        text=True, capture_output=True, check=False, timeout=60,
        env={**os.environ, "PGCONNECT_TIMEOUT": "5"},
    )


def generate_once(as_of: str, coverage_id: str) -> tuple[int, str]:
    sql = f"""
    SELECT set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
    SELECT public.generate_machine_coverage_occurrences(
      DATE '{as_of}', '{coverage_id}'::uuid, NULL
    )::text;
    """
    r = psql(sql)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def main() -> int:
    # Expect disposable cluster already up from runner, or start via battery leave-up.
    # This script is invoked by run_disposable_coverage_full.py after seed.
    seed = psql(
        """
        SELECT set_config('app.b1_uid', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
        SELECT coverage_id::text FROM (
          SELECT id AS coverage_id FROM public.service_machine_coverages
          WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
        ) s;
        """
    )
    if seed.returncode != 0 or not seed.stdout.strip():
        print("No active coverage to race; run battery seed first", file=sys.stderr)
        return 2
    coverage_id = seed.stdout.strip().splitlines()[-1].strip()
    as_of = "2026-03-15"

    before = psql(
        f"SELECT count(*) FROM public.service_maintenance_occurrences WHERE coverage_id = '{coverage_id}';"
    )
    before_n = int(before.stdout.strip() or "0")

    results = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(generate_once, as_of, coverage_id) for _ in range(8)]
        for fut in as_completed(futs):
            results.append(fut.result())

    after = psql(
        f"SELECT count(*) FROM public.service_maintenance_occurrences WHERE coverage_id = '{coverage_id}';"
    )
    after_n = int(after.stdout.strip() or "0")
    uniq = psql(
        f"""
        SELECT CASE WHEN count(*) = count(DISTINCT sequence) THEN 'ok' ELSE 'dup' END
        FROM public.service_maintenance_occurrences WHERE coverage_id = '{coverage_id}';
        """
    )
    ok = (
        all(rc == 0 for rc, _ in results)
        and uniq.stdout.strip() == "ok"
        and after_n >= before_n
    )
    # Concurrent retries must not create duplicate sequences
    payload = {
        "label": "Cursor coverage concurrent generation",
        "coverage_id": coverage_id,
        "before": before_n,
        "after": after_n,
        "unique_sequences": uniq.stdout.strip(),
        "workers": len(results),
        "all_rc_zero": all(rc == 0 for rc, _ in results),
        "pass": bool(ok),
        "stderr_samples": [out[-300:] for rc, out in results if rc != 0][:3],
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload), flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
