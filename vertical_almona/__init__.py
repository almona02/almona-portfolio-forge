"""
Almona Vertical Plugin - Entry point.

Exports rule classes for registration in VerticalRegistry.
"""

from .rules.almona_calibration_rule import AlmonaCalibrationRule
from .rules.almona_anomaly_rule import AlmonaAnomalyRule
from .rules.almona_freeze_rule import AlmonaFreezeRule

# Export all rule classes for registration
__all__ = [
    "AlmonaCalibrationRule",
    "AlmonaAnomalyRule",
    "AlmonaFreezeRule",
]

# Plugin metadata (also in manifest.json)
__version__ = "1.0.0"
__author__ = "Almona Industrial Solutions"
__description__ = (
    "Aluminium/UPVC fabrication vertical with AI calibration learning"
)

