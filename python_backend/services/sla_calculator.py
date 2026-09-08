"""SLA calculator — loads canonical policy from src/lib/ticketing/sla_policy.json."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Tuple

_POLICY_PATH = (
    Path(__file__).resolve().parents[2] / "src" / "lib" / "ticketing" / "sla_policy.json"
)

with _POLICY_PATH.open(encoding="utf-8") as f:
    _POLICY: Dict[str, Any] = json.load(f)

_DEFAULT = _POLICY["default"]


@dataclass(frozen=True)
class SlaDeadlines:
    response_due: datetime
    resolution_due: datetime
    escalation_due: datetime


def _resolve_hours(priority: str, ticket_type: str) -> Tuple[int, int, int]:
    by_priority = _POLICY.get(priority) or _POLICY.get("medium", {})
    if "responseHours" in by_priority:
        row = by_priority
    else:
        row = by_priority.get(ticket_type) or by_priority.get("general") or _DEFAULT
    return row["responseHours"], row["resolutionHours"], row["escalationHours"]


def calculate_sla_deadlines(
    priority: str, ticket_type: str, created_at: datetime
) -> SlaDeadlines:
    response_h, resolution_h, escalation_h = _resolve_hours(priority, ticket_type)
    return SlaDeadlines(
        response_due=created_at + timedelta(hours=response_h),
        resolution_due=created_at + timedelta(hours=resolution_h),
        escalation_due=created_at + timedelta(hours=escalation_h),
    )


SLA_POLICY_SOURCE = str(_POLICY_PATH)
