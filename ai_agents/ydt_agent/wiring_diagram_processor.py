"""
Wiring Diagram Processor for YILMAZ Machines
Extracts electrical and pneumatic components from wiring diagram PDFs
using Vision AI.

Gold Tier accuracy required - NO EXCUSES for CNC machines.
"""

import json
from pathlib import Path
from typing import List, Optional, Tuple
from dataclasses import dataclass, asdict
import logging

try:
    import google.generativeai as genai
    import pdf2image

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning(
        "Google Gemini API not available. "
        "Install: pip install google-generativeai Pillow pdf2image"
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ElectricalComponent:
    """Electrical component extracted from wiring diagram"""

    component_id: str  # e.g., "K3", "M1", "Q1"
    component_type: str  # "relay", "motor", "sensor", "switch", etc.
    description: Optional[str] = None
    voltage: Optional[str] = None
    current: Optional[str] = None
    power: Optional[str] = None
    connections: Optional[List[str]] = None  # List of connected IDs
    page_number: Optional[int] = None
    coordinates: Optional[Tuple[float, float]] = None  # (x, y) on page

    def __post_init__(self):
        if self.connections is None:
            self.connections = []


@dataclass
class PneumaticComponent:
    """Pneumatic component extracted from wiring diagram"""

    component_id: str  # e.g., "V1", "C1"
    component_type: str  # "valve", "cylinder", "regulator", etc.
    description: Optional[str] = None
    pressure: Optional[str] = None
    flow: Optional[str] = None
    connections: Optional[List[str]] = None
    page_number: Optional[int] = None

    def __post_init__(self):
        if self.connections is None:
            self.connections = []


@dataclass
class WiringConnection:
    """Connection between components"""

    from_component: str
    to_component: str
    wire_type: Optional[str] = None  # "power", "signal", "ground", "pneumatic"
    wire_color: Optional[str] = None
    wire_number: Optional[str] = None
    voltage: Optional[str] = None
    page_number: Optional[int] = None


@dataclass
class WiringDiagramAnalysis:
    """Complete analysis of a wiring diagram"""

    machine_id: str
    diagram_filename: str
    total_pages: int
    electrical_components: List[ElectricalComponent]
    pneumatic_components: List[PneumaticComponent]
    connections: List[WiringConnection]
    extraction_confidence: float
    processing_errors: Optional[List[str]] = None

    def __post_init__(self):
        if self.processing_errors is None:
            self.processing_errors = []


class WiringDiagramProcessor:
    """Process wiring diagrams with Vision AI for component extraction"""

    def __init__(self, raw_manuals_path: Path, api_key: Optional[str] = None):
        self.raw_manuals_path = Path(raw_manuals_path)
        self.api_key = api_key

        if GEMINI_AVAILABLE and api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-pro-vision")
        else:
            self.model = None
            logger.warning(
                "Gemini Vision API not configured. "
                "Diagram processing will be limited."
            )

    def process_diagram(
        self, machine_id: str, diagram_filename: str
    ) -> WiringDiagramAnalysis:
        """
        Process wiring diagram PDF and extract components.

        Args:
            machine_id: Machine ID (e.g., "aim-7510")
            diagram_filename: Name of wiring diagram PDF file

        Returns:
            WiringDiagramAnalysis with extracted components
        """
        logger.info(
            f"[WIRING DIAGRAM] Processing {diagram_filename} " f"for {machine_id}"
        )

        diagram_path = self.raw_manuals_path / "wiring_diagrams" / diagram_filename

        if not diagram_path.exists():
            raise FileNotFoundError(f"Wiring diagram {diagram_filename} not found")

        # Convert PDF to images
        try:
            images = pdf2image.convert_from_path(str(diagram_path))
            total_pages = len(images)
            logger.info(f"[WIRING DIAGRAM] Converted {total_pages} pages to images")
        except Exception as e:
            logger.error(f"[WIRING DIAGRAM] Failed to convert PDF: {e}")
            return WiringDiagramAnalysis(
                machine_id=machine_id,
                diagram_filename=diagram_filename,
                total_pages=0,
                electrical_components=[],
                pneumatic_components=[],
                connections=[],
                extraction_confidence=0.0,
                processing_errors=[f"PDF conversion failed: {e}"],
            )

        electrical_components = []
        pneumatic_components = []
        connections = []
        errors = []

        # Process each page
        for page_num, image in enumerate(images, 1):
            logger.info(f"[WIRING DIAGRAM] Processing page {page_num}/{total_pages}")

            if self.model:
                # Use Vision AI to extract components
                (page_components, page_connections, page_errors) = (
                    self._extract_from_image(image, page_num, machine_id)
                )
                electrical_components.extend(
                    [c for c in page_components if isinstance(c, ElectricalComponent)]
                )
                pneumatic_components.extend(
                    [c for c in page_components if isinstance(c, PneumaticComponent)]
                )
                connections.extend(page_connections)
                errors.extend(page_errors)
            else:
                # Fallback: OCR-based extraction
                logger.warning(
                    f"[WIRING DIAGRAM] Vision AI not available, "
                    f"using OCR fallback for page {page_num}"
                )
                (page_components, page_connections, page_errors) = (
                    self._extract_with_ocr(image, page_num)
                )
                electrical_components.extend(
                    [c for c in page_components if isinstance(c, ElectricalComponent)]
                )
                pneumatic_components.extend(
                    [c for c in page_components if isinstance(c, PneumaticComponent)]
                )
                connections.extend(page_connections)
                errors.extend(page_errors)

        # Calculate confidence based on extraction quality
        confidence = self._calculate_confidence(
            len(electrical_components),
            len(pneumatic_components),
            len(connections),
            total_pages,
            errors,
        )

        analysis = WiringDiagramAnalysis(
            machine_id=machine_id,
            diagram_filename=diagram_filename,
            total_pages=total_pages,
            electrical_components=electrical_components,
            pneumatic_components=pneumatic_components,
            connections=connections,
            extraction_confidence=confidence,
            processing_errors=errors,
        )

        logger.info(
            f"[WIRING DIAGRAM] Extraction complete: "
            f"{len(electrical_components)} electrical, "
            f"{len(pneumatic_components)} pneumatic, "
            f"{len(connections)} connections, "
            f"confidence: {confidence:.1%}"
        )

        return analysis

    def _extract_from_image(
        self, image, page_num: int, machine_id: str
    ) -> Tuple[List, List, List]:
        """Extract components using Vision AI"""
        if not self.model:
            return [], [], ["Vision AI model not available"]

        try:
            prompt = f"""
Analyze this wiring diagram page for YILMAZ {machine_id.upper()} machine.

Extract ALL electrical and pneumatic components with:
1. Component ID (e.g., K3, M1, Q1, V1, C1)
2. Component type (relay, motor, sensor, valve, cylinder, etc.)
3. Specifications (voltage, current, power, pressure, flow)
4. Connections to other components
5. Wire numbers and colors

Return as structured JSON with:
- electrical_components: [{{"id": "K3", "type": "relay",
  "voltage": "24V", "connections": ["M1", "Q1"]}}]
- pneumatic_components: [{{"id": "V1", "type": "valve",
  "pressure": "6 bar", "connections": ["C1"]}}]
- connections: [{{"from": "K3", "to": "M1", "wire_type": "power",
  "wire_number": "1"}}]

Be precise - this is for CNC machine diagnostics.
"""

            # Parse JSON response
            # This is a simplified version - full implementation would
            # parse the response
            _ = self.model.generate_content([prompt, image])
            return [], [], []

        except Exception as e:
            logger.error(f"[WIRING DIAGRAM] Vision AI extraction failed: {e}")
            return [], [], [f"Vision AI error: {e}"]

    def _extract_with_ocr(self, image, page_num: int) -> Tuple[List, List, List]:
        """Fallback OCR-based extraction"""
        # This would use OCR to extract text and then pattern matching
        # For now, return empty
        return [], [], ["OCR extraction not yet implemented"]

    def _calculate_confidence(
        self,
        elec_count: int,
        pneu_count: int,
        conn_count: int,
        total_pages: int,
        errors: List,
    ) -> float:
        """Calculate extraction confidence score"""
        if total_pages == 0:
            return 0.0

        # Base confidence on component extraction
        expected_components_per_page = 10  # Typical for wiring diagrams
        expected_components = expected_components_per_page * total_pages

        total_components = elec_count + pneu_count
        component_ratio = (
            min(total_components / expected_components, 1.0)
            if expected_components > 0
            else 0.0
        )

        # Connection ratio (typically 2-3 connections per component)
        expected_connections = total_components * 2.5
        connection_ratio = (
            min(conn_count / expected_connections, 1.0)
            if expected_connections > 0
            else 0.0
        )

        # Error penalty
        error_penalty = min(len(errors) * 0.1, 0.5)

        confidence = (component_ratio * 0.6 + connection_ratio * 0.4) * (
            1.0 - error_penalty
        )

        return max(0.0, min(1.0, confidence))


def main():
    """Process AIM 7510 wiring diagram"""
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")

    processor = WiringDiagramProcessor(
        raw_manuals_path=Path(__file__).parent / "knowledge" / "raw_manuals",
        api_key=api_key,
    )

    analysis = processor.process_diagram(
        machine_id="aim-7510", diagram_filename="1-AIM 7410-7510 3P-v8.pdf"
    )

    # Save results
    output_file = (
        Path(__file__).parent
        / "knowledge"
        / "processed"
        / "aim-7510"
        / "wiring_diagram_analysis.json"
    )
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(asdict(analysis), f, indent=2, ensure_ascii=False)

    print("\n[WIRING DIAGRAM PROCESSING COMPLETE]")
    print(f"Machine: {analysis.machine_id}")
    print(f"Diagram: {analysis.diagram_filename}")
    print(f"Pages: {analysis.total_pages}")
    print(f"Electrical Components: {len(analysis.electrical_components)}")
    print(f"Pneumatic Components: {len(analysis.pneumatic_components)}")
    print(f"Connections: {len(analysis.connections)}")
    print(f"Confidence: {analysis.extraction_confidence:.1%}")
    if analysis.processing_errors:
        print(f"Errors: {len(analysis.processing_errors)}")
        for error in analysis.processing_errors[:5]:
            print(f"  - {error}")


if __name__ == "__main__":
    main()
