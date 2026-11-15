"""F-B7-01 / F-B7-02: service-key ticket read scope and internal-note privacy."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from apis.v2.services.ticket_access import (
    can_read_ticket_record,
    filter_messages_for_viewer,
    is_internal_message,
)
from apis.v2.services.ticket_service import TicketService
from services.unified_ticket_service import UnifiedTicketService


class _Result:
    def __init__(self, data):
        self.data = data

    def execute(self):
        return self


class _Query:
    def __init__(self, store: Dict[str, list], name: str):
        self.store = store
        self.name = name
        self.filters: Dict[str, Any] = {}
        self._in: Dict[str, List[Any]] = {}
        self._limit: Optional[int] = None
        self._update: Optional[Dict[str, Any]] = None
        self._insert: Optional[Any] = None

    def select(self, *_cols):
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def in_(self, key, values):
        self._in[key] = list(values)
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, n):
        self._limit = n
        return self

    def insert(self, data):
        self._insert = data
        return self

    def update(self, data):
        self._update = data
        return self

    def execute(self):
        rows = list(self.store.get(self.name, []))
        if self._insert is not None:
            items = self._insert if isinstance(self._insert, list) else [self._insert]
            for item in items:
                item.setdefault("id", str(uuid4()))
                rows.append(item)
            self.store[self.name] = rows
            return _Result(items)
        if self._update is not None:
            updated = []
            for row in rows:
                if all(row.get(k) == v for k, v in self.filters.items()):
                    row.update(self._update)
                    updated.append(row)
            return _Result(updated)
        for k, v in self.filters.items():
            rows = [r for r in rows if r.get(k) == v]
        for k, values in self._in.items():
            rows = [r for r in rows if r.get(k) in values]
        if self._limit is not None:
            rows = rows[: self._limit]
        return _Result(rows)


class FakeClient:
    def __init__(self, store: Optional[Dict[str, list]] = None):
        self.store = store or {
            "service_tickets": [],
            "profiles": [],
            "service_jobs": [],
            "service_job_visits": [],
            "ticket_messages": [],
        }

    def table(self, name: str):
        return _Query(self.store, name)

    def rpc(self, *_a, **_k):
        return _Result(None)


def _seed_ticket(store, **fields):
    row = {
        "id": str(uuid4()),
        "user_id": str(uuid4()),
        "assigned_to": None,
        "title": "t",
        "description": "d",
        "priority": "medium",
        "status": "open",
        "category": "support",
        "type": "general",
        "ticket_number": "T-1",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
        **fields,
    }
    store["service_tickets"].append(row)
    return row


def test_access_helpers_role_alone_insufficient_for_tech_and_sales():
    owner = str(uuid4())
    other = str(uuid4())
    ticket = {"id": str(uuid4()), "user_id": owner, "assigned_to": None}
    assert can_read_ticket_record(
        ticket=ticket, user_id=uuid4(), role="technician", job_assigned=False
    ) is False
    assert can_read_ticket_record(
        ticket=ticket, user_id=uuid4(), role="sales_rep"
    ) is False
    assert can_read_ticket_record(
        ticket=ticket, user_id=uuid4(), role="admin"
    ) is True
    assert can_read_ticket_record(
        ticket=ticket, user_id=uuid4(), role="support"
    ) is True
    tech = uuid4()
    assert can_read_ticket_record(
        ticket={**ticket, "assigned_to": str(tech)},
        user_id=tech,
        role="technician",
    ) is True
    assert can_read_ticket_record(
        ticket=ticket,
        user_id=tech,
        role="technician",
        job_assigned=True,
    ) is True
    assert can_read_ticket_record(
        ticket=ticket,
        user_id=tech,
        role="technician",
        historical_attendee=True,
    ) is True
    from uuid import UUID

    assert can_read_ticket_record(
        ticket=ticket, user_id=UUID(owner), role="customer"
    ) is True
    assert other != owner


def test_filter_messages_strips_internal_for_owners():
    rows = [
        {
            "id": "1",
            "ticket_id": "t",
            "author_id": "a",
            "message": "public",
            "message_type": "message",
            "is_internal_note": False,
            "attachments": [{"storage_path": "t/a.jpg"}],
            "created_at": "1",
            "internal_only_meta": "secret",
        },
        {
            "id": "2",
            "ticket_id": "t",
            "author_id": "a",
            "message": "staff only",
            "message_type": "internal_note",
            "is_internal_note": True,
            "attachments": [{"storage_path": "t/secret.jpg"}],
            "created_at": "2",
        },
        {
            "id": "3",
            "ticket_id": "t",
            "author_id": "a",
            "message": "also internal",
            "message_type": "internal_note",
            "is_internal_note": False,
            "attachments": [],
            "created_at": "3",
        },
    ]
    assert is_internal_message(rows[1])
    assert is_internal_message(rows[2])
    owner_view = filter_messages_for_viewer(rows, include_internal=False)
    assert [m["id"] for m in owner_view] == ["1"]
    assert "internal_only_meta" not in owner_view[0]
    assert owner_view[0]["attachments"][0]["storage_path"] == "t/a.jpg"
    staff_view = filter_messages_for_viewer(rows, include_internal=True)
    assert len(staff_view) == 3


def test_ticket_service_get_and_list_scope():
    client = FakeClient()
    owner = uuid4()
    tech = uuid4()
    sales = uuid4()
    admin = uuid4()
    foreign = _seed_ticket(client.store, user_id=str(uuid4()), title="foreign")
    owned = _seed_ticket(client.store, user_id=str(owner), title="owned")
    assigned = _seed_ticket(
        client.store, user_id=str(uuid4()), assigned_to=str(tech), title="assigned"
    )
    job_ticket = _seed_ticket(client.store, user_id=str(uuid4()), title="job")
    hist_ticket = _seed_ticket(client.store, user_id=str(uuid4()), title="hist")
    client.store["profiles"] = [
        {"id": str(owner), "role": "customer"},
        {"id": str(tech), "role": "technician"},
        {"id": str(sales), "role": "sales_rep"},
        {"id": str(admin), "role": "admin"},
    ]
    job_id = str(uuid4())
    client.store["service_jobs"] = [
        {
            "id": str(uuid4()),
            "ticket_id": job_ticket["id"],
            "assigned_technician_id": str(tech),
            "state": "assigned",
        },
        {
            "id": job_id,
            "ticket_id": hist_ticket["id"],
            "assigned_technician_id": str(uuid4()),
            "state": "completed",
        },
    ]
    client.store["service_job_visits"] = [
        {
            "id": str(uuid4()),
            "job_id": job_id,
            "attending_technician_id": str(tech),
            "state": "completed",
        }
    ]

    svc = TicketService(client)  # type: ignore
    assert svc.get_ticket(foreign["id"], tech) is None
    assert svc.get_ticket(foreign["id"], sales) is None
    assert svc.get_ticket(owned["id"], owner) is not None
    assert svc.get_ticket(assigned["id"], tech) is not None
    assert svc.get_ticket(job_ticket["id"], tech) is not None
    assert svc.get_ticket(hist_ticket["id"], tech) is not None
    assert svc.get_ticket(foreign["id"], admin) is not None

    tech_list = {t.payload.get("title") for t in svc.get_user_tickets(tech)}
    assert "foreign" not in tech_list
    assert {"assigned", "job", "hist"} <= tech_list

    sales_list = {t.payload.get("title") for t in svc.get_user_tickets(sales)}
    assert "foreign" not in sales_list

    admin_list = {t.payload.get("title") for t in svc.get_user_tickets(admin)}
    assert "foreign" in admin_list


def test_ticket_service_message_payload_hides_internal_from_owner():
    client = FakeClient()
    owner = uuid4()
    support = uuid4()
    ticket = _seed_ticket(client.store, user_id=str(owner))
    client.store["profiles"] = [
        {"id": str(owner), "role": "customer"},
        {"id": str(support), "role": "support"},
    ]
    client.store["ticket_messages"] = [
        {
            "id": "pub",
            "ticket_id": ticket["id"],
            "author_id": str(support),
            "message": "hello",
            "message_type": "message",
            "is_internal_note": False,
            "attachments": [{"storage_path": "t/pub.jpg", "filename": "pub.jpg", "size": 1, "type": "image/jpeg"}],
            "created_at": "1",
        },
        {
            "id": "priv",
            "ticket_id": ticket["id"],
            "author_id": str(support),
            "message": "internal note body",
            "message_type": "internal_note",
            "is_internal_note": True,
            "attachments": [{"storage_path": "t/secret.jpg", "filename": "secret.jpg", "size": 2, "type": "image/jpeg"}],
            "created_at": "2",
        },
    ]
    svc = TicketService(client)  # type: ignore
    owner_msgs = svc.list_messages(ticket["id"], owner)
    assert [m["id"] for m in owner_msgs] == ["pub"]
    assert all(m.get("is_internal_note") is False for m in owner_msgs)
    assert not any("secret" in str(m) for m in owner_msgs)
    assert svc.count_messages(ticket["id"], owner) == 1

    staff_msgs = svc.list_messages(ticket["id"], support)
    assert [m["id"] for m in staff_msgs] == ["pub", "priv"]
    assert svc.count_messages(ticket["id"], support) == 2


def test_unified_ticket_service_same_scope_and_privacy():
    client = FakeClient()
    owner = uuid4()
    tech = uuid4()
    sales = uuid4()
    foreign = _seed_ticket(client.store, user_id=str(uuid4()))
    owned = _seed_ticket(client.store, user_id=str(owner))
    client.store["profiles"] = [
        {"id": str(owner), "role": "customer"},
        {"id": str(tech), "role": "technician"},
        {"id": str(sales), "role": "sales_rep"},
    ]
    client.store["ticket_messages"] = [
        {
            "id": "pub",
            "ticket_id": owned["id"],
            "author_id": str(owner),
            "message": "hi",
            "message_type": "message",
            "is_internal_note": False,
            "attachments": [],
            "created_at": "1",
        },
        {
            "id": "priv",
            "ticket_id": owned["id"],
            "author_id": str(uuid4()),
            "message": "note",
            "message_type": "message",
            "is_internal_note": True,
            "attachments": [{"storage_path": "x"}],
            "created_at": "2",
        },
    ]
    svc = UnifiedTicketService(client)  # type: ignore
    assert svc.get_ticket(foreign["id"], tech) is None
    assert svc.get_ticket(foreign["id"], sales) is None
    assert svc.get_ticket(owned["id"], owner) is not None
    assert [m["id"] for m in svc.list_messages(owned["id"], owner)] == ["pub"]
    assert svc.count_messages(owned["id"], owner) == 1
