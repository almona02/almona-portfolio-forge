#!/usr/bin/env python3
"""FR-1 local rehearsal: encrypted logical DB export (production read path).

Credentials: ONLY from secure drop-slot file prod_db_url.txt (never argv chat/logs).
Enforces default_transaction_read_only=on for the session.
Performs no DML/DDL. Does not print or write credentials.
Does not use prod_service_role.txt (Storage is a separate script).
"""
from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlparse, urlunparse

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
        raise SystemExit(f"missing credential file: {name} under drop-slot")
    val = path.read_text(encoding="utf-8").strip()
    if not val or val == "[SENSITIVE]":
        raise SystemExit(f"credential file unusable (placeholder/empty): {name}")
    return val


def _redact(text: str, secrets: list[str]) -> str:
    out = text
    for s in secrets:
        if s:
            out = out.replace(s, "<redacted>")
    return out


def _uri_with_read_only(uri: str) -> str:
    """Append/overrides options so the session defaults to read-only."""
    # libpq supports options=-c%20default_transaction_read_only%3Don
    opt = "default_transaction_read_only=on"
    if "default_transaction_read_only" in uri:
        return uri
    sep = "&" if "?" in uri else "?"
    # Also set via application_name for audit trails on the server side
    return f"{uri}{sep}options=-c%20{quote(opt)}&application_name=fr1_rehearsal_pg_dump_ro"


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    uri = _read_secret("prod_db_url.txt")
    secrets = [uri]
    # Optional password file merge without logging
    pw_path = SECURE / "prod_db_password.txt"
    if pw_path.is_file():
        pw = pw_path.read_text(encoding="utf-8").strip()
        if pw and pw != "[SENSITIVE]":
            secrets.append(pw)
            parsed = urlparse(uri)
            if parsed.password is None and parsed.username:
                netloc = f"{parsed.username}:{quote(pw)}@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"
                uri = urlunparse(parsed._replace(netloc=netloc))
                secrets.append(uri)

    uri_ro = _uri_with_read_only(uri)
    secrets.append(uri_ro)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dump = SECURE / f"prod-shfsebdncjnncqqnewfj-{stamp}.dump"

    cmd = [
        str(PGDUMP),
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--dbname",
        uri_ro,
    ]
    for s in SCHEMAS:
        cmd.extend(["--schema", s])
    cmd.extend(["--file", str(dump)])

    env = os.environ.copy()
    # Prefer URI embedding; clear PGPASSWORD so it cannot leak via env dumps
    env.pop("PGPASSWORD", None)
    # Belt-and-suspenders for libpq
    env["PGOPTIONS"] = "-c default_transaction_read_only=on"

    # Do not pass URI on a logged command line in our prints — only to pg_dump via argv locally
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        err = _redact(r.stderr or r.stdout or "", secrets)
        (ART / "export_error.txt").write_text(err[-4000:], encoding="utf-8")
        dump.unlink(missing_ok=True)
        raise SystemExit(
            f"pg_dump failed rc={r.returncode} (details redacted in .artifacts/fr1-rc/rehearsal/export_error.txt)"
        )

    digest = hashlib.sha256(dump.read_bytes()).hexdigest()
    (ART / "manifest-sha256.txt").write_text(f"{digest}  {dump.name}\n", encoding="utf-8")
    (ART / "export_mode.txt").write_text(
        "tool=pg_dump\nmutations=none\nread_only=default_transaction_read_only=on\n"
        "schemas=public,auth,storage,supabase_migrations\n"
        "credentials_logged=no\n",
        encoding="utf-8",
    )

    gpg = subprocess.run(["gpg", "--version"], capture_output=True)
    if gpg.returncode == 0:
        enc = Path(str(dump) + ".gpg")
        er = subprocess.run(
            [
                "gpg",
                "--batch",
                "--yes",
                "--symmetric",
                "--cipher-algo",
                "AES256",
                "-o",
                str(enc),
                str(dump),
            ],
            capture_output=True,
            text=True,
        )
        if er.returncode == 0:
            dump.unlink(missing_ok=True)
            print(f"export_ok encrypted={enc.name} sha256_prefix={digest[:16]}")
            return 0
        print("export_ok plaintext_kept encrypt_manually")
    else:
        print("export_ok plaintext_kept encrypt_manually")
    print(f"dump_name={dump.name} sha256_prefix={digest[:16]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
