"""
Vision AI Wiring Diagram Processor
Uses Google Gemini Pro Vision to extract components from actual wiring diagram PDFs.

This is the REAL Gold Tier extraction - processing the actual PDF file.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import logging

try:
    import google.generativeai as genai
    from PIL import Image
    import pdf2image
    VISION_AI_AVAILABLE = True
except ImportError:
    VISION_AI_AVAILABLE = False
    logging.warning("Vision AI dependencies not available")

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class ExtractedComponent:
    """Component extracted from Vision AI analysis"""
    component_id: str
    component_type: str
    category: str  # "electrical" or "pneumatic"
    description: str
    specifications: Dict[str, Any]
    connections: List[str]
    page_number: int
    confidence: float
    coordinates: Optional[Tuple[int, int]] = None  # (x, y) on page


@dataclass
class VisionExtractionResult:
    """Complete Vision AI extraction result"""
    machine_id: str
    diagram_filename: str
    total_pages: int
    components: List[ExtractedComponent]
    connections: List[Dict[str, Any]]
    extraction_confidence: float
    processing_notes: List[str]
    api_used: bool


class VisionAIWiringProcessor:
    """Process wiring diagrams with Google Gemini Pro Vision"""
    
    def __init__(self, raw_manuals_path: Path, api_key: Optional[str] = None):
        self.raw_manuals_path = Path(raw_manuals_path)
        self.api_key = api_key or os.getenv("GOOGLE_GEMINI_API_KEY")
        self.model = None
        self.api_configured = False
        
        if VISION_AI_AVAILABLE and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                # Use gemini-2.5-flash (supports vision, faster and cheaper)
                # Alternative: gemini-2.5-pro (more accurate but slower)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                self.api_configured = True
                logger.info("[VISION AI] Gemini 2.5 Flash configured successfully")
            except Exception as e:
                logger.error(f"[VISION AI] Failed to configure: {e}")
                self.api_configured = False
        else:
            logger.warning("[VISION AI] API key not configured. Will show demo mode.")
    
    def process_diagram(self, machine_id: str, diagram_filename: str) -> VisionExtractionResult:
        """
        Process wiring diagram PDF with Vision AI.
        
        This is the REAL extraction from the actual PDF file.
        """
        logger.info(f"[VISION AI] Processing wiring diagram: {diagram_filename}")
        logger.info(f"[VISION AI] Machine: {machine_id}")
        
        diagram_path = self.raw_manuals_path / "wiring_diagrams" / diagram_filename
        
        if not diagram_path.exists():
            raise FileNotFoundError(f"Wiring diagram not found: {diagram_path}")
        
        if not self.api_configured:
            logger.warning("[VISION AI] API not configured - running in demo mode")
            return self._demo_extraction(machine_id, diagram_filename)
        
        # Convert PDF to images
        try:
            logger.info("[VISION AI] Converting PDF to images...")
            images = pdf2image.convert_from_path(str(diagram_path), dpi=300)
            total_pages = len(images)
            logger.info(f"[VISION AI] Converted {total_pages} pages to images (300 DPI)")
        except Exception as e:
            logger.error(f"[VISION AI] PDF conversion failed: {e}")
            return VisionExtractionResult(
                machine_id=machine_id,
                diagram_filename=diagram_filename,
                total_pages=0,
                components=[],
                connections=[],
                extraction_confidence=0.0,
                processing_notes=[f"PDF conversion failed: {e}"],
                api_used=False
            )
        
        # Process each page with Vision AI
        all_components = []
        all_connections = []
        processing_notes = []
        
        for page_num, image in enumerate(images, 1):
            logger.info(f"[VISION AI] Processing page {page_num}/{total_pages} with Gemini Pro Vision...")
            
            try:
                page_components, page_connections, page_notes = self._extract_from_image(
                    image, page_num, machine_id
                )
                all_components.extend(page_components)
                all_connections.extend(page_connections)
                processing_notes.extend(page_notes)
                
                logger.info(f"[VISION AI] Page {page_num}: Extracted {len(page_components)} components, "
                           f"{len(page_connections)} connections")
            except Exception as e:
                error_msg = f"Page {page_num} processing failed: {e}"
                logger.error(f"[VISION AI] {error_msg}")
                processing_notes.append(error_msg)
        
        # Calculate overall confidence
        confidence = self._calculate_confidence(
            len(all_components),
            len(all_connections),
            total_pages,
            processing_notes
        )
        
        result = VisionExtractionResult(
            machine_id=machine_id,
            diagram_filename=diagram_filename,
            total_pages=total_pages,
            components=all_components,
            connections=all_connections,
            extraction_confidence=confidence,
            processing_notes=processing_notes,
            api_used=True
        )
        
        logger.info(f"[VISION AI] Extraction complete: {len(all_components)} components, "
                   f"{len(all_connections)} connections, confidence: {confidence:.1%}")
        
        return result
    
    def _extract_from_image(self, image, page_num: int, machine_id: str) -> Tuple[List, List, List]:
        """Extract components from a single page using Vision AI"""
        prompt = f"""
