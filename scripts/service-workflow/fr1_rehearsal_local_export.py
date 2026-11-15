#!/usr/bin/env python3
"""FR-1 local rehearsal: encrypted logical export from production (read-intended).

Reads credentials ONLY from the secure drop-slot (never argv/env logs).
Does not reset credentials. Does not print secrets.
"""
from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SECURE = Path(
    os.environ.get(
        "FR1_REHEARSAL_SECURE",
        r"C:\Users\bobbi\AppData\Local\Cursor\AgentStores\cursor_agent_stores\u294861541\files\slice0\fr1-rehearsal",
    )
)
ART = ROOT / ".artifacts" / "fr1-rc" / "rehearsal"
PGDUMP = Path(r"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe")
SCHEMAS = ["public", "auth", "storage", "supabase_migrations"]


def _read_secret(name: str) -> str:
    path = SECURE / name
    if not path.is_file():
        raise SystemExit(f"missing credential file: {path}")
    val = path.read_text(encoding="utf-8").strip()
    if not val or val == "[SENSITIVE]":
        raise SystemExit(f"credential file unusable (placeholder/empty): {name}")
    return val


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    uri = _read_secret("prod_db_url.txt")
    # Optional: if URI lacks password and prod_db_password.txt exists, do not log it.
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dump = SECURE / f"prod-shfsebdncjnncqqnewfj-{stamp}.dump"
    cmd = [
        str(PGDUMP),
        uri,
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--verbose",
    ]
    for s in SCHEMAS:
        cmd.extend(["--schema", s])
    cmd.extend(["--file", str(dump)])
    # Never log URI. Capture stderr without argv reprint of secrets.
    env = os.environ.copy()
    env.pop("PGPASSWORD", None)
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        # Redact any accidental URI echo from pg_dump messages
        err = r.stderr.replace(uri, "<redacted-uri>")
        (ART / "export_error.txt").write_text(err[-4000:], encoding="utf-8")
        raise SystemExit(f"pg_dump failed rc={r.returncode} (see .artifacts/fr1-rc/rehearsal/export_error.txt)")
    digest = hashlib.sha256(dump.read_bytes()).hexdigest()
    (ART / "manifest-sha256.txt").write_text(f"{digest}  {dump.name}\n", encoding="utf-8")
    # Encrypt with gpg symmetric if available (operator passphrase via pinentry — not logged)
    gpg = subprocess.run(["gpg", "--version"], capture_output=True)
    if gpg.returncode == 0:
        enc = Path(str(dump) + ".gpg")
        er = subprocess.run(
            ["gpg", "--batch", "--yes", "--symmetric", "--cipher-algo", "AES256", "-o", str(enc), str(dump)],
            capture_output=True,
            text=True,
        )
        if er.returncode == 0:
            dump.unlink(missing_ok=True)
            print(f"export_ok encrypted={enc.name} sha256={digest[:16]}…")
            return 0
        print("export_ok plaintext_dump_kept gpg_encrypt_failed_use_manual_age")
    else:
        print("export_ok plaintext_dump_present_encrypt_manually")
    print(f"dump={dump.name} sha256={digest[:16]}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
