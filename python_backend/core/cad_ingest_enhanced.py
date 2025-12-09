"""
Enhanced CAD Ingestor with Assembly Intelligence

Extends base CAD ingestor with Egyptian manufacturing intelligence,
hardware placement, and assembly sequence generation.
"""

from typing import Dict, Any
import logging
from core.cad_ingest import CadProfileIngestor
from core.assembly.intelligence import AssemblyIntelligenceEngine

logger = logging.getLogger(__name__)


class EnhancedCadIngestor(CadProfileIngestor):
    """Extends base CAD ingestor with assembly intelligence"""

    def process_dxf_with_assembly(self, file_bytes: bytes) -> Dict[str, Any]:
        """Process DXF and generate assembly intelligence"""
        # 1. Get basic CAD metrics (existing functionality)
        cad_result = super().process_dxf(file_bytes)

        if cad_result["status"] != "success":
            return cad_result

        # 2. Add assembly intelligence
        assembly_engine = AssemblyIntelligenceEngine(cad_result["profile_metrics"])

        assembly_data = {
            "window_system": assembly_engine.analyze_for_window_system(),
            "hardware_points": assembly_engine.identify_hardware_points(),
            "assembly_sequence": assembly_engine.generate_assembly_sequence(),
            "egyptian_compliance": assembly_engine.get_egyptian_compliance(),
            "magnetic_assembly_ready": assembly_engine.check_magnetic_compatibility()
        }

        # 3. Merge results
        cad_result["assembly_intelligence"] = assembly_data

        # 4. Add to Window3D generator format
        cad_result["window3d_ready"] = self._prepare_for_window3d(cad_result, assembly_data)

        logger.info(f"Enhanced CAD processing complete for {assembly_data['window_system']}")
        return cad_result

    def _prepare_for_window3d(self, cad_result: Dict[str, Any], assembly_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format data for Window3DGenerator integration"""
        return {
            "geometry": {
                "points": self._extract_polyline_points(cad_result),
                "hardware": assembly_data["hardware_points"],
                "glass_channel": self._calculate_glass_channel(cad_result)
            },
            "materials": {
                "profile": "aluminium",
                "finish": "anodized_silver",  # Common Egyptian finish
                "glass_type": "double_glazed",  # Egyptian energy standard
                "hardware_color": "silver"
            }
        }

    def _extract_polyline_points(self, cad_result: Dict[str, Any]) -> list:
        """Extract polyline points for 3D visualization"""
        # Placeholder for actual polyline extraction logic
        # This would extract the actual geometric points from the CAD result
        bbox = cad_result["profile_metrics"]["bounding_box"]
        return [
            [bbox[0], bbox[1]],  # Bottom-left
            [bbox[2], bbox[1]],  # Bottom-right
            [bbox[2], bbox[3]],  # Top-right
            [bbox[0], bbox[3]],  # Top-left
            [bbox[0], bbox[1]]   # Close the loop
        ]

    def _calculate_glass_channel(self, cad_result: Dict[str, Any]) -> Dict[str, float]:
        """Calculate glass channel dimensions based on profile"""
        bbox = cad_result["profile_metrics"]["bounding_box"]
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]

        # Standard Egyptian glass channel dimensions
        return {
            "width": max(6.0, width * 0.1),  # 10% of profile width, min 6mm
            "depth": 15.0,  # Standard Egyptian depth
            "offset": 8.0   # Standard offset from edge
        }