You are analyzing a wiring diagram for YILMAZ {machine_id.upper()} CNC machine.

Extract ALL electrical and pneumatic components with maximum precision:

1. COMPONENT IDENTIFICATION:
   - Find ALL component labels (K1, K2, K3... for relays, M1, M2... for motors, V1, V2... for valves, C1, C2... for cylinders)
   - Identify component types (relay, motor, contactor, sensor, valve, cylinder, fuse, transformer, etc.)

2. SPECIFICATIONS:
   - Voltage ratings (24V, 400V, etc.)
   - Current ratings (A)
   - Power ratings (kW)
   - Pressure ratings (bar) for pneumatic components

3. CONNECTIONS:
   - Wire numbers connecting components
   - Wire colors if visible
   - Connection types (power, signal, pneumatic)

4. LOCATION:
   - Approximate coordinates on page (if possible)
   - Which section of diagram (control panel, motor section, pneumatic section)

Return as structured JSON:
{{
  "components": [
    {{
      "id": "K3",
      "type": "relay",
      "category": "electrical",
      "description": "X-axis control relay",
      "specifications": {{"voltage": "24V DC", "current": "10A"}},
      "connections": ["M2", "Q1"],
      "coordinates": [150, 200]
    }}
  ],
  "connections": [
    {{
      "from": "K3",
      "to": "M2",
      "wire_type": "power",
      "wire_number": "13",
      "wire_color": "red"
    }}
  ]
}}

