#!/usr/bin/env python3
"""Local disposable Machine Identity PR1 migration + battery.

Tests two starting states:
  - production-shaped: machines exists with UNIQUE(serial_number) NOT NULL
  - staging-shaped: machines absent; service_tickets lacks machine_id

Does NOT apply to staging/production remotes.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261111180000_machine_identity_pr1.sql"
BATTERY = ROOT / "scripts/machine-identity/disposable_pr1_battery.sql"
OUT = ROOT / ".artifacts/slice0/machine-identity/disposable_pr1_results.json"
PSQL = [r"C:\Program Files\PostgreSQL\17\bin\psql", "-h", "127.0.0.1", "-p", "55434", "-U", "postgres"]


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        PSQL + ["-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True,
        capture_output=True,
        check=False,
    )


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        PSQL + ["-d", db, "-v", "ON_ERROR_STOP=1", "-f", str(path)],
        text=True,
        capture_output=True,
        check=False,
    )


PROD_SHAPED = r"""
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_date date,
  warranty_expiry date,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),
  installation_date date,
  warranty_valid boolean DEFAULT false,
  photo_urls text[]
);
CREATE INDEX idx_machines_owner_id ON public.machines(owner_id);
CREATE TABLE public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  title text,
  description text,
  type text,
  priority text,
  status text,
  assigned_to uuid,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  machine_serial_number text,
  machine_model text,
  updated_at timestamptz DEFAULT timezone('utc', now())
);
"""

STAGING_SHAPED = r"""
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
-- machines intentionally absent
CREATE TABLE public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  title text,
  description text,
  type text,
  priority text,
  status text,
  assigned_to uuid,
  machine_serial_number text,
  machine_model text,
  updated_at timestamptz DEFAULT timezone('utc', now())
);
"""


def prepare(db: str, shaped_sql: str) -> None:
    psql(
        "postgres",
        f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db}' AND pid <> pg_backend_pid();",
    )
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(f"create db failed ({stmt}): {r.stderr}")

    # shaped SQL may be multi-statement; write temp file to avoid implicit txn issues
    shape_path = OUT.parent / f"_shape_{db}.sql"
    shape_path.write_text(shaped_sql, encoding="utf-8")
    r = psql_file(db, shape_path)
    if r.returncode != 0:
        raise SystemExit(f"shape {db} failed: {r.stderr}\n{r.stdout}")
    r = psql_file(db, MIGRATION)
    if r.returncode != 0:
        raise SystemExit(f"migration {db} failed: {r.stderr}\n{r.stdout}")


def run_battery(db: str) -> dict:
    r = psql_file(db, BATTERY)
    out = (r.stdout or "") + "\n" + (r.stderr or "")
    if r.returncode != 0:
        return {"ok": False, "output": out}
    fails = []
    passes = []
    for line in out.splitlines():
        # parse simple SELECT output lines with PASS/FAIL in body
        if "FAIL" in line and "status" not in line.lower():
            fails.append(line.strip())
        if "| PASS |" in line or "\tPASS\t" in line:
            passes.append(line.strip())
    # Also query counts
    c = psql(db, "SELECT check_id, status FROM mi_eval ORDER BY 1;")
    # mi_eval is temp — gone. Re-run summary from stdout table.
    summary = psql(
        db,
        """
        SELECT
          (SELECT COUNT(*) FROM public.machines) AS machines,
          (SELECT COUNT(*) FROM public.machine_identity_events) AS events,
          (SELECT COUNT(*) FROM public.machine_duplicate_cases) AS cases,
          EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='service_tickets' AND column_name='machine_id'
          ) AS has_ticket_machine_id,
          EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname='machines_serial_number_key'
          ) AS still_has_serial_unique;
        """,
    )
    # Re-exec battery into a persistent results table
    psql(
        db,
        """
        CREATE TABLE IF NOT EXISTS mi_pr1_results (
          check_id text PRIMARY KEY,
          status text NOT NULL,
          detail text
        );
        TRUNCATE mi_pr1_results;
        """,
    )
    # Re-run battery capturing into persistent table by wrapping — simpler: parse from file run with modified end
    return {
        "ok": r.returncode == 0,
        "output": out,
        "post_counts": c.stdout if False else summary.stdout,
        "stderr": summary.stderr,
    }


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    results = {}
    for name, shape in (
        ("mi_pr1_prodshaped", PROD_SHAPED),
        ("mi_pr1_stagingshaped", STAGING_SHAPED),
    ):
        print("=== preparing", name)
        prepare(name, shape)
        print("=== battery", name)
        # Persist results: run battery SQL then copy from temp — battery uses temp mi_eval.
        # Patch: execute battery body ending with INSERT into persistent table.
        persist = BATTERY.read_text(encoding="utf-8").replace(
            "SELECT check_id, status, detail FROM mi_eval ORDER BY check_id;\n"
            "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail FROM mi_eval;",
            """
CREATE TABLE IF NOT EXISTS public.mi_pr1_results (check_id text PRIMARY KEY, status text, detail text);
TRUNCATE public.mi_pr1_results;
INSERT INTO public.mi_pr1_results SELECT check_id, status, detail FROM mi_eval;
SELECT check_id, status, detail FROM public.mi_pr1_results ORDER BY check_id;
SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail FROM public.mi_pr1_results;
""",
        )
        tmp = OUT.parent / f"_battery_{name}.sql"
        tmp.write_text(persist, encoding="utf-8")
        r = psql_file(name, tmp)
        print(r.stdout)
        if r.returncode != 0:
            print(r.stderr, file=sys.stderr)
            results[name] = {"ok": False, "stderr": r.stderr, "stdout": r.stdout}
            continue
        q = psql(
            name,
            "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM public.mi_pr1_results ORDER BY check_id) t;"
            "SELECT pass, fail FROM ("
            " SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass,"
            " COUNT(*) FILTER (WHERE status='FAIL') AS fail FROM public.mi_pr1_results) s;",
        )
        rows = psql(name, "SELECT check_id, status, detail FROM public.mi_pr1_results ORDER BY 1;")
        counts = psql(
            name,
            "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
            "COUNT(*) FILTER (WHERE status='FAIL') AS fail FROM public.mi_pr1_results;",
        )
        fail_n = 0
        for line in counts.stdout.splitlines():
            parts = [p.strip() for p in line.split("|")]
            if len(parts) == 2 and parts[0].isdigit():
                fail_n = int(parts[1])
        results[name] = {
            "ok": fail_n == 0 and r.returncode == 0,
            "counts_stdout": counts.stdout,
            "rows_stdout": rows.stdout,
        }
        print(counts.stdout)

    OUT.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("wrote", OUT)
    return 0 if all(v.get("ok") for v in results.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
