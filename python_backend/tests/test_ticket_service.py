from __future__ import annotations

from typing import Any, Dict
from uuid import UUID, uuid4

from apis.v2.services.ticket_service import TicketService, utcnow_iso
from models.api_v2_models import TicketCategory, TicketPriority, TicketStatus


class DummyTable:
    def __init__(self, name: str, store: Dict[str, list]):
        self.name = name
        self.store = store

    def insert(self, data):
        if isinstance(data, list):
            items = data
        else:
            items = [data]
        # assign id and other fields if not present
        for item in items:
            item.setdefault("id", str(uuid4()))
            # Generate ticket_number if inserting into service_tickets table
            if self.name == "service_tickets" and "ticket_number" not in item:
                from datetime import datetime
                year = datetime.now().year
                # Simple mock ticket number generation
                existing = [row for row in self.store.get(self.name, []) 
                           if row.get("ticket_number", "").startswith(f"TKT-{year}-")]
                next_num = len(existing) + 1
                item["ticket_number"] = f"TKT-{year}-{next_num:06d}"
        self.store.setdefault(self.name, []).extend(items)

        class R:
            def __init__(self, data):
                self.data = data

            def execute(self):
                return self

        return R(items)

    def select(self, *_cols):
        class Q:
            def __init__(self, table: DummyTable):
                self.table = table
                self.filters: Dict[str, Any] = {}

            def eq(self, key, value):
                self.filters[key] = value
                return self

            def order(self, *_args, **_kwargs):
                return self

            def execute(self):
                data = [row for row in self.table.store.get(self.table.name, []) if all(row.get(k) == v for k, v in self.filters.items())]
                class R:
                    def __init__(self, data):
                        self.data = data
                return R(data)

        return Q(self)

    def update(self, update):
        class Q:
            def __init__(self, table: DummyTable, update: Dict[str, Any]):
                self.table = table
                self.update = update
                self.filters: Dict[str, Any] = {}

            def eq(self, key, value):
                self.filters[key] = value
                return self

            def execute(self):
                rows = self.table.store.get(self.table.name, [])
                updated = []
                for row in rows:
                    if all(row.get(k) == v for k, v in self.filters.items()):
                        row.update(self.update)
                        updated.append(row)
                class R:
                    def __init__(self, data):
                        self.data = data
                return R(updated)

        return Q(self, update)


class DummyClient:
    def __init__(self):
        self.store: Dict[str, list] = {}

    def table(self, name: str):
        return DummyTable(name, self.store)


class DummySupabase:
    def __init__(self):
        self._client = DummyClient()

    def table(self, name: str):
        return self._client.table(name)


def build_payload():
    return type("P", (), {
        "title": "Issue",
        "description": "Desc",
        "priority": TicketPriority.MEDIUM,
        "machine_id": None,
        "machine_serial_number": None,
    })()


def test_ticket_service_create_and_list():
    supabase = DummySupabase()
    svc = TicketService(supabase)  # type: ignore
    user_id = uuid4()

    created = svc.create_ticket(TicketCategory.SUPPORT, build_payload(), user_id)
    assert created.id is not None
    assert created.status == TicketStatus.OPEN

    tickets = svc.get_user_tickets(user_id)
    assert len(tickets) == 1
    assert tickets[0].id == created.id


def test_ticket_service_update_and_assign():
    supabase = DummySupabase()
    svc = TicketService(supabase)  # type: ignore
    user_id = uuid4()
    t = svc.create_ticket(TicketCategory.SUPPORT, build_payload(), user_id)

    updated = svc.update_ticket_status(t.id, TicketStatus.IN_PROGRESS)
    assert updated is not None
    assert updated.status == TicketStatus.IN_PROGRESS

    assigned = svc.assign_ticket(t.id, uuid4(), user_id)
    assert assigned is not None
    assert assigned.status == TicketStatus.IN_PROGRESS