Be extremely thorough - extract EVERY component you can see. This is for CNC machine diagnostics.
"""
        
        try:
            response = self.model.generate_content([prompt, image])
            
            # Parse JSON from response
            response_text = response.text
            
            # Extract JSON from response (may have markdown formatting)
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                json_str = json_match.group(0)
                data = json.loads(json_str)
            else:
                # Try to parse as-is
                data = json.loads(response_text)
            
            components = []
            connections = []
            notes = []
            
            # Process components
            for comp_data in data.get('components', []):
                component = ExtractedComponent(
                    component_id=comp_data.get('id', ''),
                    component_type=comp_data.get('type', 'unknown'),
                    category=comp_data.get('category', 'electrical'),
                    description=comp_data.get('description', ''),
                    specifications=comp_data.get('specifications', {}),
                    connections=comp_data.get('connections', []),
                    page_number=page_num,
                    confidence=0.85,  # Default confidence for Vision AI
                    coordinates=tuple(comp_data.get('coordinates', [0, 0])) if comp_data.get('coordinates') else None
                )
                components.append(component)
            
            # Process connections
            for conn_data in data.get('connections', []):
                connections.append({
                    'from': conn_data.get('from', ''),
                    'to': conn_data.get('to', ''),
                    'wire_type': conn_data.get('wire_type', 'unknown'),
                    'wire_number': conn_data.get('wire_number'),
                    'wire_color': conn_data.get('wire_color'),
                    'page_number': page_num
                })
            
            notes.append(f"Page {page_num}: Vision AI extraction successful")
            
            return components, connections, notes
            
        except json.JSONDecodeError as e:
            logger.error(f"[VISION AI] JSON parsing failed: {e}")
            logger.debug(f"[VISION AI] Response text: {response_text[:500]}")
            return [], [], [f"Page {page_num}: JSON parsing failed - {e}"]
        except Exception as e:
            logger.error(f"[VISION AI] Vision AI extraction failed: {e}")
            return [], [], [f"Page {page_num}: Extraction failed - {e}"]
    
    def _demo_extraction(self, machine_id: str, diagram_filename: str) -> VisionExtractionResult:
        """Demo mode when API not configured"""
        logger.info("[VISION AI] Running in DEMO MODE (API not configured)")
        logger.info("[VISION AI] To enable real extraction, set GOOGLE_GEMINI_API_KEY environment variable")
        
        return VisionExtractionResult(
            machine_id=machine_id,
            diagram_filename=diagram_filename,
            total_pages=1,
            components=[],
            connections=[],
            extraction_confidence=0.0,
            processing_notes=[
                "DEMO MODE: API key not configured",
                "To enable Vision AI extraction:",
                "1. Get Google Gemini API key from https://makersuite.google.com/app/apikey",
                "2. Set environment variable: export GOOGLE_GEMINI_API_KEY=your_key",
                "3. Or create .env file: GOOGLE_GEMINI_API_KEY=your_key",
                "4. Re-run this script"
            ],
            api_used=False
        )
    
    def _calculate_confidence(self, component_count: int, connection_count: int, 
                             total_pages: int, notes: List[str]) -> float:
        """Calculate extraction confidence"""
        if total_pages == 0:
            return 0.0
        
        # Expected components per page (typical wiring diagram)
        expected_per_page = 15
        expected_total = expected_per_page * total_pages
        
        component_ratio = min(component_count / expected_total, 1.0) if expected_total > 0 else 0.0
        connection_ratio = min(connection_count / (component_count * 1.5), 1.0) if component_count > 0 else 0.0
        
        # Error penalty
        error_count = len([n for n in notes if 'failed' in n.lower() or 'error' in n.lower()])
        error_penalty = min(error_count * 0.1, 0.3)
        
        confidence = (component_ratio * 0.5 + connection_ratio * 0.5) * (1.0 - error_penalty)
        
        return max(0.0, min(1.0, confidence))


def main():
    """Process AIM 7510 wiring diagram with Vision AI"""
    print("\n" + "="*70)
    print("VISION AI WIRING DIAGRAM PROCESSOR - REAL EXTRACTION")
    print("="*70 + "\n")
    
    # Check for API key
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        print("[INFO] GOOGLE_GEMINI_API_KEY not found in environment")
        print("[INFO] Checking for .env file...")
        
        env_file = Path(__file__).parent / ".env"
        if env_file.exists():
            from dotenv import load_dotenv
            load_dotenv(env_file)
            api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    
    processor = VisionAIWiringProcessor(
        raw_manuals_path=Path(__file__).parent / "knowledge" / "raw_manuals",
        api_key=api_key
    )
    
    if not processor.api_configured:
        print("\n[WARNING] Vision AI API not configured!")
        print("\nTo enable REAL extraction:")
        print("1. Get API key: https://makersuite.google.com/app/apikey")
        print("2. Create .env file in ai_agents/ydt_agent/ with:")
        print("   GOOGLE_GEMINI_API_KEY=your_key_here")
        print("3. Re-run this script")
        print("\nRunning in DEMO MODE...\n")
    
    result = processor.process_diagram(
        machine_id="aim-7510",
        diagram_filename="1-AIM 7410-7510 3P-v8.pdf"
    )
    
    # Save results
    output_file = Path(__file__).parent / "knowledge" / "processed" / "aim-7510" / "vision_ai_extraction.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(asdict(result), f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n" + "="*70)
    print("VISION AI EXTRACTION RESULTS")
    print("="*70)
    print(f"\nMachine: {result.machine_id}")
    print(f"Diagram: {result.diagram_filename}")
    print(f"Pages Processed: {result.total_pages}")
    print(f"Components Extracted: {len(result.components)}")
    print(f"Connections Extracted: {len(result.connections)}")
    print(f"Confidence: {result.extraction_confidence:.1%}")
    print(f"API Used: {result.api_used}")
    
    if result.components:
        print(f"\nSample Components:")
        for comp in result.components[:10]:
            print(f"  {comp.component_id}: {comp.description} ({comp.component_type})")
    
    if result.connections:
        print(f"\nSample Connections:")
        for conn in result.connections[:10]:
            print(f"  {conn.get('from')} -> {conn.get('to')} ({conn.get('wire_type')})")
    
    if result.processing_notes:
        print(f"\nProcessing Notes:")
        for note in result.processing_notes[:5]:
            print(f"  - {note}")
    
    print(f"\nResults saved to: {output_file}")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()

