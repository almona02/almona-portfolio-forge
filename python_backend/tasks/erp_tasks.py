"""
ERP dispatch tasks (Celery).

Handles quote->invoice emission to external ERP with idempotent audit logging.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from celery import current_task

from celery_app import celery_app
from core.business.erp_bridge import ErpBridge
from core.supabase_client import get_enhanced_supabase_client

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="erp.dispatch_invoice", max_retries=3)
def dispatch_invoice_task(
    self,
    quote_data: Dict[str, Any],
    ai_costing: Dict[str, Any],
    compliance_data: Optional[Dict[str, Any]] = None,
    idempotency_key: Optional[str] = None,
    backend_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Celery task to emit an invoice event to ERP.

    Args:
        quote_data: Quote payload (must include quote_number/id, items, region)
        ai_costing: Costing payload (total_cost, vat_amount, margins)
        compliance_data: Optional compliance metadata (tax ids, etc.)
        idempotency_key: Optional override for idempotent log entry
        backend_type: Optional ERP backend override (e.g., "odoo", "mock")
    """
    try:
        if not idempotency_key:
            idempotency_key = f"invoice-{quote_data.get('id')}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        # Idempotency short-circuit: if already successful, skip
        try:
            supabase = get_enhanced_supabase_client().client
            resp = (
                supabase.table("erp_transaction_log")
                .select("*")
                .eq("idempotency_key", idempotency_key)
                .in_("status", ["SUCCESS"])
                .limit(1)
                .execute()
            )
            if getattr(resp, "data", None):
                existing = resp.data[0]
                logger.info("Idempotent skip for %s", idempotency_key)
                return {
                    "status": "skipped",
                    "erp_reference": (existing.get("response_payload") or {}).get("invoice_id"),
                    "invoice_number": (existing.get("response_payload") or {}).get("invoice_number"),
                    "idempotency_key": idempotency_key,
                }
        except Exception as exc:  # pragma: no cover - best effort
            logger.debug("Idempotency check failed: %s", exc)

        current_task.update_state(
            state="PROGRESS",
            meta={"status": "starting", "quote_id": quote_data.get("id")},
        )

        bridge = ErpBridge(backend_type=backend_type)
        result = asyncio_run_safe(
            bridge.emit_invoice_event(
                quote_data,
                ai_costing,
                compliance_data or {},
                idempotency_key=idempotency_key,
            )
        )

        status = result.get("status")
        if status == "success":
            current_task.update_state(
                state="SUCCESS",
                meta={
                    "status": "completed",
                    "erp_reference": result.get("erp_reference"),
                    "invoice_number": result.get("invoice_number"),
                },
            )
            return result

        # Failed dispatch; decide whether to retry
        if self.request.retries < self.max_retries:
            raise self.retry(
                countdown=2 ** self.request.retries,
                exc=Exception(result.get("message", "erp_dispatch_failed")),
            )

        current_task.update_state(
            state="FAILURE",
            meta={"status": "failed", "error": result.get("message")},
        )
        return result

    except Exception as exc:
        logger.error("ERP dispatch task failed: %s", exc, exc_info=True)
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=2 ** self.request.retries, exc=exc)

        current_task.update_state(
            state="FAILURE", meta={"status": "error", "error": str(exc)}
        )
        return {"status": "error", "message": str(exc)}


def asyncio_run_safe(awaitable):
    """
    Run coroutine in a synchronous Celery task without requiring event loop.
    """
    try:
        import asyncio

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            # Schedule and block until done
            return asyncio.run_coroutine_threadsafe(awaitable, loop).result()
        return asyncio.run(awaitable)
    except Exception:  # pragma: no cover - fallback
        # last-resort fallback for environments without proper asyncio
        return asyncio.get_event_loop().run_until_complete(awaitable)
