import asyncio
from unittest import mock

import pytest

from core.business.erp_bridge import ErpAuditLogger, ErpBridge
from core.business.adapters.odoo_adapter import OdooAdapter


def test_idempotency_key_prefix():
    bridge = ErpBridge(backend_type="mock")
    key = bridge._build_idempotency_key({"id": "quote-123"})
    assert key.startswith("invoice-quote-123-")
    assert len(key.split("-")[-1]) == 8


@pytest.mark.asyncio
async def test_emit_invoice_event_mock_backend(monkeypatch):
    # Avoid touching Supabase by short-circuiting audit writes
    async def fake_write(self, record, upsert):
        return record

    monkeypatch.setattr(ErpAuditLogger, "_write", fake_write)

    bridge = ErpBridge(backend_type="mock")
    quote_data = {"id": "quote-1", "quote_number": "Q-1", "region": "EG"}
    ai_costing = {"total_cost": 1000.0, "vat_amount": 140.0, "projected_margin_percent": 20.0}

    result = await bridge.emit_invoice_event(quote_data, ai_costing)

    assert result["status"] == "success"
    assert result["erp_reference"]
    assert result["idempotency_key"].startswith("invoice-quote-1-")


def test_odoo_adapter_connects(monkeypatch):
    # Mock XML-RPC proxies
    common_proxy = mock.MagicMock()
    common_proxy.authenticate.return_value = 1
    common_proxy.version.return_value = {"server_version": "16.0"}

    models_proxy = mock.MagicMock()

    monkeypatch.setattr(
        "core.business.adapters.odoo_adapter.xmlrpc.client.ServerProxy",
        mock.MagicMock(side_effect=[common_proxy, models_proxy]),
    )

    adapter = OdooAdapter(
        url="http://localhost:8069",
        db="test_db",
        username="admin",
        api_key="admin",
    )

    assert adapter.connect() is True
    assert adapter.connected is True
    assert adapter.uid == 1


def test_odoo_adapter_invoice_line_format(monkeypatch):
    # Avoid RPCs for account lookup
    monkeypatch.setattr(OdooAdapter, "_get_income_account", lambda self: 42)
    monkeypatch.setattr(
        "core.business.adapters.odoo_adapter.xmlrpc.client.ServerProxy",
        mock.MagicMock(side_effect=[mock.MagicMock(), mock.MagicMock()]),
    )

    adapter = OdooAdapter(
        url="http://localhost:8069",
        db="test_db",
        username="admin",
        api_key="admin",
    )

    line = adapter._to_invoice_line(
        {
            "description": "Fabrication",
            "quantity": 2,
            "unit_price": 500.0,
            "ai_real_cost": 300.0,
            "margin_percent": 40.0,
        }
    )

    # Odoo expects (create, _, payload) tuple
    assert line[0] == 0 and line[1] == 0
    assert "Fabrication" in line[2]["name"]
    assert "AI cost" in line[2]["name"]
    assert line[2]["quantity"] == 2
    assert line[2]["price_unit"] == 500.0
    assert line[2]["account_id"] == 42
