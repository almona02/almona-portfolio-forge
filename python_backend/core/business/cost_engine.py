"""
Predictive job costing utilities.

These helpers stay fabrication-first: they rely on optimization outputs
(material usage, remnants, machine time) to derive cost and margin signals
that can be surfaced to UI or downstream ERP systems.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, Optional
import logging


logger = logging.getLogger(__name__)


@dataclass
class MarketContext:
    """Simple container for regional pricing assumptions."""

    aluminium_price_egp_per_kg: Decimal = Decimal("135.0")
    labor_rate_egp_per_hour: Decimal = Decimal("150.0")
    cnc_rate_egp_per_hour: Decimal = Decimal("500.0")
    overhead_percent: Decimal = Decimal("25.0")
    vat_percent: Decimal = Decimal("14.0")


class PredictiveCostEngine:
    """
    Compute pre-flight profitability based on optimization signals.

    All inputs are defensive: missing numbers default to zero to avoid
    runtime errors when upstream data is partial.
    """

    def __init__(self, market: Optional[MarketContext] = None):
        self.market = market or MarketContext()

    def calculate_pre_flight_margin(
        self, quote_data: Dict[str, Any], optimization: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Returns a margin snapshot for the provided quote/optimization data.

        Expected optimization keys (optional):
        - material_requirements_kg: float
        - remnant_utilization_kg: float
        - machine_time_hours: float
        - labor_hours: float

        Expected quote_data keys (optional):
        - total_price: float
        - currency: str
        """
        material_kg = Decimal(
            str(optimization.get("material_requirements_kg", 0) or 0)
        )
        remnant_kg = Decimal(
            str(optimization.get("remnant_utilization_kg", 0) or 0)
        )
        machine_hours = Decimal(
            str(optimization.get("machine_time_hours", 0) or 0)
        )
        labor_hours = Decimal(str(optimization.get("labor_hours", 0) or 0))

        new_material_kg = max(Decimal("0"), material_kg - remnant_kg)
        remnant_credit = (
            remnant_kg * self.market.aluminium_price_egp_per_kg * Decimal("0.6")
        )
        material_cost = (
            new_material_kg * self.market.aluminium_price_egp_per_kg
            + remnant_kg
            * self.market.aluminium_price_egp_per_kg
            * Decimal("0.4")
        )
        labor_cost = labor_hours * self.market.labor_rate_egp_per_hour
        machine_cost = machine_hours * self.market.cnc_rate_egp_per_hour

        direct_costs = material_cost + labor_cost + machine_cost
        overhead = direct_costs * (self.market.overhead_percent / Decimal("100"))
        total_cost = direct_costs + overhead - remnant_credit

        quoted_price = Decimal(str(quote_data.get("total_price") or 0))
        margin_amount = quoted_price - total_cost
        margin_percent = (
            (margin_amount / quoted_price) * Decimal("100")
            if quoted_price
            else Decimal("0")
        )

        vat_amount = total_cost * (self.market.vat_percent / Decimal("100"))
        currency = quote_data.get("currency") or "EGP"

        result = {
            "currency": currency,
            "material_cost": float(material_cost),
            "remnant_savings": float(remnant_credit),
            "labor_cost": float(labor_cost),
            "machine_cost": float(machine_cost),
            "overhead": float(overhead),
            "total_cost": float(total_cost),
            "vat_amount": float(vat_amount),
            "projected_margin_amount": float(margin_amount),
            "projected_margin_percent": float(margin_percent),
        }

        logger.debug("PredictiveCostEngine result: %s", result)
        return result
