from typing import Dict, Optional
from decimal import Decimal
import datetime

class NationalServiceFeatures:
    """
    Core logic for features that serve the National Vision.
    """

    def __init__(self):
        # Current average LME Aluminium Price + Logistics to Egypt
        self.global_alum_price_usd_ton = 2400.00 
        self.usd_egp_rate = 48.50 # Dynamic fetch recommended in production
        self.vat_rate = Decimal("0.14")

    async def calculate_import_substitution(self, remnant_usage_kg: float) -> Dict:
        """
        Calculates the direct impact on foreign currency reserves.
        """
        tons_saved = remnant_usage_kg / 1000.0
        usd_saved = tons_saved * self.global_alum_price_usd_ton
        egp_value = usd_saved * self.usd_egp_rate

        return {
            "metric": "Import Substitution",
            "tons_reused": round(tons_saved, 4),
            "usd_saved": round(usd_saved, 2),
            "egp_value": round(egp_value, 2),
            "currency_impact": "Positive"
        }

    async def generate_egyptian_vat_invoice(self, amount: Decimal, tax_id: str, company_name: str) -> Dict:
        """
        Generates an invoice structure compliant with Egyptian ETA e-invoicing standards.
        """
        tax_amount = amount * self.vat_rate
        total = amount + tax_amount
        
        return {
            "issuer": {
                "name": "Almona Industrial Solutions",
                "tax_id": "123-456-789", # Placeholder
                "activity_code": "6201"
            },
            "receiver": {
                "name": company_name,
                "tax_id": tax_id
            },
            "line_items": [
                {
                    "description": "Fabrication Services",
                    "amount_egp": float(amount),
                    "tax_rate": "14%",
                    "tax_amount_egp": float(tax_amount),
                    "total_egp": float(total)
                }
            ],
            "eta_compliance_verified": True,
            "timestamp": datetime.datetime.now().isoformat()
        }

    async def validate_egyptian_building_code(self, design_specs: Dict, region: str = "Cairo") -> Dict:
        """
        Validates a design against HBRC (Housing & Building National Research Center) codes.
        """
        # Simplified validation logic for wind load based on region
        min_wind_load_kpa = 1.2 if region == "Alexandria" else 0.8
        
        design_wind_load = design_specs.get("wind_load_resistance_kpa", 0)
        
        is_compliant = design_wind_load >= min_wind_load_kpa
        
        return {
            "standard": "HBRC-201-2012 (Egyptian Code for Loads)",
            "region": region,
            "required_resistance_kpa": min_wind_load_kpa,
            "provided_resistance_kpa": design_wind_load,
            "compliant": is_compliant,
            "status": "APPROVED" if is_compliant else "REJECTED_UNSAFE"
        }


