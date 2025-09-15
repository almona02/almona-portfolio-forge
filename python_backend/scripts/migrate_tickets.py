"""Legacy Ticket Migration Script

Safely migrates records from old 'tickets' table to new 'service_tickets'.
Features:
- Dry run support
- Idempotent (skips previously migrated rows using legacy_id mapping)
- Batches inserts
- Basic field normalization

Environment Variables Required:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_KEY

Usage:
  python migrate_tickets.py --dry-run
  python migrate_tickets.py --commit
"""
from __future__ import annotations

import os
import sys
import argparse
from datetime import datetime
from typing import List, Dict, Any

from supabase import create_client, Client  # type: ignore

BATCH_SIZE = 100


def env(key: str, default: str | None = None) -> str:
    val = os.getenv(key, default)
    if val is None:
        raise RuntimeError(f"Missing required env var: {key}")
    return val


def get_client() -> Client:
    url = env("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or env("SUPABASE_KEY")
    return create_client(url, key)


def fetch_legacy_tickets(client: Client) -> List[Dict[str, Any]]:
    resp = client.table("tickets").select("*").execute()
    return resp.data or []


def already_migrated_lookup(client: Client) -> set[str]:
    # If previous migrations stored legacy id in a column
    # (e.g. legacy_ticket_id) adjust below; for now detect by source field.
    # adjust below; for now detect by source field.
    resp = (
        client.table("service_tickets")
        .select("legacy_ticket_id")
        .not_.is_("legacy_ticket_id", None)
        .execute()
    )
    migrated = set()
    if resp.data:
        for row in resp.data:
            legacy_id = row.get("legacy_ticket_id")
            if legacy_id:
                migrated.add(str(legacy_id))
    return migrated


def normalize_ticket(old: Dict[str, Any]) -> Dict[str, Any]:
    # Map old schema to new schema keys.
    category = "support"  # default classification for legacy
    priority = old.get("priority") or "medium"
    status = old.get("status") or "open"

    return {
        "legacy_ticket_id": old.get("id"),
        "user_id": old.get("user_id"),
        "title": old.get("title") or "Untitled",
        "description": old.get("description"),
        "status": status,
        "priority": priority,
        "category": category,
        "source": "legacy_migration",
        "machine_id": old.get("machine_id"),
        # preserve created/updated timestamps if present; else now
        "created_at": old.get("created_at") or datetime.utcnow().isoformat(),
        "updated_at": old.get("updated_at") or datetime.utcnow().isoformat(),
    }


def batch_insert(client: Client, rows: List[Dict[str, Any]]) -> int:
    if not rows:
        return 0
    resp = client.table("service_tickets").insert(rows).execute()
    if resp.data is None:
        raise RuntimeError("Insert returned no data")
    return len(resp.data)


def migrate(dry_run: bool) -> None:
    client = get_client()
    legacy = fetch_legacy_tickets(client)
    if not legacy:
        print("No legacy tickets found. Nothing to do.")
        return

    migrated_ids = already_migrated_lookup(client)
    to_migrate: List[Dict[str, Any]] = []

    for old in legacy:
        legacy_id = str(old.get("id"))
        if legacy_id in migrated_ids:
            continue
        to_migrate.append(normalize_ticket(old))

    total = len(to_migrate)
    if total == 0:
        print("All legacy tickets already migrated.")
        return

    print(f"Prepared {total} tickets for migration (dry_run={dry_run}).")

    if dry_run:
        sample = to_migrate[:3]
        print("Sample transformed rows:")
        for row in sample:
            print(row)
        return

    # Commit phase - batch inserts
    inserted = 0
    batch: List[Dict[str, Any]] = []
    for row in to_migrate:
        batch.append(row)
        if len(batch) >= BATCH_SIZE:
            inserted += batch_insert(client, batch)
            print(f"Inserted batch. Total inserted: {inserted}")
            batch = []
    if batch:
        inserted += batch_insert(client, batch)
        print(f"Inserted final batch. Total inserted: {inserted}")

    print("Migration complete.")


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate legacy tickets")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--dry-run", action="store_true", help="Show planned changes"
    )
    group.add_argument(
        "--commit", action="store_true", help="Execute migration"
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    migrate(dry_run=args.dry_run)
