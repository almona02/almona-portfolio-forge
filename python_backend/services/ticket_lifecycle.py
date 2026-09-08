"""Canonical ticket FSM — mirrors src/lib/ticketing/ticketTransitions.ts."""

from __future__ import annotations

from typing import Dict, List, Tuple

TICKET_STATUS_TRANSITIONS: Dict[str, List[str]] = {
    "open": ["assigned", "cancelled"],
    "assigned": ["in_progress", "awaiting_parts", "cancelled"],
    "in_progress": ["awaiting_parts", "awaiting_customer", "resolved"],
    "awaiting_parts": ["in_progress", "cancelled"],
    "awaiting_customer": ["in_progress", "resolved"],
    "resolved": ["closed"],
    "closed": [],
    "cancelled": [],
}


def validate_transition(current_status: str, target_status: str) -> Tuple[bool, str]:
    allowed = TICKET_STATUS_TRANSITIONS.get(current_status, [])
    if target_status in allowed:
        return True, f"TRANSITION-{current_status.upper()}-TO-{target_status.upper()}"
    return False, f"Transition from {current_status} to {target_status} not allowed"
