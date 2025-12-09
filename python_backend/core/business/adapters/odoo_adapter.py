"""
Production-grade Odoo adapter (XML-RPC).

Minimal, dependency-light connector with:
- Authentication and health checks
- Draft invoice creation with AI costing context
- Optional Egyptian e-invoice XML attachment
"""

from __future__ import annotations

import base64
import logging
import ssl
import time
import xmlrpc.client
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class OdooAdapter:
    """
    Connect Almona to Odoo via XML-RPC.
    """

    def __init__(
        self,
        url: str,
        db: str,
        username: str,
        api_key: str,
        *,
        verify_ssl: bool = False,
    ) -> None:
        self.url = url.rstrip("/")
        self.db = db
        self.username = username
        self.password = api_key

        # SSL context configuration
        # Security: Always use verified SSL context in production
        # For legacy/on-prem systems, use create_default_context with relaxed settings
        if verify_ssl:
            context = ssl.create_default_context()
        else:
            # Create context with minimal verification for legacy systems only
            # WARNING: This should only be used for internal/trusted networks
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            # Log warning for security audit
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                "Using unverified SSL context for Odoo connection. "
                "This should only be used for internal/trusted networks."
            )

        self._common = xmlrpc.client.ServerProxy(
            f"{self.url}/xmlrpc/2/common", context=context, allow_none=True
        )
        self._models = xmlrpc.client.ServerProxy(
            f"{self.url}/xmlrpc/2/object", context=context, allow_none=True
        )

        self.uid: Optional[int] = None
        self.connected: bool = False

    def connect(self, *, max_retries: int = 3, retry_delay: float = 1.0) -> bool:
        """
        Authenticate against Odoo. Returns True on success.
        """
        for attempt in range(max_retries):
            try:
                self.uid = self._common.authenticate(
                    self.db, self.username, self.password, {}
                )
                if self.uid:
                    self.connected = True
                    logger.info("Connected to Odoo at %s (uid=%s)", self.url, self.uid)
                    return True

                logger.error("Odoo authentication failed (attempt %s)", attempt + 1)
            except xmlrpc.client.ProtocolError as exc:
                logger.error(
                    "Odoo protocol error (%s): %s", exc.errcode, exc.errmsg, exc_info=True
                )
            except Exception as exc:  # pragma: no cover - defensive
                logger.error("Odoo connection error: %s", exc, exc_info=True)

            if attempt < max_retries - 1:
                time.sleep(retry_delay * (2**attempt))

        self.connected = False
        return False

    def create_invoice(
        self,
        partner_name: str,
        invoice_data: Dict[str, Any],
        lines: List[Dict[str, Any]],
        *,
        einvoice_xml: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a draft invoice in Odoo. Returns status dict.
        """
        if not self.connected and not self.connect():
            return {"status": "error", "message": "odoo_connection_failed"}

        try:
            partner_id = self._get_or_create_partner(
                name=partner_name, tax_id=invoice_data.get("customer_tax_id")
            )
            line_values = [self._to_invoice_line(line) for line in lines]

            invoice_vals = {
                "move_type": "out_invoice",
                "partner_id": partner_id,
                "invoice_date": invoice_data.get(
                    "date", datetime.utcnow().strftime("%Y-%m-%d")
                ),
                "ref": invoice_data.get("external_ref"),
                "invoice_line_ids": line_values,
                "narration": invoice_data.get("note", ""),
            }

            invoice_id = self._models.execute_kw(
                self.db,
                self.uid,
                self.password,
                "account.move",
                "create",
                [invoice_vals],
            )

            invoice_meta = self._models.execute_kw(
                self.db,
                self.uid,
                self.password,
                "account.move",
                "read",
                [[invoice_id], ["name", "state", "amount_total"]],
            )[0]

            if einvoice_xml:
                self._attach_einvoice_xml(invoice_id, einvoice_xml, invoice_data)

            logger.info("Created Odoo invoice %s (id=%s)", invoice_meta["name"], invoice_id)
            return {
                "status": "success",
                "invoice_id": invoice_id,
                "invoice_number": invoice_meta.get("name"),
                "state": invoice_meta.get("state"),
                "amount_total": invoice_meta.get("amount_total"),
            }
        except Exception as exc:  # pragma: no cover - network/system specific
            logger.error("Failed to create Odoo invoice: %s", exc, exc_info=True)
            return {"status": "error", "message": str(exc)}

    def test_connection(self) -> Dict[str, Any]:
        """
        Lightweight connection test + permissions probe.
        """
        if not self.connect():
            return {"status": "error", "message": "connection_failed"}

        try:
            has_create_access = self._models.execute_kw(
                self.db,
                self.uid,
                self.password,
                "account.move",
                "check_access_rights",
                ["create"],
                {"raise_exception": False},
            )
            version = self._common.version().get("server_version", "unknown")
            return {
                "status": "success",
                "server_version": version,
                "can_create_invoices": bool(has_create_access),
                "uid": self.uid,
            }
        except Exception as exc:  # pragma: no cover - network/system specific
            logger.error("Odoo test_connection failed: %s", exc, exc_info=True)
            return {"status": "error", "message": str(exc)}

    # Internal helpers -----------------------------------------------------

    def _get_or_create_partner(self, name: str, tax_id: Optional[str]) -> int:
        """
        Find partner by name or VAT, otherwise create a minimal company.
        """
        search_domain: List[Any] = [["name", "=", name]]
        if tax_id:
            search_domain = ["|", ["vat", "=", tax_id], ["name", "=", name]]

        partner_ids = self._models.execute_kw(
            self.db,
            self.uid,
            self.password,
            "res.partner",
            "search",
            [search_domain],
            {"limit": 1},
        )

        if partner_ids:
            return partner_ids[0]

        partner_vals = {"name": name, "company_type": "company", "is_company": True}
        if tax_id:
            partner_vals["vat"] = tax_id

        new_id = self._models.execute_kw(
            self.db,
            self.uid,
            self.password,
            "res.partner",
            "create",
            [partner_vals],
        )
        logger.info("Created Odoo partner '%s' (id=%s)", name, new_id)
        return new_id

    def _to_invoice_line(self, line: Dict[str, Any]) -> tuple[int, int, Dict[str, Any]]:
        """
        Convert Almona line item to Odoo invoice line tuple.
        """
        description = line.get("description") or "Fabrication Service"
        quantity = line.get("quantity") or 1
        unit_price = line.get("unit_price") or 0.0

        name_parts = [description]
        if line.get("ai_real_cost") is not None:
            name_parts.append(
                f"[AI cost: {line['ai_real_cost']:.2f} | Margin: {line.get('margin_percent', 0):.1f}%]"
            )

        income_account = self._get_income_account()
        payload = {
            "name": "\n".join(name_parts),
            "quantity": quantity,
            "price_unit": unit_price,
        }
        if income_account:
            payload["account_id"] = income_account
        return (0, 0, payload)

    def _get_income_account(self) -> Optional[int]:
        """
        Fetch a default income account. Returns None if not found.
        """
        try:
            account_ids = self._models.execute_kw(
                self.db,
                self.uid,
                self.password,
                "account.account",
                "search",
                [[["user_type_id.type", "=", "other_income"]]],
                {"limit": 1},
            )
            return account_ids[0] if account_ids else None
        except Exception:  # pragma: no cover - depends on Odoo config
            return None

    def _attach_einvoice_xml(
        self, invoice_id: int, xml_content: str, invoice_data: Dict[str, Any]
    ) -> None:
        """
        Attach Egyptian e-invoice XML to the invoice.
        """
        try:
            filename = f"einvoice_{invoice_data.get('external_ref', invoice_id)}.xml"
            attachment_payload = {
                "name": filename,
                "datas": base64.b64encode(xml_content.encode("utf-8")).decode("utf-8"),
                "res_model": "account.move",
                "res_id": invoice_id,
                "type": "binary",
                "mimetype": "application/xml",
            }
            self._models.execute_kw(
                self.db,
                self.uid,
                self.password,
                "ir.attachment",
                "create",
                [attachment_payload],
            )
            logger.info("Attached e-invoice XML to invoice %s", invoice_id)
        except Exception as exc:  # pragma: no cover - attachment optional
            logger.warning("Could not attach e-invoice XML: %s", exc)
