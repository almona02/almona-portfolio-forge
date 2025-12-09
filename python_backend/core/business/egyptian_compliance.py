"""
Lightweight Egyptian e-invoice XML builder (ETA-friendly skeleton).

This is not a full ETA implementation but produces a structured XML
with buyer/seller identifiers, line items, VAT, and totals that can be
attached to downstream ERP systems for pilots.
"""

from __future__ import annotations

import uuid
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Any, Dict, List


class EgyptianEinvoiceBuilder:
    def build(
        self,
        *,
        invoice: Dict[str, Any],
        line_items: List[Dict[str, Any]],
        buyer_tax_id: str,
        currency: str = "EGP",
    ) -> str:
        """
        Build a minimal Egyptian e-invoice XML document.
        """
        root = ET.Element("Invoice")
        root.set("version", "1.0")
        root.set("id", invoice.get("external_ref", str(uuid.uuid4())))

        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "IssueDate").text = invoice.get(
            "date", datetime.utcnow().strftime("%Y-%m-%d")
        )
        ET.SubElement(header, "Currency").text = currency

        seller = ET.SubElement(root, "Seller")
        ET.SubElement(seller, "Name").text = "Almona Fabricator Pro"
        ET.SubElement(seller, "Country").text = "EG"

        buyer = ET.SubElement(root, "Buyer")
        ET.SubElement(buyer, "TaxID").text = buyer_tax_id or "UNKNOWN"
        ET.SubElement(buyer, "Name").text = invoice.get("customer_name", "Customer")

        lines = ET.SubElement(root, "Lines")
        subtotal = 0.0
        vat_amount = 0.0
        for idx, item in enumerate(line_items, 1):
            line = ET.SubElement(lines, "Line")
            ET.SubElement(line, "LineNumber").text = str(idx)
            ET.SubElement(line, "Description").text = item.get("description", "")
            qty = float(item.get("quantity") or 0)
            price = float(item.get("unit_price") or 0)
            line_total = qty * price
            subtotal += line_total
            ET.SubElement(line, "Quantity").text = f"{qty:.3f}"
            ET.SubElement(line, "UnitPrice").text = f"{price:.3f}"
            ET.SubElement(line, "LineTotal").text = f"{line_total:.3f}"

        # VAT: use provided vat_amount if available else 14%
        if invoice.get("vat_amount") is not None:
            vat_amount = float(invoice.get("vat_amount"))
        else:
            vat_amount = subtotal * 0.14

        totals = ET.SubElement(root, "Totals")
        ET.SubElement(totals, "Subtotal").text = f"{subtotal:.3f}"
        ET.SubElement(totals, "VAT").text = f"{vat_amount:.3f}"
        ET.SubElement(totals, "GrandTotal").text = f"{subtotal + vat_amount:.3f}"

        return ET.tostring(root, encoding="unicode")
