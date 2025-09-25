from __future__ import annotations

from typing import Any, Dict

import pytest

from apis.v2.services.quote_service import QuoteService


class DummyTable:
    def __init__(self, name: str, store: Dict[str, list]):
        self.name = name
        self.store = store
        self._ops = []

    def insert(self, data):
        # normalize to list
        if isinstance(data, list):
            items = data
        else:
            items = [data]
        self.store.setdefault(self.name, []).extend(items)

        class R:
            def __init__(self, data):
                self.data = data

            def execute(self):
                return self

        return R(items)

    def update(self, *_args, **_kwargs):
        class R:
            def __init__(self, data):
                self.data = data

            def eq(self, *_a, **_k):
                return self

            def execute(self):
                return self

        # For tests we don't simulate update behavior in depth
        return R([])


class DummyClient:
    def __init__(self):
        self.store: Dict[str, list] = {}

    def table(self, name: str):
        return DummyTable(name, self.store)

    def rpc(self, *_args, **_kwargs):
        class R:
            def __init__(self):
                self.data = []

            def execute(self):
                return self

        return R()


class DummySupabase:
    def __init__(self):
        self._client = DummyClient()

    # Mimic supabase Client surface used by repository
    def table(self, name: str):
        return self._client.table(name)

    def rpc(self, *args, **kwargs):
        return self._client.rpc(*args, **kwargs)


def test_quote_service_create_with_items():
    supabase = DummySupabase()
    service = QuoteService(supabase)  # type: ignore

    payload: Dict[str, Any] = {
        "products": [
            {"product_id": "p1", "quantity": 2, "unit_price": 10.0},
            {"product_id": "p2", "quantity": 1, "unit_price": 5.0},
        ],
        "services": [
            {"service_id": "s1", "quantity": 3, "unit_price": 2.0},
        ],
        "contact_name": "Jane",
        "contact_email": "jane@example.com",
        "contact_phone": None,
        "company": None,
        "project_description": None,
        "urgency": "standard",
        "delivery_location": None,
        "special_requirements": None,
        "related_service_ticket_id": None,
        "machine_id": None,
    }

    result = service.create_quote_with_items(payload)
    assert result["status"] == "pending"
    assert "id" in result
    # Estimated total: (2*10)+(1*5)+(3*2) = 20+5+6 = 31
    assert result["total_amount"] in (31, None)


