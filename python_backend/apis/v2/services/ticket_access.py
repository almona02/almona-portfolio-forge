"""Approved ticket read / message visibility scope for service-key-backed Python paths.

Mirrors `admin_private.can_read_ticket_workflow` and `ticket_messages_select_scoped`:
admin/support retain broad scope; technician access is assignment / job / historical
attendance only; sales_rep and customers are ownership-scoped (plus ticket assignee
when present). Role alone never grants “all tickets”.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Sequence, Set
from uuid import UUID

BROAD_STAFF_ROLES = frozenset({"admin", "support"})


def _uid(value: Any) -> str:
    return str(value)


def is_internal_message(row: Dict[str, Any]) -> bool:
    if bool(row.get("is_internal_note")):
        return True
    return str(row.get("message_type") or "message") == "internal_note"


def can_view_internal_messages(
    *,
    role: Optional[str],
    ticket: Dict[str, Any],
    user_id: UUID,
) -> bool:
    """Staff-visible internal notes: admin/support or current ticket assignee."""
    if role in BROAD_STAFF_ROLES:
        return True
    return ticket.get("assigned_to") == _uid(user_id)


def can_read_ticket_record(
    *,
    ticket: Dict[str, Any],
    user_id: UUID,
    role: Optional[str],
    job_assigned: bool = False,
    historical_attendee: bool = False,
) -> bool:
    uid = _uid(user_id)
    if ticket.get("user_id") == uid:
        return True
    if role in BROAD_STAFF_ROLES:
        return True
    if ticket.get("assigned_to") == uid:
        return True
    if role == "technician" and (job_assigned or historical_attendee):
        return True
    return False


def customer_safe_message(row: Dict[str, Any]) -> Dict[str, Any]:
    """Strip internal-only fields from a non-internal message payload."""
    safe = {
        "id": row.get("id"),
        "ticket_id": row.get("ticket_id"),
        "author_id": row.get("author_id"),
        "message": row.get("message"),
        "message_type": row.get("message_type"),
        "is_internal_note": False,
        "attachments": row.get("attachments") or [],
        "created_at": row.get("created_at"),
    }
    if "spare_parts_details" in row and row.get("spare_parts_details") is not None:
        safe["spare_parts_details"] = row.get("spare_parts_details")
    return safe


def filter_messages_for_viewer(
    messages: Sequence[Dict[str, Any]],
    *,
    include_internal: bool,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for row in messages:
        if is_internal_message(row):
            if not include_internal:
                continue
            out.append(dict(row))
            continue
        out.append(customer_safe_message(row) if not include_internal else dict(row))
    return out


def merge_ticket_rows(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicate ticket rows by id, preserving first-seen order."""
    seen: Set[str] = set()
    merged: List[Dict[str, Any]] = []
    for row in rows:
        tid = row.get("id")
        if tid is None:
            continue
        key = str(tid)
        if key in seen:
            continue
        seen.add(key)
        merged.append(row)
    return merged
