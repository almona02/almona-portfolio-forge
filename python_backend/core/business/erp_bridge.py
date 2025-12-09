"""
ERP bridge: translate fabrication intelligence into accounting/ERP events.

Phase: reliability + connectivity
- Audit log writes to Supabase (idempotent)
- Odoo adapter (XML-RPC) for draft invoices
- Egyptian e-invoice stub attachment support
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from core.business.adapters.odoo_adapter import OdooAdapter
from core.business.egyptian_compliance import EgyptianEinvoiceBuilder
from core.supabase_client import EnhancedSupabaseClient, get_enhanced_supabase_client

logger = logging.getLogger(__name__)


class ErpAuditLogger:
    """
    Writes ERP transaction state to Supabase (best-effort, non-blocking).
    """

    def __init__(self, supabase_client: Optional[EnhancedSupabaseClient] = None):
        self._client = supabase_client or get_enhanced_supabase_client()

    async def log_start(
        self,
        *,
        idempotency_key: str,
        quote_id: Optional[str],
        event_type: str,
        target_system: str,
        request_payload: Dict[str, Any],
        egyptian_compliance_ready: bool,
    ) -> Dict[str, Any]:
        record = {
            "idempotency_key": idempotency_key,
            "quote_id": quote_id,
            "event_type": event_type,
            "target_system": target_system.upper(),
            "status": "PENDING",
            "request_payload": request_payload,
            "egyptian_compliance_ready": egyptian_compliance_ready,
            "created_at": datetime.utcnow().isoformat(),
        }
        return await self._write(record, upsert=True)

    async def log_success(
        self,
        *,
        idempotency_key: str,
        response_payload: Dict[str, Any],
        einvoice_xml: Optional[str],
    ) -> Dict[str, Any]:
        record = {
            "idempotency_key": idempotency_key,
            "status": "SUCCESS",
            "response_payload": response_payload,
            "processed_at": datetime.utcnow().isoformat(),
            "einvoice_xml": einvoice_xml,
        }
        return await self._write(record, upsert=True)

    async def log_failure(
        self,
        *,
        idempotency_key: str,
        error_log: str,
        attempts: int = 1,
    ) -> Dict[str, Any]:
        record = {
            "idempotency_key": idempotency_key,
            "status": "FAILED",
            "error_log": error_log,
            "attempts": attempts,
            "processed_at": datetime.utcnow().isoformat(),
        }
        return await self._write(record, upsert=True)

    async def _write(self, record: Dict[str, Any], *, upsert: bool) -> Dict[str, Any]:
        """
        Upsert into Supabase if available; otherwise return record untouched.
        """
        try:
            client = self._client.client  # may raise if disabled
        except Exception as exc:  # pragma: no cover - supabase optional
            logger.debug("ERP audit log skipped (client unavailable): %s", exc)
            return record

        def _do_write() -> Dict[str, Any]:
            try:
                table = client.table("erp_transaction_log")
                if upsert:
                    resp = table.upsert(record, on_conflict="idempotency_key").execute()
                else:
                    resp = table.insert(record).execute()
                data = getattr(resp, "data", None)
                if data:
                    return data[0]
            except Exception as exc_inner:  # pragma: no cover - network/system specific
                logger.warning("ERP audit log write failed: %s", exc_inner)
            return record

        return await asyncio.to_thread(_do_write)


class ErpBridge:
    """
    Single entry point to emit business events toward ERP/accounting systems.
    """

    def __init__(
        self,
        backend_type: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        supabase_client: Optional[EnhancedSupabaseClient] = None,
    ):
        self.backend_type = (backend_type or os.getenv("ERP_BACKEND", "odoo")).lower()
        self.config = config or self._load_config()
        self.audit = ErpAuditLogger(supabase_client)
        self.einvoice_builder = EgyptianEinvoiceBuilder()

    async def emit_invoice_event(
        self,
        quote_data: Dict[str, Any],
        ai_costing: Dict[str, Any],
        compliance_data: Optional[Dict[str, Any]] = None,
        *,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Standardize invoice payload, log, and dispatch to downstream handler.

        Required quote_data keys (expected):
        - quote_number: str
        - items: list of {name, qty, price, ai_cost?, margin?}
        - region: optional region code (e.g., "EG")
        - customer_tax_id: optional
        """
        idempotency = idempotency_key or self._build_idempotency_key(quote_data)
        payload = self._construct_financial_payload(quote_data, ai_costing)

        einvoice_xml: Optional[str] = None
        if (quote_data.get("region") or "").upper() == "EG":
            payload, einvoice_xml = self._enrich_with_egyptian_tax_data(
                payload, compliance_data or {}, quote_data
            )

        await self.audit.log_start(
            idempotency_key=idempotency,
            quote_id=quote_data.get("id"),
            event_type="INVOICE",
            target_system=self.backend_type,
            request_payload=payload,
            egyptian_compliance_ready=bool(einvoice_xml),
        )

        try:
            adapter = self._select_adapter()
            if isinstance(adapter, OdooAdapter):
                dispatch_result = adapter.create_invoice(
                    partner_name=quote_data.get("customer_name", "Almona Client"),
                    invoice_data={
                        "external_ref": payload.get("external_ref"),
                        "date": payload.get("timestamp", datetime.utcnow().isoformat()),
                        "customer_tax_id": quote_data.get("customer_tax_id"),
                        "note": payload.get("note", ""),
                    },
                    lines=payload.get("line_items", []),
                    einvoice_xml=einvoice_xml,
                )
            else:
                dispatch_result = self._mock_dispatch(payload)

            status = dispatch_result.get("status", "error")
            if status == "success":
                await self.audit.log_success(
                    idempotency_key=idempotency,
                    response_payload=dispatch_result,
                    einvoice_xml=einvoice_xml,
                )
                return {
                    "status": "success",
                    "erp_reference": dispatch_result.get("invoice_id")
                    or dispatch_result.get("id"),
                    "invoice_number": dispatch_result.get("invoice_number"),
                    "compliance_doc": einvoice_xml,
                    "idempotency_key": idempotency,
                }

            await self.audit.log_failure(
                idempotency_key=idempotency,
                error_log=json.dumps(dispatch_result),
            )
            return {
                "status": "error",
                "message": dispatch_result.get("message", "erp_dispatch_failed"),
                "idempotency_key": idempotency,
            }

        except Exception as exc:  # pragma: no cover - defensive
            await self.audit.log_failure(
                idempotency_key=idempotency, error_log=str(exc)
            )
            logger.error("ERP dispatch failed: %s", exc, exc_info=True)
            return {
                "status": "error",
                "message": str(exc),
                "idempotency_key": idempotency,
            }

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _select_adapter(self):
        if self.backend_type == "odoo":
            cfg = self.config.get("odoo", {})
            return OdooAdapter(
                url=cfg.get("url", "http://localhost:8069"),
                db=cfg.get("db", "odoo"),
                username=cfg.get("user", "admin"),
                api_key=cfg.get("password", "admin"),
                verify_ssl=cfg.get("verify_ssl", False),
            )
        return self  # fallback to mock dispatch

    def _construct_financial_payload(
        self, quote: Dict[str, Any], costing: Dict[str, Any]
    ) -> Dict[str, Any]:
        line_items: List[Dict[str, Any]] = []
        for item in quote.get("items", []):
            line_items.append(
                {
                    "description": item.get("name", ""),
                    "quantity": item.get("qty", 0) or item.get("quantity", 0),
                    "unit_price": item.get("price", 0.0),
                    "ai_real_cost": item.get("ai_cost"),
                    "margin_percent": item.get("margin"),
                }
            )

        # Fallback single line if quote items are missing
        if not line_items:
            line_items.append(
                {
                    "description": "Fabrication Service",
                    "quantity": 1,
                    "unit_price": costing.get("total_cost")
                    or quote.get("total_price")
                    or 0.0,
                    "ai_real_cost": costing.get("total_cost"),
                    "margin_percent": costing.get("projected_margin_percent"),
                }
            )

        totals = {
            "subtotal": costing.get("total_cost") or 0.0,
            "vat_amount": costing.get("vat_amount") or 0.0,
            "total_due": (costing.get("total_cost") or 0.0)
            + (costing.get("vat_amount") or 0.0),
        }

        return {
            "event_type": "INVOICE_GENERATION",
            "timestamp": datetime.utcnow().isoformat(),
            "external_ref": quote.get("quote_number"),
            "line_items": line_items,
            "totals": totals,
            "cost_intelligence": costing,
            "note": costing.get("note", ""),
        }

    def _enrich_with_egyptian_tax_data(
        self,
        payload: Dict[str, Any],
        compliance_data: Dict[str, Any],
        quote_data: Dict[str, Any],
    ) -> (Dict[str, Any], Optional[str]):
        """
        Generate a lightweight ETA-style XML for Egyptian compliance.
        """
        tax_id = (
            compliance_data.get("customer_tax_id")
            or quote_data.get("customer_tax_id")
            or "UNKNOWN"
        )
        xml_doc = self.einvoice_builder.build(
            invoice={
                "external_ref": payload.get("external_ref"),
                "date": payload.get("timestamp", datetime.utcnow().isoformat()),
                "customer_name": quote_data.get("customer_name"),
                "vat_amount": payload.get("totals", {}).get("vat_amount"),
            },
            line_items=payload.get("line_items", []),
            buyer_tax_id=tax_id,
            currency=quote_data.get("currency", "EGP"),
        )
        payload["compliance_xml"] = xml_doc
        return payload, xml_doc

    def _mock_dispatch(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(
            "ERP BRIDGE [%s]: %s",
            self.backend_type,
            json.dumps(payload, indent=2, default=str),
        )
        return {"id": "INV-MOCK-001", "status": "success"}

    def _build_idempotency_key(self, quote_data: Dict[str, Any]) -> str:
        quote_id = quote_data.get("id") or quote_data.get("quote_number") or "unknown"
        return f"invoice-{quote_id}-{uuid.uuid4().hex[:8]}"

    def _load_config(self) -> Dict[str, Any]:
        return {
            "odoo": {
                "url": os.getenv("ODOO_URL", "http://localhost:8069"),
                "db": os.getenv("ODOO_DB", "almona_db"),
                "user": os.getenv("ODOO_USER", "admin"),
                "password": os.getenv("ODOO_PASSWORD", "admin"),
                "verify_ssl": os.getenv("ODOO_VERIFY_SSL", "false").lower() == "true",
            }
        }
